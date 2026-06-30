# Clôture de la phase B — préparation locale à la synchronisation

- **Branche :** `feature/sync-data-readiness`
- **Snapshot audité :** `33eb416`
- **Date :** 29 juin 2026
- **Dexie :** v8
- **Backup JSON :** v7
- **Conclusion :** prêt pour un prototype isolé sur `weights`, pas pour une généralisation

## 1. Livraisons intégrées

| Lot | Commit | Résultat |
|---|---|---|
| Identifiants déterministes | `2843ca0` | Réduction des collisions entre appareils |
| Mises à jour partielles | `20d5c4e` | Limitation des écrasements par remplacement complet |
| Objectifs et planning | `91ea41e` | Migration vers Dexie v5 |
| Récompenses et rappels | `3cf61b0` | Migration vers Dexie v6 |
| Backup des états utilisateur | `b488555` | Passage au format JSON v5 |
| Persistance des récompenses | `bfc00eb` | Écritures sorties du contexte `liveQuery` |
| Paramètres utilisateur/appareil | `9e5a2d8` | Dexie v7 et backup JSON v6 |
| Suppressions synchronisables | `33eb416` | Dexie v8 et backup JSON v7 |

## 2. Invariants validés

- mode local sans compte conservé ;
- aucune dépendance cloud installée ;
- nom de base locale conservé ;
- chaîne Dexie v1 → v8 enregistrée dans l’ordre ;
- données utilisateur migrées hors du stockage navigateur principal ;
- paramètres d’appareil exclus des backups ;
- snapshots de corbeille exclus des backups ;
- intention de suppression conservée dans `deletionRecords` ;
- anciens backups toujours importables ;
- export JSON indépendant d’un futur fournisseur.

## 3. Frontière actuelle

### Synchronisable

- 30 tables utilisateur déclarées dans `databaseTableNames` ;
- `userSettings` ;
- états utilisateur normalisés ;
- `deletionRecords`.

### Local uniquement

- `deviceSettings` ;
- `migrationJournal` ;
- `databaseDiagnostics` ;
- `trashItems` ;
- caches et états UI.

## 4. Contrôles réalisés avant clôture

L’utilisateur a confirmé sur le snapshot B1.4b :

- tests ciblés réussis ;
- `npm run lint` réussi ;
- `npm run build` réussi ;
- `npm test -- --run` réussi ;
- `npm run test:stability` réussi ;
- `npm run test:e2e` réussi ;
- working tree propre après le commit `33eb416`.

B1.4c ajoute uniquement de la documentation et des garde-fous de cohérence. Les contrôles doivent être relancés après application.

## 5. Autorisation limitée pour la phase C

La phase C peut démarrer uniquement avec :

- une branche expérimentale dédiée ;
- un environnement distant de test ;
- une base IndexedDB expérimentale distincte de la base réelle ;
- la table `weights` seulement ;
- des données fictives ;
- deux comptes de test pour l’isolation ;
- téléphone et ordinateur ;
- tests hors ligne, conflit, suppression, restauration et déconnexion ;
- procédure de désactivation complète avant le premier branchement.

Aucune autre table ne doit être synchronisée pendant le prototype initial.

## 6. Points non bloquants pour le prototype, bloquants pour la phase D

- séparation du cache Open Food Facts dans `foodProducts` ;
- séparation du catalogue d’exercices fourni ;
- verrou des séances `inProgress` ;
- séparation des suggestions calculées et des décisions ;
- import JSON contrôlé avec sync active ;
- écran de compte, état de synchronisation et reprise sur erreur ;
- validation juridique, région d’hébergement, tarification et suppression de compte.

## 7. Go / No-Go

### Go phase C

Le prototype des pesées est autorisé lorsque :

- [ ] les conditions actuelles du fournisseur sont revérifiées ;
- [ ] les secrets locaux sont exclus de Git ;
- [ ] le rollback est écrit ;
- [ ] le projet distant ne contient aucune donnée réelle ;
- [ ] la stratégie de changement de compte est choisie pour le prototype.

### No-Go généralisation

La synchronisation générale reste interdite tant que les points de la section 6 ne sont pas traités domaine par domaine.

## 8. Suivi C0

La phase expérimentale a été ouverte depuis le merge `f783f91` sur `experiment/dexie-cloud-weight-sync`.

C0 prépare uniquement :

- la dépendance Dexie Cloud verrouillée ;
- une base IndexedDB distincte limitée à `weights` et `deletionRecords` ;
- une activation par variables locales, désactivée par défaut ;
- la protection des fichiers CLI et de la CSP ;
- une procédure de rollback avant création distante.

Voir [dexie-cloud-prototype-c0.md](./dexie-cloud-prototype-c0.md).
