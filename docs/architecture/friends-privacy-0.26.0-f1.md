# SportPilot 0.26.0 F1 — socle amis et confidentialité

## Objectif

Cette phase introduit le socle fonctionnel du futur réseau d’amis SportPilot sans activer le partage détaillé des performances.

La priorité est de poser un cadre sûr : demandes d’amis, validation manuelle, paramètres de visibilité et refus explicite de tout partage automatique.

## Périmètre livré

- route `/friends` dédiée à l’écran amis et confidentialité ;
- navigation desktop et mobile vers le réseau privé ;
- domaine `friendship` avec demandes entrantes, demandes sortantes, acceptation, refus et réglages de visibilité ;
- service applicatif local pour piloter l’écran ;
- écran de validation utilisateur avec compteurs, invitation, demandes et amis connectés ;
- audit `npm run audit:friends-privacy` ;
- tests domaine, service, route et page.

## Confidentialité par défaut

Le partage d’activité est désactivé par défaut.

Une demande acceptée ajoute un ami mais ne donne pas automatiquement accès aux données détaillées. Les niveaux de partage sont préparés pour les phases suivantes, mais l’utilisateur conserve le contrôle explicite.

## Hors périmètre F1

- pas de migration Dexie ;
- pas de synchronisation cloud des amis ;
- pas de recherche réelle d’utilisateurs ;
- pas de flux d’activité ;
- pas de classement ;
- pas de partage automatique des séances, calories, poids ou objectifs.

## Suite prévue

La suite logique de `0.26.0` consiste à brancher la persistance/synchronisation des relations, puis à préparer `0.27.0` pour le partage d’activité entre amis.
