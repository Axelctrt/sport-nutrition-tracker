# Checklist de publication — SportPilot 0.31.0

## Préparation Git

- [ ] La branche `release/0.31.0` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.31.0`.
- [ ] Paramètres affiche `0.31.0`.
- [ ] Aucun ZIP, dossier `patch-files/`, résultat Playwright ou fichier généré n’est stagé.
- [ ] Aucun `.env`, secret Cloudflare, token Dexie Cloud ou clé IA n’est stagé.
- [ ] Aucune migration D1 ou Dexie nouvelle n’est attendue pour cette release.

## Contrôles automatiques

- [ ] `npm run lint` passe sans erreur.
- [ ] `npx tsc -b --pretty false` passe.
- [ ] La suite Vitest complète passe en lots déterministes.
- [ ] `npm run test:e2e:acceptance` passe sur Chromium desktop et WebKit iPhone 15.
- [ ] `npm run build` passe.
- [ ] `npm run check` passe.
- [ ] `npm run test:stability` passe ou chaque lot déterministe équivalent est consigné.
- [ ] `npm audit` annonce zéro vulnérabilité.
- [ ] `npm run audit:release-consolidation` passe.
- [ ] `npm run audit:ux-mobile-acceptance` passe.
- [ ] `npm run audit:release` passe.
- [ ] `npm run audit:security` passe.
- [ ] `npm run audit:production` passe.
- [ ] `npm run audit:repository` passe.
- [ ] Les audits Sport, Nutrition, compte, synchronisation, Photo IA et social passent.

## Recette fonctionnelle

- [ ] Accueil allégé et personnalisations existantes validés.
- [ ] Menu mobile et navigation desktop validés.
- [ ] Nutrition : ajout prioritaire, méthodes avancées, répétition de repas, scanner, Photo IA et recettes validés.
- [ ] Sport : hub, activité simple, séance détaillée, modèles, planning et fin de séance validés.
- [ ] Progression : synthèse, poids, objectifs, analyses, rapports et bilan hebdomadaire validés.
- [ ] Compte : vue standard, détails avancés, file, historique et diagnostics validés.
- [ ] Mode local, hors connexion, synchronisation et restauration validés.
- [ ] Suppression d’ami avec confirmation validée.
- [ ] Retours contextuels, focus, VoiceOver, clavier et zones sûres iOS validés.
- [ ] Aucun débordement horizontal sur iPhone 15 sous iOS 26.

## Publication

- [ ] Commit `chore(release): finaliser SportPilot 0.31.0` créé sur `release/0.31.0`.
- [ ] `release/0.31.0` fusionnée manuellement dans `develop`.
- [ ] Contrôles critiques relancés sur `develop`.
- [ ] `develop` fusionnée manuellement dans `main`.
- [ ] `main` poussée avant le déploiement de production.
- [ ] Production Cloudflare Pages construite depuis `main`.
- [ ] Version, PWA, Nutrition, Sport, Progression, compte et synchronisation vérifiés en production.
- [ ] Tag annoté `v0.31.0` créé sur le commit publié.
- [ ] Tag `v0.31.0` poussé vers `origin`.
- [ ] `develop` resynchronisée avec `main`.
