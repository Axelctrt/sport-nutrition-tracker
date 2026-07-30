# ADR-004 — Changements caloriques et IA sous validation

- Statut : Accepté
- Date : 2026-07-30

## Contexte

Les formules caloriques affectent les recommandations et les historiques.
L’analyse photo nutritionnelle introduit en plus des enjeux de consentement,
confidentialité, coût, fournisseurs et qualité.

## Décision

- Aucune formule calorique, version, règle d’arrondi ou interprétation
  historique ne change sans audit métier dédié et validation explicite.
- Aucun fournisseur, type de donnée envoyé, usage secondaire ou périmètre IA
  n’est ajouté sans validation produit, sécurité et confidentialité.
- Les secrets restent côté serveur ; aucune donnée secrète ne passe par
  `VITE_*`.
- Une absence de configuration cloud conserve un comportement local ou une
  erreur explicite, jamais une activation implicite.

## Conséquences

Une amélioration apparemment mineure peut nécessiter une phase dédiée, des
fixtures versionnées et des tests de non-régression. Les photos de progression
prévues ne deviennent pas une source d’analyse IA par proximité fonctionnelle.
