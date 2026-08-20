# Données, espaces et synchronisation

Statut : **actuel**. Ce document résume les contrats ; les documents versionnés
de `docs/architecture` conservent l’historique détaillé.

## Stockages

| Stockage | Version actuelle | Rôle |
| --- | ---: | --- |
| `AppDatabase` Dexie | 12 | données utilisateur principales et photos privées locales |
| Sauvegarde JSON | 10 | export/import contrôlé des données structurées, hors images |
| Archive photos | 1 | export/restauration séparés des images de progression |
| Runtime Dexie Cloud | 17 | agrégats synchronisables, journal Goals et baselines logiques |
| D1 social | migrations `0000` à `0003` présentes | identité, relations, permissions, snapshots et limites photo nutritionnelle |

La source de la version Dexie principale est
`src/infrastructure/database/migrations/versions.ts`. Les versions 1 à 12 sont
enregistrées dans `AppDatabase.ts`. Une constante ou migration publiée est
immuable.

La version 12 ajoute deux tables internes :

- `progressPhotos` pour les métadonnées, la date, la vue et les liens d’assets ;
- `progressPhotoAssets` pour l’original compressé et la miniature.

Les deux assets et leurs métadonnées sont créés ou supprimés dans une même
transaction. Un nettoyage local supprime les assets orphelins et les photos
incomplètes.

## Espaces de données

- **Invité** : espace local isolé, sans compte cloud.
- **Profil local** : données de l’appareil dans la base principale.
- **Compte cloud** : espace sélectionné explicitement, avec restauration ou
  import contrôlé.

`src/app/data-spaces` applique les gardes d’accès.
`src/infrastructure/data-spaces` porte l’import invité, la restauration cloud
et la coordination des espaces. Un changement de compte doit masquer l’ancien
espace avant tout chargement du nouveau.

Les photos de progression vivent dans la base Dexie de l’espace actuellement
ouvert. Elles ne sont pas copiées par l’import invité générique : un transfert
vers un autre espace exige une archive photo explicite choisie par l’utilisateur.

## Synchronisation

La synchronisation est désactivée par défaut dans `.env.example`. Chaque
domaine réel possède un flag explicite : poids, activités, objectifs,
musculation, journal et bibliothèque nutritionnels, suivi nutritionnel,
préférences du compte, récompenses/routines et cloud social.

Le runtime :

1. prépare un agrégat déterministe ;
2. compare la baseline logique ;
3. propage créations, mises à jour et tombstones ;
4. converge sans ressusciter les suppressions ;
5. conserve l’isolation de compte ;
6. expose un état compréhensible dans le centre de synchronisation.

Les suppressions synchronisées passent par des `DeletionRecord`. Les séances,
modèles et exercices de musculation sont synchronisés comme agrégats afin
d’éviter les états partiels.

Pour Goals, chaque mutation AppDB persistée est aussi inscrite immédiatement
comme opération dans le replica Dexie Cloud local du compte actif, y compris
hors ligne. Cette étape cible uniquement les objectifs réellement mutés et ne
déclenche aucun transport ; `disableEagerSync: true` reste le garde-fou. Le
cycle automatique explicite transporte ensuite ces opérations et réhydrate
AppDB depuis le gagnant du replica après l’arbitrage natif Dexie Cloud.

Les tables et modèles de photos de progression sont exclus des adaptateurs de
synchronisation, des Pages Functions et de Dexie Cloud. Un test de contrat
échoue si une référence à ces tables apparaît dans ces frontières.

### Arbitrage des mutations Goals

Le runtime v17 ajoute `realGoalMutations`, un journal synchronisé append-only :
chaque création, mise à jour, suppression ou restauration d’un Goal reçoit un
identifiant privé unique. Deux appareils n’écrivent donc plus la même ligne au
moment du conflit et aucune mutation ne peut être détruite avant le resolver.
Les anciennes tables `realGoals` et `realGoalDeletionRecords` restent lisibles
pour amorcer et migrer les comptes existants ; dès qu’un objectif possède une
entrée de journal valide, le journal devient sa source cloud autoritative.

L’ordre est un HLC persistant par compte et appareil. Sa partie physique est
`Date.now()` corrigée avec la référence temporelle de la session authentifiée
Dexie (`accessTokenExpiration - lastLogin`), jamais l’horloge murale brute seule.
Sa partie logique progresse si la partie physique ne peut pas avancer. Les
égalités sont départagées de façon déterministe par acteur, séquence et ID de
mutation. `updatedAt`, l’ordre d’arrivée serveur, une préférence local/cloud et
`syncRevision + 1` ne déterminent pas le gagnant.

