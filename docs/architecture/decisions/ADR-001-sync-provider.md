# ADR-001 — Choix du fournisseur de synchronisation

- **Statut :** accepté pour prototype, non validé pour la production
- **Date :** 29 juin 2026
- **Mise à jour d’implémentation :** phase B locale terminée au commit `33eb416`
- **Décideur :** projet SportPilot
- **Portée :** prototype isolé sur les pesées uniquement
- **Décision :** utiliser Dexie Cloud comme candidat principal

## 1. Contexte

Au moment de la décision initiale, SportPilot était une PWA React sans compte ni backend.

Ses données étaient conservées dans :

- Dexie / IndexedDB ;
- quelques états utilisateur dans `localStorage` ;
- un backup JSON v4.

La section suivante consigne l’état obtenu après la préparation locale.

Le besoin est d’ajouter une synchronisation entre plusieurs appareils tout en maintenant :

- le fonctionnement hors ligne ;
- le mode local sans compte ;
- la sauvegarde JSON ;
- la structure de repositories ;
- un risque de migration limité.

Le projet ne recherche pas encore :

- collaboration entre plusieurs utilisateurs ;
- partage avec un coach ;
- API publique ;
- logique serveur complexe ;
- analytique centralisée.

## 1.1 État après la préparation locale

La phase B a préparé SportPilot sans installer de composant cloud :

- Dexie v8 ;
- backup JSON v7 ;
- 30 tables utilisateur et 4 tables internes locales ;
- états utilisateur migrés vers Dexie ;
- `userSettings` séparé de `deviceSettings` ;
- `deletionRecords` synchronisable, `trashItems` local ;
- anciens backups toujours importables.

Cette mise à jour ne change pas la décision fournisseur. Elle autorise uniquement l’ouverture d’un prototype expérimental sur `weights`. Les conditions commerciales, techniques et d’hébergement devront être revérifiées au démarrage de la phase C.

## 2. Forces en présence

### Option A — Dexie Cloud

Service de synchronisation conçu pour Dexie.

Fonctions pertinentes :

- synchronisation offline-first ;
- authentification ;
- données privées par utilisateur ;
- contrôle d’accès ;
- opérations cohérentes ;
- mises à jour propriété par propriété ;
- intégration avec IndexedDB ;
- possibilité de conserver les requêtes locales Dexie.

### Option B — Supabase

Plateforme comprenant :

- PostgreSQL ;
- Auth ;
- Row Level Security ;
- Realtime ;
- API ;
- fonctions serveur.

Elle offre plus de contrôle, mais ne fournit pas directement la réplication de la base Dexie actuelle.

SportPilot devrait construire ou intégrer :

- file de mutations ;
- synchronisation montante ;
- synchronisation descendante ;
- curseurs ;
- tombstones ;
- reprise ;
- migrations local/distant ;
- résolution de conflits ;
- protection RLS table par table.

### Option C — Firestore

Base documentaire avec cache hors ligne sur certaines plateformes.

Son adoption remplacerait une partie importante de l’architecture Dexie et imposerait un nouveau modèle de requêtes, de coûts et de conflits.

### Option D — Backend et protocole de sync personnalisés

Contrôle maximal mais coût et risque les plus élevés.

Cette option nécessite une expertise durable sur :

- réplication ;
- causalité ;
- conflits ;
- sécurité ;
- migrations ;
- observabilité ;
- restauration.

## 3. Décision

Utiliser **Dexie Cloud pour un prototype limité à la table de pesées**.

Contraintes de la décision :

1. aucune donnée réelle pendant le prototype ;
2. mode local toujours disponible ;
3. compte facultatif ;
4. données privées uniquement ;
5. authentification email OTP pour commencer ;
6. backup JSON conservé ;
7. aucun partage entre utilisateurs ;
8. aucune généralisation avant validation ;
9. aucune donnée `localStorage` synchronisée directement ;
10. possibilité de supprimer intégralement le prototype.

## 4. Justification

### 4.1 Compatibilité

SportPilot utilise déjà Dexie 4. Le service candidat ajoute la synchronisation au même modèle local plutôt que de remplacer IndexedDB par une API distante.

### 4.2 Offline-first

Les opérations continuent à être exécutées localement et sont synchronisées ensuite.

Cela correspond au comportement actuel de l’application.

### 4.3 Réduction du code spécifique

Dexie Cloud prend en charge des responsabilités qui seraient sinon développées par SportPilot :

- synchronisation ;
- authentification ;
- isolation ;
- opérations de cohérence ;
- sessions longues ;
- transport.

### 4.4 Contrôle du risque

Le prototype sur une seule table permet de vérifier :

- compatibilité avec le schéma ;
- PWA iOS ;
- migration d’IDs ;
- login ;
- conflits ;
- suppression ;
- sortie du fournisseur.

## 5. Conséquences positives

- maintien du modèle local ;
- faible impact théorique sur les pages React ;
- authentification disponible sans backend SportPilot ;
- données privées par défaut ;
- synchronisation entre appareils d’un même utilisateur ;
- moins de code de réplication à maintenir ;
- possibilité de prototyper rapidement.

