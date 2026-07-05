# Notes de release — SportPilot 0.28.0

## Résumé

SportPilot 0.28.0 finalise la préparation du backend social cloud réel. La release transforme le socle social local 0.27.0 en architecture cloud contrôlée : identité cloud, réservation des handles, recherche exacte, demandes d’amis cloud, amitiés cloud, permissions synchronisées et snapshots sociaux distants filtrés.

Le périmètre reste volontairement strict : aucun annuaire public, aucune suggestion utilisateur, aucune recherche approximative, aucun like, aucun commentaire, aucune messagerie, aucun groupe, aucun classement et aucun export brut d’activité.

## Nouveautés principales

### Contrat cloud social

- Contrat `SocialCloudBackendPort` structuré.
- Collections cloud sociales attendues : `socialIdentities`, `socialHandleReservations`, `socialFriendRequests`, `socialFriendships`, `socialFriendPermissions` et `socialActivitySnapshots`.
- Fallback explicite quand le cloud social réel est indisponible.
- Flag `VITE_ENABLE_REAL_SOCIAL_CLOUD` conservé pour contrôler l’activation.

### identités cloud et réservation unique des handles

- Publication d’identité cloud par `userId`.
- réservation unique des handles publics.
- Prévention des doublons de handle.
- Conservation d’un `userId` privé et stable, distinct du handle public.

### Recherche exacte utilisateur

- Recherche stricte par handle exact.
- États `found`, `notFound`, `invalidHandle` et `unavailable`.
- Aucun annuaire ouvert.
- Aucun matching partiel.
- Aucune suggestion utilisateur.

### Demandes d’amis cloud

- Demandes envoyées par `requesterUserId` et `recipientUserId`.
- Statuts `pending`, `accepted`, `declined` et `cancelled`.
- Blocage des demandes vers soi-même.
- Blocage des doublons pending.
- Conservation des messages `Identifiant inexistant` et `Service cloud indisponible`.

### Amitiés cloud et permissions synchronisées

- Création d’amitiés cloud stables uniquement après acceptation explicite.
- Relation basée sur `userId`, jamais sur le handle.
- Permissions par ami synchronisées.
- Résumé par défaut.
- Détail uniquement après consentement explicite.

### Snapshots sociaux distants filtrés

- Publication cloud de snapshots sociaux filtrés uniquement.
- Lecture des snapshots autorisés pour alimenter le feed amis.
- Conversion des snapshots entrants pour les rattacher au `ownerUserId` distant.
- Dégradation possible vers résumé si la permission détail n’est pas autorisée.
- Garantie `rawActivityShared: false`.

## Versions techniques

- Application : `0.28.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Tag attendu : `v0.28.0`.

## Garde-fous de confidentialité

- Aucun export d’activité brute.
- Aucune table `socialRawActivities`.
- Pas d’envoi de notes privées, horaires précis libres, calculs internes ou payload brut.
- Pas de relation basée sur le handle public.
- Pas d’annuaire public.
- Pas de suggestions.
- Pas d’interactions sociales non prévues.

## Validation attendue

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
