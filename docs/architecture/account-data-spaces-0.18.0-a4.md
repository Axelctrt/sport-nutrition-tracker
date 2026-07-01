# SportPilot 0.18.0 A4 — finalisation de l’isolation des comptes

## Décision de release

La version 0.18.0 repose sur une isolation physique par base IndexedDB. L’espace invité conserve le nom historique `sportpilot-local-database`. Chaque compte reçoit une base distincte dérivée d’une empreinte opaque.

## Barrière de confidentialité

`DataSpaceAccountGate` enveloppe `AppProviders`. Les repositories et coordinators métier ne sont donc construits qu’après vérification de la correspondance entre le compte connecté et l’espace actif.

## Règles de rattachement

- seule la base invitée peut être copiée vers un nouveau compte ;
- une base de compte ne peut jamais servir de source vers un autre compte ;
- un espace enregistré ne peut pas être recréé comme vide ;
- une base cible non enregistrée mais déjà occupée n’est jamais écrasée ;
- la copie invitée reste non destructive.

## Couverture de validation

Le test d’intégration `accountDataIsolation.integration.test.ts` ouvre simultanément trois bases : invité, compte A et compte B. Il vérifie l’isolation du profil, des pesées, des activités, de la bibliothèque alimentaire, des séances de musculation et des objectifs quotidiens.

L’audit `audit-account-isolation.mjs` vérifie en outre :

- la position de la barrière avant les providers ;
- l’ouverture de la base correspondant à l’espace actif ;
- la stabilité du nom de la base invitée ;
- la dérivation opaque des bases de comptes ;
- l’absence d’email dans le registre ;
- la présence des garde-fous de rattachement ;
- l’intégration de l’audit dans `check` et `ci`.

## Hors périmètre

La synchronisation des autres tables, les conflits généralisés, la révocation distante des appareils et la restauration cloud complète appartiennent aux versions 0.19.0 à 0.23.0.
