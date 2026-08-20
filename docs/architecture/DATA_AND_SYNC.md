# Données, espaces et synchronisation

Statut : **actuel**. Ce document résume les contrats ; les documents versionnés
de `docs/architecture` conservent l’historique détaillé.

## Stockages

| Stockage | Version actuelle | Rôle |
| --- | ---: | --- |
| `AppDatabase` Dexie | 12 | données utilisateur principales et photos privées locales |
| Sauvegarde JSON | 10 | export/import contrôlé des données structurées, hors images |
| Archive photos | 1 | export/restauration séparés des images de progression |
| Runtime Dexie Cloud | 16 | agrégats synchronisables et baselines logiques |
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

Les lignes Goals sont maintenant écrites par `Table.upsert(id, changes)` : le
journal conserve un `changeSpecs` déclaratif pour l'arbitrage par propriété et
une valeur complète de repli si l'ID privé `#` n'existe pas encore au serveur.
Un marqueur d'état `restored`/`deleted`, écrit dans la même transaction cloud
locale, arbitre aussi update, suppression et restauration sans comparer les
horloges murales `updatedAt` des appareils. Les champs `owner`, `realmId` et
`$ts` gérés par Dexie Cloud ne sont jamais inclus dans les changements métier.

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
