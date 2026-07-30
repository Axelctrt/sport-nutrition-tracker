# SportPilot 0.35.0 — feedback unifié et onboarding fluidifié

Branche de publication : `release/0.35.0`

SportPilot 0.35.0 unifie les retours d’action, fluidifie les parcours d’onboarding local et compte, et simplifie plusieurs écrans secondaires sans modifier le moteur calorique, les thèmes validés ni les contrats de données.

## Périmètre

- version applicative : `0.35.0` ;
- tag attendu : `v0.35.0` ;
- migrations D1 ajoutées : aucune ;
- migrations Dexie ajoutées : aucune ;
- contrat social `0.29.0-a3` conservé ;
- moteur calorique conservé ;
- Dexie locale v11, sauvegarde JSON v10 et runtime cloud v16 conservés ;
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

1. Finaliser les métadonnées et garde-fous sur `release/0.35.0`.
2. Pousser la branche sans fusion automatique.
3. Valider les quatre jobs GitHub Actions sur le même SHA.
4. Fusionner dans `main` uniquement après validation complète.
5. Déployer la production Cloudflare Pages depuis le commit publié.
6. Vérifier la version, le manifeste, le service worker, les routes profondes et la conservation des données.
7. Créer le tag annoté `v0.35.0` sur le commit réellement publié.
