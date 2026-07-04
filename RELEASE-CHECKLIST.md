# Checklist de publication — SportPilot 0.25.1

## Préparation Git

- [ ] La branche `feature/photo-ai-0.25.1` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.25.1`.
- [ ] Paramètres affiche `0.25.1`.
- [ ] Aucun fichier `.env`, `.env.local` ou secret Gemini n’est stagé.
- [ ] La recherche `AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}` ne retourne aucune clé réelle dans le diff.

## Contrôles automatiques

- [ ] `npm run test -- functions/_shared/photoNutritionAiProxy.test.mjs src/application/photo-nutrition/photoNutritionAiClient.test.ts src/application/photo-nutrition/photoNutritionEstimationService.test.ts src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx` passe.
- [ ] `npm run audit:photo-ai` passe.
- [ ] `npm run audit:photo-nutrition` passe.
- [ ] `npm run build` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe.

## Recette fonctionnelle

- [ ] Sans endpoint IA, l’analyse locale reste disponible.
- [ ] Avec `VITE_PHOTO_NUTRITION_AI_ENDPOINT=/api/photo-nutrition/analyze`, le bouton IA est disponible.
- [ ] La photo n’est envoyée qu’après consentement explicite.
- [ ] Le proxy Gemini renvoie une estimation différente selon le plat photographié.
- [ ] Les champs aliment, quantité, kcal, protéines, glucides et lipides sont préremplis.
- [ ] L’utilisateur peut corriger les valeurs avant ajout.
- [ ] L’entrée est ajoutée au bon repas.
- [ ] Si le proxy est coupé ou si le quota Gemini est atteint, le fallback local s’active proprement.
- [ ] Open Food Facts fonctionne toujours.
- [ ] Le scanner code-barres fonctionne toujours.

## Publication

- [ ] Fusion manuelle dans `develop` avec `merge: intégrer SportPilot 0.25.1`.
- [ ] Contrôles release relancés sur `develop`.
- [ ] Fusion manuelle dans `main` avec `merge: publier SportPilot 0.25.1`.
- [ ] Le tag annoté `v0.25.1` est créé sur le commit publié.
- [ ] `develop` est resynchronisée avec `main`.
