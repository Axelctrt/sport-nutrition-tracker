# SportPilot 0.26.0 — amis, demandes et confidentialité

Branche de publication : `feature/friends-privacy-0.26.0`

La version 0.26.0 installe le socle social de SportPilot sans activer de partage d’activité détaillé. Elle prépare les amis, les demandes et les préférences de confidentialité pour la suite 0.27.0.

## Contenu livré

- route `/friends` et page “Amis et confidentialité” ;
- navigation desktop et mobile vers le nouvel espace amis ;
- domaine local pour profils amis, demandes et préférences de confidentialité ;
- service applicatif de gestion des demandes, acceptations, refus et doublons ;
- repository Dexie dédié aux données sociales locales ;
- migration Dexie v9 avec tables `friendProfiles`, `friendRequests`, `friendsPrivacySettings` ;
- export/restauration des données sociales dans la sauvegarde JSON v8 ;
- garde-fou social bloquant tout export détaillé ;
- audit `audit:friends-privacy` intégré à `check` et `ci`.

## Versions techniques

- application : `0.26.0` ;
- base Dexie : v9 ;
- sauvegarde JSON : v8 ;
- registre local des espaces : v1 ;
- runtime Dexie Cloud : v10 ;
- synchronisation sociale cloud : non activée.

## Validation attendue

La publication doit être validée avec :

- tests ciblés amis/confidentialité ;
- audit `audit:friends-privacy` ;
- audit `audit:release` ;
- audit `audit:repository` ;
- export sauvegarde JSON v8 contenant les tables sociales ;
- restauration conservant amis, demandes et préférences ;
- vérification que le partage détaillé reste bloqué ;
- build, check complet et test de stabilité.

Tag attendu à la publication : `v0.26.0`.
