# Checklist de publication — SportPilot 1.0.0-rc.1

Cette section suit le gel documentaire de la candidate V1 avant sa recette
sur une Preview immuable. L'URL et le SHA de cette future Preview seront
consignés principalement dans l'issue #142 afin de ne pas modifier le dépôt
après gel uniquement pour cocher des cases.

## Preuves acquises avant le gel

- [x] Préparation #140 fusionnée dans `develop`.
- [x] Squash #140 et `origin/develop` vérifiés au commit
  `06a64b76f3b632db5e841a486b813983ce811de0`.
- [x] Version `1.0.0-rc.1` intégrée dans `develop`, avec `package.json` et
  `package-lock.json` alignés.
- [x] Issue de préparation #139 fermée en `completed`.
- [x] Issue de gel et de recette #142 créée et conservée ouverte.
- [x] Branche `codex/rc-1-0-0-rc1` créée pour la préparation historique #140 ;
  elle n'est plus la source candidate courante.
- [x] Branche de gel `codex/rc1-freeze-metadata` créée depuis le squash #140.
- [x] Aucun travail utilisateur local écrasé ou placé dans un stash.
- [x] Écart réel depuis le commit stable `84fea3d49e68c7d190c00d505502a5c4aa2e672a` audité.
- [x] PR historique #68 identifiée comme non fusionnée et remplacée dans `develop` par #70.

## Données, confidentialité et sécurité préservées

- [x] Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16 conservés.
- [x] Contrat de snapshot social `0.29.0-a3` conservé.
- [x] Aucun fichier Functions, Cloudflare, IA, schéma ou migration modifié.
- [x] Aucune modification des formules caloriques ou des contrats de données.
- [x] #103, #136, #137 et #138 documentées comme dettes séparées.
- [x] #141 créée après qualification de 9 vulnérabilités hautes et 0 critique,
  sans mise à jour de dépendance ni `npm audit fix`.
- [x] La qualification #141 autorise la recette RC ; #141 reste un gate avant
  toute publication stable `1.0.0`.

## Contrôles automatiques déjà acquis

- [x] `git diff --check`.
- [x] CI GitHub Actions finale de #140, run `31472639144` : 4/4 jobs verts.
- [x] Suite Vitest complète et ordre mélangé validés sous Linux en CI.
- [x] Lint et TypeScript ; avertissement Fast Refresh préexistant conservé.
- [x] Build PWA.
- [x] `npm run audit:rc` et tous les audits de release/données/sécurité.
- [x] `npm audit` analysé sans correctif : 9 vulnérabilités hautes documentées,
  dont React Router et Sharp via Quagga 2 ; aucun `npm audit fix --force`.
- [x] Playwright Chromium desktop, 320/360/412 et paysage.
- [x] Playwright Linux Chromium et WebKit/iPhone 15 vert en CI.
- [x] Mise à jour PWA et rétention des données vertes.
- [x] Correction SemVer intégrée : les prereleases sont comparées correctement
  relativement aux floors historiques.
- [x] Le faux négatif Windows/CRLF reste suivi par #136 ; il n'est pas présenté
  comme corrigé par cette candidate.

## Recette Preview restant à réaliser

- [x] Aucun déploiement Preview Cloudflare effectué.
- [ ] Autorisation distincte avant toute création de Preview immuable.
- [ ] SHA final de `develop` après fusion du gel et URL immuable consignés dans
  l'issue #142.
- [ ] Recette navigateur, responsive, PWA/rétention et continuité des données
  exécutée sur cette Preview.

## Publication stable encore interdite

- [x] Aucun tag créé.
- [x] Aucune release GitHub créée.
- [x] Aucun déploiement de production effectué.
- [x] `main` et la production restent inchangés sur SportPilot `0.37.0`.
- [ ] #141 traitée ou explicitement acceptée avant toute stable `1.0.0`.
- [ ] Autorisations distinctes avant fusion du gel, `main`, tag, release ou
  production.

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
