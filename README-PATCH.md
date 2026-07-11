# SportPilot 0.30.0 — release UX mobile

Branche de finalisation : `release/0.30.0`

SportPilot 0.30.0 clôt la refonte UX mobile menée sur les phases U1 à U16. La release stabilise les hubs Accueil, Nutrition et Sport, les parcours d’ajout, les comportements globaux, les séances compactes et la recette mobile/accessibilité.

## Périmètre

- version applicative : `0.30.0` ;
- tag attendu : `v0.30.0` ;
- migrations D1 ajoutées : aucune ;
- migrations Dexie ajoutées : aucune ;
- contrats sociaux 0.29 conservés ;
- moteur calorique conservé.

## Contrôles obligatoires

```text
npm run audit:ux-mobile-acceptance
npm run audit:release
npm run audit:security
npm run audit:production
npm run audit:repository
npm run lint
npm run test
npm run build
npm run check
npm run test:stability
npm audit
```

## Publication

1. Committer la finalisation sur `release/0.30.0`.
2. Fusionner `release/0.30.0` dans `develop`.
3. Déployer et valider la Preview.
4. Fusionner `develop` dans `main`.
5. Déployer la production Cloudflare Pages depuis `main`.
6. Créer et pousser le tag annoté `v0.30.0`.
7. Resynchroniser `develop` avec `main`.
