# Checklist de publication — SportPilot 0.33.1

## Préparation Git

- [ ] La branche `fix/ux-photo-search-0.33.1` est propre et synchronisée.
- [ ] `package.json` et `package-lock.json` indiquent `0.33.1`.
- [ ] Paramètres affiche `0.33.1`.
- [ ] Aucun ZIP, dossier `patch-files/`, résultat Playwright ou fichier généré n’est stagé.
- [ ] Aucun `.env`, secret Cloudflare, token Dexie Cloud ou clé IA n’est stagé.
- [ ] Aucune migration D1 ou Dexie nouvelle n’est attendue pour cette release.

## Contrôles automatiques

- [ ] `npm run lint` passe sans erreur.
- [ ] `npx tsc -b --pretty false` passe.
- [ ] La suite Vitest complète passe en lots déterministes.
- [ ] `npm run test:e2e:onboarding` passe sur WebKit iPhone 15.
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

## Recette onboarding

- [ ] La première page affiche Mode local et Connecter un compte sans champ e-mail.
- [ ] Le mode local précise qu’un compte peut être associé plus tard depuis Paramètres → Compte et appareils.
- [ ] La connexion e-mail et le code sont gérés sur l’écran suivant.
- [ ] Les neuf étapes de profil sont accessibles et les étapes ordinaires ne défilent pas globalement.
- [ ] Date ou âge, taille, poids et pas utilisent les rouleaux sans saisie numérique manuelle.
- [ ] Les pas progressent par paliers de 500.
- [ ] Les rouleaux ordinaires sont légèrement plus réactifs et la variation d’objectif conserve sa sensibilité précise.
- [ ] Les choix Masculin/Féminin, objectif et activité sont lisibles sans chevauchement.
- [ ] Le résumé final fait défiler toute la page et toutes les actions Modifier restent accessibles.
- [ ] VoiceOver, clavier, focus, lien d’évitement, réduction des animations et zones sûres iOS sont validés.

## Recette générale

- [ ] Accueil, Nutrition, Sport, Progression, Compte et Synchronisation restent fonctionnels.
- [ ] Mode local, hors connexion, synchronisation et restauration sont validés.
- [ ] Aucun débordement horizontal sur iPhone 15.
- [ ] La mise à jour PWA conserve les données existantes.

## Publication

- [ ] Commit `chore(release): finaliser SportPilot 0.33.1` créé sur `fix/ux-photo-search-0.33.1`.
- [ ] `fix/ux-photo-search-0.33.1` fusionnée manuellement dans `develop`.
- [ ] Contrôles critiques relancés sur `develop`.
- [ ] `develop` fusionnée manuellement dans `main`.
- [ ] `main` poussée avant le déploiement de production.
- [ ] Production Cloudflare Pages construite depuis `main`.
- [ ] Version, PWA, onboarding et parcours principaux vérifiés en production.
- [ ] Tag annoté `v0.33.1` créé sur le commit publié.
- [ ] Tag `v0.33.1` poussé vers `origin`.
- [ ] `develop` resynchronisée avec `main`.
