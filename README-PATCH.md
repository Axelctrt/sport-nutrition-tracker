# SportPilot 0.33.2 — compte cloud, synchronisation et création d’exercice

Branche de finalisation : `fix/account-sync-ux-0.33.2`

SportPilot 0.33.2 distingue l’identité connue de l’accès cloud opérationnel,
prévalide la synchronisation et les API protégées, corrige le switch IA et
permet de créer un exercice depuis une recherche sans résultat.

## Périmètre

- version applicative : `0.33.2` ;
- tag attendu : `v0.33.2` ;
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
npm run audit:photo-ai
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

## Publication

1. Committer la finalisation sur `fix/account-sync-ux-0.33.2`.
2. Déployer et valider la Preview uniquement après autorisation explicite.
3. Fusionner `fix/account-sync-ux-0.33.2` dans `develop`.
4. Relancer les contrôles critiques sur `develop`.
5. Fusionner `develop` dans `main`.
6. Déployer la production Cloudflare Pages depuis `main`.
7. Créer et pousser le tag annoté `v0.33.2`.
8. Resynchroniser `develop` avec `main`.