## 6. Conséquences négatives

- dépendance à un fournisseur ;
- coûts à vérifier avant production ;
- schéma soumis aux contraintes de l’addon ;
- sémantique des opérations Dexie à respecter ;
- possible migration d’IDs et d’index ;
- besoin de normaliser certaines collections ;
- comportement de déconnexion à tester ;
- conditions d’hébergement et de conformité à examiner ;
- sortie du fournisseur à maintenir via le backup JSON.

## 7. Risques

### 7.1 Verrouillage fournisseur

Mesures :

- repositories conservés ;
- backup JSON complet ;
- modèles de domaine sans types Dexie Cloud ;
- configuration cloud limitée à l’infrastructure ;
- document de désactivation ;
- test de retour en mode local.

### 7.2 Coût

Avant production :

- calculer le nombre d’utilisateurs ;
- volume d’enregistrements ;
- fréquence de synchronisation ;
- rétention ;
- coût d’authentification ;
- coût de support.

Aucun engagement de coût n’est pris dans cet ADR.

### 7.3 Confidentialité

Avant production :

- vérifier région d’hébergement ;
- conditions contractuelles ;
- suppression des comptes ;
- export ;
- sous-traitants ;
- durée de conservation ;
- politique de confidentialité.

### 7.4 Schéma existant

La phase B a traité :

- les états utilisateur hérités de `localStorage` ;
- les IDs déterministes des principales unicités ;
- la séparation `userSettings` / `deviceSettings` ;
- les suppressions durables via `deletionRecords` ;
- la compatibilité des backups.

Restent à traiter avant une généralisation :

- séparation du catalogue externe dans `foodProducts` ;
- séparation du catalogue d’exercices fourni ;
- verrou des séances en cours ;
- distinction des suggestions recalculables ;
- validation des conflits réels d’index avec l’addon.

## 8. Alternative Supabase

Supabase reste l’alternative principale si l’un des besoins suivants devient prioritaire :

- requêtes serveur complexes ;
- reporting SQL central ;
- fonctions métier côté serveur ;
- intégrations tierces ;
- contrôle direct PostgreSQL ;
- auto-hébergement ;
- architecture multi-utilisateur avec droits complexes.

Pour rester offline-first avec Supabase, SportPilot aurait alors besoin d’un moteur de réplication dédié ou d’un protocole maison. Supabase Auth, RLS et Realtime ne remplacent pas à eux seuls une synchronisation bidirectionnelle robuste d’IndexedDB.

## 9. Pourquoi Firestore n’est pas retenu

- remplacement plus important des repositories ;
- modèle de données documentaire différent ;
- nouvelle dépendance structurante ;
- stratégie de conflits moins adaptée au modèle Dexie actuel ;
- valeur ajoutée inférieure à Dexie Cloud pour ce prototype précis.

## 10. Critères de succès du prototype

Le prototype est validé uniquement si :

- [ ] création locale sans réseau ;
- [ ] synchronisation après reconnexion ;
- [ ] même compte sur téléphone et ordinateur ;
- [ ] aucun accès entre deux comptes ;
- [ ] modification de champs distincts correctement fusionnée ;
- [ ] conflit du même champ compris et documenté ;
- [ ] collision d’une pesée par date résolue ;
- [ ] suppression propagée ;
- [ ] session persistante sur PWA iOS ;
- [ ] déconnexion sans fuite de données ;
- [ ] backup JSON exportable ;
- [ ] retour complet au mode local ;
- [ ] aucune régression des tests actuels.

## 11. Critères d’abandon de Dexie Cloud

Abandonner le candidat si :

- migration des données actuelles trop destructive ;
- conflit d’unicité non maîtrisable ;
- fonctionnement iOS PWA instable ;
- données locales d’un compte visibles par un autre ;
- export ou retour local incomplet ;
- coûts incompatibles ;
- exigences de conformité non satisfaites ;
- addon imposant des changements trop profonds dans le domaine ;
- tests hors ligne non déterministes.

En cas d’abandon, réévaluer Supabase avec un moteur de sync dédié ou un backend personnalisé.

## 12. Étapes suivantes

1. clôturer et fusionner `feature/sync-data-readiness` après les contrôles B1.4c ;
2. revérifier les conditions, la tarification et l’hébergement du fournisseur ;
3. documenter le rollback et l’exclusion des secrets ;
4. créer `experiment/dexie-cloud-weight-sync` depuis `develop` propre ;
5. utiliser une base expérimentale distincte et un schéma limité à `weights` et aux marqueurs nécessaires ;
6. utiliser uniquement des données et comptes fictifs ;
7. valider téléphone, ordinateur, hors ligne, conflits et déconnexion ;
8. supprimer complètement le prototype s’il échoue à un critère de l’ADR.

## 13. Références officielles

### Dexie Cloud

- https://dexie.org/docs/cloud/index
- https://dexie.org/docs/Tutorial/Dexie-Cloud
- https://dexie.org/docs/cloud/access-control
- https://dexie.org/docs/cloud/authentication
- https://dexie.org/docs/cloud/consistency
- https://dexie.org/pricing

### Supabase

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/api/securing-your-api
