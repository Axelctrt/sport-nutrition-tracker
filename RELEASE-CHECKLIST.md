# Checklist de validation - SportPilot 0.37.0

## Préparation Git

- [x] Branche `release/0.37.0` créée depuis `origin/develop` au commit `0d1d60592b6c150ca274e8fb5dca52416c02a90f`.
- [x] `develop`, `main`, la CI #487, les tags et la production Cloudflare vérifiés.
- [x] Aucun travail utilisateur local écrasé ou placé dans un stash.
- [x] Aucun tag créé.
- [x] Aucune release GitHub créée.
- [x] Aucun déploiement de production effectué.
- [x] Aucune migration D1 ajoutée ou lancée.

## Données et confidentialité

- [x] Dexie v12 enregistrée après les versions 1 à 11 avec une migration additive.
- [x] Tables historiques et sauvegarde JSON v10 conservées.
- [x] Métadonnées et actifs photo écrits atomiquement.
- [x] Isolation des espaces et nettoyage des lignes orphelines couverts.
- [x] Archive photo distincte de la sauvegarde JSON générale.
- [x] Aucune synchronisation cloud, publication sociale ou analyse IA des photos.
- [x] Aucune modification des formules caloriques.

## Contrôles automatiques

- [x] `git diff --check`.
- [x] Suite Vitest complète.
- [x] Vérification de la migration Dexie v11 vers v12.
- [x] Ordre de tests mélangé.
- [x] Lint et TypeScript.
- [x] Build PWA de production.
- [x] Audits du dépôt.
- [x] `npm audit` exécuté : 5 alertes hautes amont déjà connues, sans correctif compatible ni `--force`.
- [x] Playwright Chromium desktop et mobile.
- [x] Playwright WebKit iPhone 15.
- [x] Mise à jour PWA et conservation des données.

## Release candidate et Preview

- [ ] Branche poussée sur `origin`.
- [ ] Pull request brouillon vers `develop` préparée.
- [ ] Quatre jobs GitHub Actions entièrement verts.
- [ ] Preview Cloudflare Pages isolée de `main` et de la production.
- [ ] URL immuable et SHA déployé vérifiés.
- [ ] Accueil, onboarding, musculation, Amis, photos, comparateur, manifest et service worker vérifiés.

## Publication

- [ ] Validation utilisateur reçue avant toute fusion.
- [ ] Validation utilisateur reçue avant toute création de tag ou release GitHub.
- [ ] Validation utilisateur reçue avant toute publication de production.
