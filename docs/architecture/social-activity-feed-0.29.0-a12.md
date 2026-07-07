# SportPilot 0.29.0 — A12 — Persistance locale des amitiés cloud avant publication

## Incident observé

Le fil du destinataire répondait correctement avec une liste vide, aucune requête `POST /api/social-activity-snapshots/sync` n'était émise par le propriétaire et la table D1 `social_activity_snapshots` restait vide.

## Cause racine

La page `Amis et confidentialité` fusionnait les amitiés, profils et permissions récupérés depuis D1 uniquement dans son état React. Le dépôt Dexie local utilisé par l'observateur de publication restait inchangé.

Lors de l'enregistrement d'une activité, l'observateur relisait donc un snapshot local sans destinataire. Aucun snapshot n'était créé dans l'outbox et aucun envoi cloud ne pouvait démarrer.

## Correction

Après le chargement cloud :

1. les demandes, amitiés, profils et permissions sont fusionnés ;
2. le snapshot social fusionné est persisté dans Dexie ;
3. l'interface est mise à jour ;
4. la réconciliation best effort des activités existantes est déclenchée ;
5. les mutations créées dans l'outbox reprennent le flux de livraison A6.

La persistance précède obligatoirement la réconciliation.

## Garanties

- aucune modification du schéma Dexie ou D1 ;
- aucun secret ajouté au client ;
- aucune écriture métier bloquée par une erreur sociale ;
- les activités créées avant le correctif sont rétroprojetées à l'ouverture de la page ;
- les destinataires restent limités aux amitiés et permissions chargées depuis le cloud.
