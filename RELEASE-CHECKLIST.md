# Checklist de publication — SportPilot 0.34.0

## Préparation Git

- [ ] La branche `feat/design-themes-analytics-0.34.0` est propre.
- [x] `package.json` et `package-lock.json` indiquent `0.34.0`.
- [x] Paramètres affiche `0.34.0`.
- [x] Aucun secret, ZIP, résultat Playwright ou fichier généré n’est stagé.
- [x] Aucune migration D1 ou Dexie nouvelle n’est attendue.

## Contrôles automatiques

- [x] `npm run lint` passe sans avertissement.
- [x] `npx tsc -b --pretty false` passe.
- [x] `npm run test` passe : 2 060 tests.
- [x] `npm run build` génère la PWA.
- [x] L’onboarding passe sur WebKit iPhone 15.
- [x] La recette mobile/accessibilité passe sur Chromium et WebKit.
- [x] Les 114 scénarios Playwright applicables passent.
- [x] `npm run test:e2e:pwa` conserve les données pendant la mise à jour.
- [x] `npm run audit:release-consolidation` passe.
- [x] `npm run audit:ux-mobile-acceptance` passe.
- [x] `npm run check` passe.
- [x] `npm run test:stability` passe.
- [x] `npm audit` est exécuté ; les alertes sans correctif compatible sont
  analysées dans `KNOWN-LIMITATIONS.md`.

## Recette 0.34.0

- [x] Les cinq thèmes fonctionnent en clair et sombre.
- [x] Un ancien identifiant inconnu retombe sur Core sans perte de données.
- [x] Les conditions de déblocage reflètent les données réellement enregistrées.
- [x] Le reveal n’apparaît qu’une fois et se diffère pendant une saisie.
- [x] Essayer maintenant ne synchronise rien avant confirmation.
- [x] Progression conserve ses périodes et liens profonds.
- [x] Analyses conserve domaine, période et période longue du poids.
- [x] Tous les graphiques ont un état vide et une alternative textuelle.
- [x] Aucun débordement horizontal à 320, 360, 393 et 412 px.
- [x] Clair, sombre, réduction de mouvement et iPhone 15 sont validés.
- [x] Manifeste, service worker, routes profondes et console sont contrôlés.

## Publication

- [ ] Commit `test(release): valider SportPilot 0.34.0` créé.
- [ ] Branche `feat/design-themes-analytics-0.34.0` poussée vers `origin`.
- [ ] Aucune fusion ni aucun déploiement sans autorisation explicite.
- [ ] Contrôles critiques relancés sur le commit autorisé.
- [ ] Tag annoté `v0.34.0` créé sur le commit publié.
- [ ] Tag `v0.34.0` poussé vers `origin`.
