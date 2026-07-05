# SportPilot 0.28.0 — release social cloud

Branche de développement : `feature/social-cloud-0.28.0`

SportPilot 0.28.0 finalise le backend social cloud réel préparé par les phases F1 à F6. La release stabilise la version, les audits, la documentation et les garde-fous de confidentialité.

## Contenu livré

- contrat cloud social global ;
- identités cloud et réservation unique des handles ;
- recherche exacte par identifiant public complet ;
- demandes d’amis cloud par `requesterUserId` et `recipientUserId` ;
- amitiés cloud stables basées sur `userId` ;
- permissions de partage synchronisées par ami ;
- publication de snapshots sociaux filtrés ;
- lecture des snapshots autorisés pour le feed amis ;
- fallback propre quand `VITE_ENABLE_REAL_SOCIAL_CLOUD=false` ;
- audits sociaux cloud F1 à F6 intégrés au pipeline.

## Versions techniques

- application : `0.28.0` ;
- AppDatabase locale : Dexie v10 ;
- sauvegarde JSON : v9 ;
- runtime Dexie Cloud prototype : v14 ;
- collections cloud sociales : `socialIdentities`, `socialHandleReservations`, `socialFriendRequests`, `socialFriendships`, `socialFriendPermissions`, `socialActivitySnapshots`.

## Validation attendue

- `npm run audit:social-cloud-contract` ;
- `npm run audit:social-cloud-identity` ;
- `npm run audit:social-cloud-lookup` ;
- `npm run audit:social-cloud-friend-requests` ;
- `npm run audit:social-cloud-friendships` ;
- `npm run audit:social-cloud-activity-snapshots` ;
- `npm run audit:social-release` ;
- `npm run audit:release` ;
- `npm run audit:repository` ;
- `npm run build` ;
- `npm run lint` ;
- `npm run test` ;
- `npm run check` ;
- `npm run test:stability`.

## Hors périmètre volontaire

- pas d’annuaire public ;
- pas de suggestions ;
- pas de recherche approximative ;
- pas de likes ;
- pas de commentaires ;
- pas de messagerie ;
- pas de groupes ;
- pas de classements ;
- pas d’export d’activité brute ;
- pas de table `socialRawActivities`.

Tag attendu à la publication finale : `v0.28.0`.
