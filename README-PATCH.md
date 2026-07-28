# SportPilot 0.34.0 — Performance Glass, thèmes et analyses

Branche de finalisation : `feat/design-themes-analytics-0.34.0`

SportPilot 0.34.0 remplace l’ancien catalogue visuel par cinq thèmes, refond la
collection Récompenses et sépare clairement le résumé Progression de
l’exploration détaillée Analyses.

## Périmètre

- version applicative : `0.34.0` ;
- tag attendu : `v0.34.0` ;
- migrations D1 ajoutées : aucune ;
- migrations Dexie ajoutées : aucune ;
- contrats sociaux 0.29 conservés ;
- moteur calorique conservé ;
- données locales et protocoles de synchronisation conservés.

## Contrôles obligatoires

```text
npm run lint
npx tsc -b --pretty false
npm run build
npm run test
npm run test:e2e
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

## Publication

1. Committer la finalisation sur `feat/design-themes-analytics-0.34.0`.
2. Pousser la branche sans fusion automatique.
3. Déployer une Preview uniquement après autorisation explicite.
4. Fusionner manuellement dans `develop`, puis `main`, après validation.
5. Déployer la production Cloudflare Pages depuis le commit autorisé.
6. Créer le tag annoté `v0.34.0` sur le commit réellement publié.
