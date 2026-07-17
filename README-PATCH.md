# SportPilot 0.32.0 — onboarding compact et release

Branche de finalisation : `release/0.32.0`

SportPilot 0.32.0 publie l’onboarding mobile compact validé sur iPhone 15 : choix local ou compte clarifié, connexion séparée, rouleaux tactiles, pages ordinaires statiques et résumé final entièrement scrollable.

## Périmètre

- version applicative : `0.32.0` ;
- tag attendu : `v0.32.0` ;
- migrations D1 ajoutées : aucune ;
- migrations Dexie ajoutées : aucune ;
- contrats sociaux 0.29 conservés ;
- moteur calorique conservé ;
- logique local/cloud et synchronisation conservée.

## Contrôles obligatoires

```text
npm run lint
npx tsc -b --pretty false
npm run build
npm run test:e2e:onboarding
npm run test:e2e:acceptance
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

## Publication

1. Committer la finalisation sur `release/0.32.0`.
2. Déployer et valider la Preview de la branche release.
3. Fusionner `release/0.32.0` dans `develop`.
4. Relancer les contrôles critiques sur `develop`.
5. Fusionner `develop` dans `main`.
6. Déployer la production Cloudflare Pages depuis `main`.
7. Créer et pousser le tag annoté `v0.32.0`.
8. Resynchroniser `develop` avec `main`.
