# Checklist de publication — SportPilot 0.30.0

## Préparation Git

- [ ] La branche `release/0.30.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.30.0`.
- [ ] Paramètres affiche `0.30.0`.
- [ ] Aucun ZIP, dossier `patch-files/`, rapport temporaire ou fichier généré n’est stagé.
- [ ] Aucun `.env`, secret Cloudflare, token Dexie Cloud ou clé IA n’est stagé.
- [ ] Aucune migration D1 ou Dexie nouvelle n’est attendue pour cette release.

## Contrôles automatiques

- [ ] `npm run audit:ux-mobile-acceptance` passe.
- [ ] `npm run audit:release` passe.
- [ ] `npm run audit:security` passe.
- [ ] `npm run audit:production` passe.
- [ ] `npm run audit:repository` passe.
- [ ] `npm run audit:social-release` passe avec les contrats sociaux 0.29 conservés.
- [ ] `npm run audit:social-release-finalization` passe avec les contrats sociaux 0.29 conservés.
- [ ] `npm run lint` passe sans erreur.
- [ ] `npm run test` passe.
- [ ] `npm run build` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe.
- [ ] `npm audit` annonce zéro vulnérabilité.

## Recette fonctionnelle

- [ ] Accueil validé sur ordinateur et iPhone 15.
- [ ] Nutrition : hub quotidien, repas, ajout, recherche, scanner, photo IA, favoris et recettes validés.
- [ ] Sport : hub, activité cardio, séance planifiée, séance libre, séries compactes et fin de séance validés.
- [ ] Progression et paramètres validés.
- [ ] Onboarding local et reprise après interruption validés.
- [ ] Champs préremplis : vidage au focus, restauration sans saisie et conservation après modification validés.
- [ ] Panneaux mobiles, confirmations et focus validés.
- [ ] Mode hors ligne, recharge PWA et reprise validés.
- [ ] Aucun débordement horizontal sur iPhone 15 sous iOS 26.

## Publication

- [ ] Commit `chore(release): finaliser SportPilot 0.30.0` créé sur `release/0.30.0`.
- [ ] `release/0.30.0` fusionnée manuellement dans `develop`.
- [ ] Contrôles critiques relancés sur `develop`.
- [ ] `develop` fusionnée manuellement dans `main`.
- [ ] `main` poussée avant le déploiement de production.
- [ ] Production Cloudflare Pages construite depuis `main`.
- [ ] Version, PWA, Nutrition, Sport et paramètres vérifiés en production.
- [ ] Tag annoté `v0.30.0` créé sur le commit publié.
- [ ] Tag `v0.30.0` poussé vers `origin`.
- [ ] `develop` resynchronisée avec `main`.
