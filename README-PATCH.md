# SportPilot 0.31.0 — consolidation UX et release

Branche de finalisation : `release/0.31.0`

SportPilot 0.31.0 regroupe les phases de fiabilisation de navigation, simplification des hubs, Progression décisionnelle, ajout Nutrition progressif, compte/synchronisation simplifiés et maintenabilité du centre de synchronisation.

## Périmètre

- version applicative : `0.31.0` ;
- tag attendu : `v0.31.0` ;
- migrations D1 ajoutées : aucune ;
- migrations Dexie ajoutées : aucune ;
- contrats sociaux 0.29 conservés ;
- moteur calorique conservé ;
- budgets de production et audits historiques remis en cohérence.

## Contrôles obligatoires

```text
npm run lint
npx tsc -b --pretty false
npm run build
npm run test:e2e:acceptance
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

## Publication

1. Committer la finalisation sur `release/0.31.0`.
2. Déployer et valider la Preview de la branche release.
3. Fusionner `release/0.31.0` dans `develop`.
4. Relancer les contrôles critiques sur `develop`.
5. Fusionner `develop` dans `main`.
6. Déployer la production Cloudflare Pages depuis `main`.
7. Créer et pousser le tag annoté `v0.31.0`.
8. Resynchroniser `develop` avec `main`.