`realGoalMutationClocks` conserve localement la calibration/HLC et figure dans
`unsyncedTables`, comme `realSyncBaselines`. Le nom IndexedDB publié reste
`sportpilot-sync-runtime-0.20.0-v16` : la version de schéma 17 l’ouvre et
l’augmente en place afin de préserver les lignes et opérations v16 en attente.
La migration est additive et ne réécrit aucune version historique.

La calibration ne lit aucune table `$` ni propriété interne de l’addon. Elle
consomme `cloud.currentUser.value`, typé par le `UserLogin` exporté depuis
l’entrée publique de `dexie-cloud-addon@4.4.13`, et seulement ses champs publics
`lastLogin` et `accessTokenExpiration`. La version de l’addon reste épinglée :
toute mise à niveau doit réauditer ces types, leur comportement réel et le gate
de skew avant d’être acceptée. Après reload ou réouverture du navigateur, la
calibration et le HLC persistés permettent les mutations offline. Une session
renouvelée remplace les valeurs de calibration, sans pouvoir faire reculer le
HLC ni `actorSequence`. Sans session valide ni calibration persistée, le
staging échoue avant toute écriture du journal : la mutation reste dans AppDB
et sera restagée après authentification.

Limites connues : l’ordre physique est précis à la granularité/à l’incertitude
documentée dans chaque mutation (actuellement 1 s) ; une modification de
l’horloge système après calibration exige une nouvelle authentification pour
recalibrer exactement le temps physique. Un recul est absorbé par la partie
logique ; une forte avance peut avancer le HLC et reste donc un risque résiduel
jusqu’à la nouvelle calibration. Le resolver ne prétend pas reconstituer un
ordre physique global parfait.

Le journal croît d’une ligne par mutation métier réellement distincte ; les
replays techniques d’un état déjà stagé restent idempotents. Aucune compaction
n’est effectuée en 1.0.4 : supprimer une entrée sans watermark connu de tous
les appareils pourrait ressusciter un état ancien ou perdre le gagnant. Le coût
est donc un stockage cloud/local croissant avec le nombre de mutations Goals.
Une future compaction devra être un lot séparé, mesuré, rétrocompatible et
prouvé sur les appareils restés offline ; aucune GC opportuniste n’est permise.

Le journal et son horloge sont des métadonnées de transport cloud, pas une
nouvelle donnée métier du format de sauvegarde AppDB v10. Une restauration
AppDB produit ensuite une mutation normale. La suppression de compte/purge
distante efface les mutations et l’horloge du compte ciblé ; logout/reset local
reste couvert par l’effacement des tables du runtime Dexie Cloud.

## Sauvegarde et restauration

- Sauvegarde globale et sélective :
  `src/infrastructure/backup` et `src/application/backup`.
- Validation des enveloppes avant écriture.
- Sauvegarde de sécurité avant restauration ou opération sensible.
- Journal de migration et diagnostic d’intégrité dans la base principale.
- Import invité explicite ; aucune fusion silencieuse entre espaces.
- Les images de progression ne sont pas ajoutées au JSON général limité à
  25 Mo.
- Une archive photo séparée, limitée à 100 Mo, contient métadonnées, originaux
  compressés et miniatures. La restauration est additive et ignore les doublons.

Ne jamais contourner les schémas de sauvegarde pour « réparer » un fichier.
Une incompatibilité doit être signalée avant toute écriture.

## D1 et Pages Functions

Le binding vérifié dans `wrangler.jsonc` est `SOCIAL_DIRECTORY_DB`. Les
fonctions sociales et de photo nutritionnelle sont dans `functions/api`.
Aucune fonction distante ne reçoit une photo de progression. Les migrations SQL
restent dans `migrations/` et leur application distante est une opération
séparée exigeant une autorisation.

## Évolution d’un contrat de données

Toute évolution doit fournir :

- nouvelle version si le schéma change ;
- migration additive et idempotente ;
- tests depuis les versions historiques pertinentes ;
- impact sauvegarde/import/restauration ;
- impact synchronisation, D1 et suppression ;
- audit de continuité et procédure de retour arrière.
