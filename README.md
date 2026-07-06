# SportPilot 0.28.0

SportPilot 0.28.0 finalise la préparation du backend social cloud réel. La release conserve le socle social local de 0.27.0 et ajoute une architecture cloud contrôlée : identités cloud, réservation de handles, recherche exacte, demandes d’amis cloud, amitiés cloud, permissions synchronisées et snapshots sociaux distants filtrés.

Le périmètre reste volontairement strict : pas d’annuaire public, pas de suggestions, pas de recherche approximative, pas de messagerie, pas de likes, pas de commentaires, pas de groupes, pas de classements et aucun export d’activité brute.

## Identité sociale cloud

- `userId` privé, stable et utilisé comme clé relationnelle.
- Handle public visible, copiable et réservé de façon unique côté cloud.
- `displayName` public associé au profil.
- Recherche exacte uniquement via handle complet.
- État explicite quand le cloud social réel est indisponible.

## Demandes et amitiés cloud

- Demandes d’amis envoyées vers un `recipientUserId`, jamais vers un handle comme clé relationnelle.
- Statuts `pending`, `accepted`, `declined` et `cancelled`.
- Création d’amitié cloud stable uniquement après acceptation explicite.
- Blocage des demandes vers soi-même et des doublons pending.
- Lecture des amitiés par `userId`.

## Permissions synchronisées

- Permissions de partage synchronisées par ami.
- Résumé par défaut.
- Détail uniquement après consentement explicite.
- Aucune activation automatique du partage détaillé.
- Les permissions servent à filtrer les snapshots sociaux, pas à exposer les activités brutes.

## Snapshots sociaux distants filtrés

Le partage d’activité cloud repose uniquement sur des snapshots sociaux filtrés. Les snapshots peuvent être publiés pour un ami autorisé, puis lus dans le feed amis si la relation et la permission le permettent. Les snapshots entrants sont rattachés au `ownerUserId` distant pour l’affichage du feed.

Aucun payload brut d’activité n’est publié. Les notes libres, champs internes, horaires précis non nécessaires, calculs techniques et données privées complètes restent hors cloud social.

## Stockage et sauvegarde

- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Collections cloud sociales : `socialIdentities`, `socialHandleReservations`, `socialFriendRequests`, `socialFriendships`, `socialFriendPermissions`, `socialActivitySnapshots`.
- Aucune collection `socialRawActivities`.

## IA photo nutritionnelle

Le parcours IA Gemini livré précédemment reste disponible. La clé Gemini reste côté serveur, le consentement photo reste obligatoire avant envoi externe, et le fallback local reste actif si Gemini, le proxy ou les quotas échouent.

## Garde-fous hors périmètre

- Pas d’annuaire public.
- Pas de suggestions utilisateurs.
- Pas de matching partiel.
- Pas de likes.
- Pas de commentaires.
- Pas de messagerie.
- Pas de groupes.
- Pas de classements.
- Pas de partage automatique.
- Pas d’export brut d’activité.

## Validation release

La release 0.28.0 doit être validée avec `npm run build`, `npm run lint`, `npm run test`, `npm run check`, `npm run test:stability`, les audits sociaux locaux 0.27.0 et les audits cloud sociaux 0.28.0 F1 à F6.

Tag attendu à publication : `v0.28.0`.

### Activation contrôlée du cloud social réel

Depuis la préparation 0.28.1 F1, `VITE_ENABLE_REAL_SOCIAL_CLOUD` peut être piloté par environnement de déploiement. La configuration publique garde un défaut prudent à `false`, mais Cloudflare Preview peut définir `true` pour tester identités, demandes d’amis, permissions et snapshots filtrés avec des comptes réels de test.
