# SportPilot 0.33.1 — analyse photo et finitions UX

Branche de finalisation : `fix/ux-photo-search-0.33.1`

SportPilot 0.33.1 corrige la route d’analyse photo, prépare les images avant
l’envoi, supprime toute estimation locale fictive et simplifie les parcours
Nutrition, de recherche et d’aide contextuelle.

## Périmètre

- version applicative : `0.33.1` ;
- tag attendu : `v0.33.1` ;
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
npm run test
npm run test:e2e
npm run audit:photo-ai
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

## Publication

1. Committer la finalisation sur `fix/ux-photo-search-0.33.1`.
2. Déployer et valider la Preview uniquement après autorisation explicite.
3. Fusionner `fix/ux-photo-search-0.33.1` dans `develop`.
4. Relancer les contrôles critiques sur `develop`.
5. Fusionner `develop` dans `main`.
6. Déployer la production Cloudflare Pages depuis `main`.
7. Créer et pousser le tag annoté `v0.33.1`.
8. Resynchroniser `develop` avec `main`.
