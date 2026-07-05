# SportPilot 0.28.0 — backend social cloud réel en préparation

Branche de développement : `feature/social-cloud-0.28.0`

La version 0.28.0 prépare le passage du socle social local vers un backend social cloud réel. F1 a défini le contrat cloud social ; F2 ajoute les identités cloud et la réservation unique des handles exacts ; F3 branche la recherche exacte ; F4 prépare les demandes d’amis cloud basées sur `userId`.

## Contenu livré

- identité sociale locale avec `userId` privé, `handle` public et `displayName` ;
- validation stricte des identifiants SportPilot publics ;
- contrat de recherche exacte d’utilisateur, sans annuaire ouvert ;
- demandes d’amis compatibles avec des identifiants utilisateur réels ;
- gestion des cas `identifiant inexistant`, soi-même, déjà ami, demande déjà envoyée, demande déjà reçue et service cloud indisponible ;
- permissions de partage par ami avec résumé par défaut et détail uniquement après consentement explicite ;
- génération de snapshots sociaux filtrés résumé/détail ;
- premier fil d’activité amis basé uniquement sur les snapshots filtrés ;
- garde-fou anti-fuite conservé ;
- audits sociaux F1 à F5 intégrés au pipeline ;
- contrat cloud social 0.28.0 F1 ;
- identités cloud 0.28.0 F2 avec `socialIdentities` et `socialHandleReservations` ;
- recherche exacte 0.28.0 F3 ;
- demandes d’amis cloud 0.28.0 F4 avec `socialFriendRequests`.

## Versions techniques

- application : `0.27.0` ;
- base Dexie : v10 ;
- sauvegarde JSON : v9 ;
- registre local des espaces : v1 ;
- runtime Dexie Cloud : v12 ;
- collections cloud sociales F2-F4 : `socialIdentities`, `socialHandleReservations`, `socialFriendRequests` ;
- synchronisation sociale cloud réelle : non activée en configuration publique.

## Hors périmètre volontaire

- pas de recherche globale avec suggestions ;
- pas de recherche approximative ;
- pas d’annuaire public ;
- pas de likes ;
- pas de commentaires ;
- pas de messagerie ;
- pas de groupes ;
- pas de classements ;
- pas de partage automatique ;
- pas d’export d’activité brute.

## Validation attendue

La publication doit être validée avec :

- audits sociaux `audit:friends-privacy`, `audit:social-identity`, `audit:social-friend-requests`, `audit:social-friend-permissions`, `audit:social-activity-snapshots`, `audit:social-activity-feed` et `audit:social-release` ;
- tests ciblés identité, demandes, permissions, snapshots et feed ;
- tests ciblés identités cloud, recherche exacte et demandes d’amis cloud ;
- audit `audit:release` ;
- audit `audit:repository` ;
- export sauvegarde JSON v9 contenant les données sociales ;
- restauration conservant identité, amis, demandes, préférences et permissions ;
- vérification que le feed ne lit que des snapshots filtrés ;
- build, check complet et test de stabilité.

Tag attendu à la publication finale : `v0.28.0`.

## 0.28.0 F3 — Recherche exacte utilisateur cloud

- Ajoute le contrat `socialCloudUserLookup`.
- Branche un gateway de recherche exacte sur les identités cloud F2.
- Garde le fallback indisponible tant que `VITE_ENABLE_REAL_SOCIAL_CLOUD=false`.
- Interdit annuaire, suggestions, matching partiel, demande cloud automatique et export brut.


## 0.28.0 F4 — Demandes d’amis cloud

- Ajoute le contrat `socialCloudFriendRequest`.
- Ajoute la table runtime `socialFriendRequests`.
- Envoie les demandes sur `requesterUserId` et `recipientUserId`, jamais sur le handle.
- Prépare les statuts `pending`, `accepted`, `declined` et `cancelled`.
- Garde le fallback indisponible tant que `VITE_ENABLE_REAL_SOCIAL_CLOUD=false`.
- Interdit annuaire, suggestions, matching partiel, amitié automatique, snapshots distants et export brut.
