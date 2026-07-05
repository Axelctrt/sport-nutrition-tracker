# SportPilot 0.28.0 F7 — Finalisation release social cloud

## Objectif

La phase F7 stabilise la release 0.28.0 après les six incréments de préparation du backend social cloud réel. Elle ne modifie pas la logique métier validée en F1 à F6 : elle consolide la version, la documentation, les audits et la procédure de publication.

## Périmètre livré

- Version application publiée en `0.28.0`.
- Contrat cloud social F1 conservé avec les collections sociales requises.
- Identités cloud F2 et réservation unique des handles conservées.
- Recherche exacte F3 conservée sans annuaire public.
- Demandes d’amis cloud F4 conservées sur `requesterUserId` et `recipientUserId`.
- Amitiés cloud F5 conservées sur relation stable par `userId`.
- Permissions cloud F5 conservées avec résumé par défaut et détail uniquement après consentement explicite.
- Snapshots sociaux cloud F6 conservés avec publication filtrée et lecture autorisée pour le feed amis.
- Runtime Dexie Cloud prototype stabilisé en v14.
- AppDatabase locale conservée en Dexie v10.
- Sauvegarde JSON conservée en v9.

## Collections cloud sociales attendues

- `socialIdentities`
- `socialHandleReservations`
- `socialFriendRequests`
- `socialFriendships`
- `socialFriendPermissions`
- `socialActivitySnapshots`

Aucune collection `socialRawActivities` n’est autorisée.

## Garde-fous maintenus

- Pas d’annuaire public.
- Pas de suggestions utilisateurs.
- Pas de recherche approximative.
- Pas de relation basée sur le handle.
- Pas de partage automatique.
- Pas d’activité brute envoyée au cloud social.
- Pas d’export brut d’activité.
- Pas de likes.
- Pas de commentaires.
- Pas de messagerie.
- Pas de groupes.
- Pas de classements.

## Validation release

La release 0.28.0 doit être validée par :

- `npm run audit:social-cloud-contract`
- `npm run audit:social-cloud-identity`
- `npm run audit:social-cloud-lookup`
- `npm run audit:social-cloud-friend-requests`
- `npm run audit:social-cloud-friendships`
- `npm run audit:social-cloud-activity-snapshots`
- `npm run audit:social-release`
- `npm run audit:release`
- `npm run audit:repository`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run check`
- `npm run test:stability`

## Publication Git attendue

1. Commit de finalisation sur `feature/social-cloud-0.28.0`.
2. Fusion manuelle dans `develop` avec `merge: intégrer SportPilot 0.28.0`.
3. Contrôles release sur `develop`.
4. Fusion manuelle dans `main` avec `merge: publier SportPilot 0.28.0`.
5. Tag annoté `v0.28.0` sur `main`.
6. Resynchronisation de `develop` avec `main`.
