# SportPilot 0.27.0 — activité sociale contrôlée

Branche de publication : `feature/activity-sharing-0.27.0`

La version 0.27.0 ajoute la première capacité sociale exploitable de SportPilot : les utilisateurs disposent d’un identifiant public, peuvent préparer des demandes d’amis compatibles avec de vrais comptes, régler les permissions ami par ami, générer des snapshots d’activité filtrés et consulter un premier fil d’activité amis minimal.

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
- audits sociaux F1 à F5 intégrés au pipeline.

## Versions techniques

- application : `0.27.0` ;
- base Dexie : v10 ;
- sauvegarde JSON : v9 ;
- registre local des espaces : v1 ;
- runtime Dexie Cloud : v10 ;
- synchronisation sociale cloud réelle : non activée.

## Hors périmètre volontaire

- pas de recherche globale avec suggestions ;
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
- audit `audit:release` ;
- audit `audit:repository` ;
- export sauvegarde JSON v9 contenant les données sociales ;
- restauration conservant identité, amis, demandes, préférences et permissions ;
- vérification que le feed ne lit que des snapshots filtrés ;
- build, check complet et test de stabilité.

Tag attendu à la publication : `v0.27.0`.
