# SportPilot 0.26.0

## Nouveautés

- Ajout de la page “Amis et confidentialité”.
- Ajout d’une route `/friends` accessible depuis la navigation.
- Gestion locale des demandes entrantes, demandes sortantes, acceptations et refus.
- Persistance locale des profils amis, demandes et préférences de confidentialité.
- Ajout d’un garde-fou social empêchant le partage détaillé non consenti.

## Confidentialité

- Les données détaillées restent privées par défaut.
- Le mode “Détaillé après accord” reste bloqué tant que le consentement explicite par ami n’est pas livré.
- Aucun export social détaillé n’est disponible en 0.26.0.
- Les demandes restent locales dans cette phase.

## Technique

- Version applicative : `0.26.0`.
- Base Dexie : v9.
- Sauvegarde JSON : v8.
- Registre local des espaces : v1.
- Runtime Dexie Cloud : v10.
- Synchronisation sociale cloud : non activée.

## Sauvegarde et restauration

- Les tables `friendProfiles`, `friendRequests` et `friendsPrivacySettings` sont incluses dans la sauvegarde JSON v8.
- La restauration conserve les amis, demandes et préférences.
- Le centre de gestion des données affiche Dexie v9 et JSON v8.

## Contrôles

- Tests domaine amis/confidentialité.
- Tests service applicatif et repository Dexie.
- Tests de persistance de page.
- Tests sauvegarde JSON v8.
- Audit amis/confidentialité.
- Build, check complet et test de stabilité attendus avant publication.
