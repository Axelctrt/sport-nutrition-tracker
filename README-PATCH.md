# SportPilot 0.28.0 — backend social cloud réel en préparation

Branche de développement : `feature/social-cloud-0.28.0`

La version 0.28.0 prépare le passage du socle social local vers un backend social cloud réel. F1 a défini le contrat cloud social ; F2 ajoute les identités cloud et la réservation unique des handles exacts.

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
- identités cloud 0.28.0 F2 avec `socialIdentities` et `socialHandleReservations`.

## Versions techniques

- application : `0.27.0` ;
- base Dexie : v10 ;
- sauvegarde JSON : v9 ;
- registre local des espaces : v1 ;
- runtime Dexie Cloud : v11 ;
- collections cloud sociales F2 : `socialIdentities`, `socialHandleReservations` ;
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
- tests ciblés identités cloud et réservation de handle ;
- audit `audit:release` ;
- audit `audit:repository` ;
- export sauvegarde JSON v9 contenant les données sociales ;
- restauration conservant identité, amis, demandes, préférences et permissions ;
- vérification que le feed ne lit que des snapshots filtrés ;
- build, check complet et test de stabilité.

Tag attendu à la publication finale : `v0.28.0`.
