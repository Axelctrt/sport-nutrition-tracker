# ADR-002 — Mobile-first, Performance Glass et références externes

- Statut : Accepté
- Date : 2026-07-30

## Contexte

SportPilot est une PWA utilisée en priorité sur mobile. Son langage visuel
Performance Glass repose sur des tokens, thèmes et primitives internes. Des
galeries externes peuvent inspirer l’évolution visuelle, mais leurs composants
ne satisfont pas automatiquement les contraintes produit.

## Décision

- Concevoir d’abord pour le toucher et les petits écrans, puis enrichir les
  écrans plus larges.
- Préserver les safe areas, le clavier, le focus, le contraste et
  `prefers-reduced-motion`.
- Étendre les tokens `--sp-*` et composants partagés avant de créer une variante
  locale.
- Traiter les références externes, dont Aceternity UI, comme inspiration
  uniquement. Toute adaptation est revue pour licence, accessibilité,
  performance, thèmes et comportement hors animation.

## Conséquences

Une reproduction visuelle exacte peut être rejetée. Les effets dépendant du
survol, coûteux ou incompatibles avec le mouvement réduit ne sont pas retenus.
Les changements UX partagés demandent une validation mobile et multi-thèmes.
