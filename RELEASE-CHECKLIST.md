# Checklist de validation - SportPilot 0.35.1

## Préparation Git

- [x] Branche `fix/mobile-session-recovery-0.35.1` créée depuis `v0.35.0`.
- [x] `main`, `develop` et `v0.35.0` vérifiés sur `a413b8d92cdecb6e03eac7caca901e667e8c9801`.
- [x] Aucun travail utilisateur local n'a été écrasé ou placé dans un stash.
- [x] Aucun tag créé.
- [x] Aucun déploiement effectué.
- [x] Aucune migration D1 ou Dexie ajoutée.

## Contrôles automatiques

- [x] Tests ciblés des credentials, gates et espaces de données.
- [x] Renouvellement concurrent limité à une tentative.
- [x] Panne réseau et expiration réelle distinguées.
- [x] Retour en ligne et `visibilitychange` couverts.
- [x] Suite Vitest complète.
- [x] Ordre de tests mélangé.
- [x] Lint et TypeScript.
- [x] Build PWA.
- [x] Audits de compte, synchronisation, données, sécurité et publication.
- [x] Playwright Chromium desktop.
- [x] Playwright Chromium mobile 360 px.
- [x] Playwright WebKit iPhone 15.
- [x] Scénarios ciblés 320 px, 412 px et paysage.
- [x] Remplacement de la PWA old → new sans perte de données locales.

## Recette mobile à réaliser

### iPhone

- [ ] Ouvrir la PWA avec un jeton valide.
- [ ] La fermer plusieurs heures puis la rouvrir après expiration du jeton d'accès.
- [ ] Vérifier que le refresh conserve le compte et l'espace local.
- [ ] Activer le mode avion, utiliser les données locales, puis rétablir le réseau.
- [ ] Reprendre depuis l'arrière-plan et depuis l'icône installée.
- [ ] Vérifier qu'aucune déconnexion involontaire ne survient.

### Android

- [ ] Tester Chrome et la PWA installée.
- [ ] Suspendre l'application puis la rouvrir.
- [ ] Changer entre Wi-Fi et réseau mobile.
- [ ] Activer puis désactiver le mode avion.
- [ ] Vérifier qu'aucune bascule implicite en invité ne survient.

## Publication

- [ ] Branche poussée sur `origin`.
- [ ] Pull request brouillon préparée.
- [ ] Validation utilisateur reçue avant toute fusion, création de tag ou publication.
