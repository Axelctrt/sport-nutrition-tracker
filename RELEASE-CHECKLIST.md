# Checklist de publication — SportPilot 1.0.1

Base P0 : `develop@bec369ff7960dc897f7f34db42a6d8253a48ed36`.
Branche de préparation : `release/1.0.1`.

## Périmètre

- [x] P0 S0→S5 fusionné via #169.
- [x] Correction fail-closed Strength intégrée.
- [x] Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16 inchangés.
- [x] Aucune formule calorique, aucun thème et aucun élargissement IA.
- [x] Synchronisation automatique directionnelle limitée à Strength.

## Gates de préparation

- [ ] `npm ci`.
- [ ] `git diff --check`.
- [ ] Lint + tests readiness/P0 + build.
- [ ] Audits release/production/repository et P0.
- [ ] npm audit requalifié sans `--force`.
- [ ] CI GitHub Actions complète.
- [ ] Stabilité d'ordre en CI Linux.
- [ ] Playwright WebKit iPhone 15 et Chromium en CI Linux.
- [ ] PWA update et conservation des données en CI Linux.

Le faux négatif Windows/CRLF #136 reste hors périmètre de cette maintenance :
le script local ne revendique donc pas `release:verify` ou
`test:stability` complets comme verts sous Windows. La CI Linux officielle
est le gate complet.

## Publication

- [ ] Preview Cloudflare Pages Direct Upload du SHA exact.
- [ ] Smoke A → B sans action manuelle « Synchroniser ».
- [ ] PR `develop → main`.
- [ ] CI de `main`.
- [ ] Tag annoté `v1.0.1`.
- [ ] GitHub Release SportPilot 1.0.1.
- [ ] Production Pages et contrôles post-déploiement.
- [x] Aucun tag créé par la préparation.
- [x] Aucune migration D1 prévue.

#141 et #146 restent terminées. #162 suit le résiduel Quagga/Sharp accepté
pour V1. #138 reste la dette distincte des Workers Builds Cloudflare.

## Archive RC1 — rejetée

- RC1 : `1.0.0-rc.1`.
- SHA : `2fd781087a65e125b0e77edcd53d41fdf82922ed`.
- Deployment unique : `64efefef-d4c5-4f6a-a98e-c04ca65bc0da`.
- Verdict : **REJETÉE / BLOQUÉE** dans #142.
- Cause : cold launch PWA hors ligne, #144.
- Correctif ultérieur : PR #145.
- Aucune seconde Preview RC1 ; l'archive complète reste dans #142 et
  `RELEASE-NOTES-1.0.0-rc.1.md`.

---

# Archive de publication — SportPilot 0.37.0

Cette checklist conserve les preuves de préparation de la candidate et
enregistre séparément l’état final publié.

## Préparation Git historique

- [x] Branche `release/0.37.0` créée depuis `origin/develop` au commit `0d1d60592b6c150ca274e8fb5dca52416c02a90f`.
- [x] `develop`, `main`, les contrôles CI, les tags et la production Cloudflare vérifiés.
- [x] Aucun travail utilisateur local écrasé ou placé dans un stash.
- [x] Aucun tag créé pendant la préparation de la candidate.
- [x] Aucune release GitHub créée pendant la préparation de la candidate.
- [x] Aucun déploiement de production effectué pendant la préparation de la candidate.
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

## Publication finale

- [x] PR #21 fusionnée de `develop` vers `main`.
- [x] `main` publié au commit `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- [x] CI de release #489, #490 et #491 entièrement vertes.
- [x] Tag annoté `v0.37.0` créé sur le commit publié.
- [x] Tag `v0.37.0` poussé sur le dépôt distant.
- [x] Release GitHub 0.37.0 publiée, non draft et non prerelease.
- [x] Production `https://sportpilot-pages.pages.dev` validée en version `0.37.0`.
- [x] Déploiement immuable `https://dcbccc7e.sportpilot-pages.pages.dev` conservé.
- [x] SHA déployé identique à `main` et au tag : `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- [x] Aucune migration D1 exécutée.
