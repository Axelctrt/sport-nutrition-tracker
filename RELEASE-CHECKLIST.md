# Checklist de publication — SportPilot 1.0.2

Base fonctionnelle qualifiée :
`develop@37cae57dc779d6410f35a177403706be0a3eb382`.

Tree qualifié :
`7cd38a8364da5eb31eac91253ebdc789d37b0c0a`.

Branche de préparation : `release/1.0.2`.

## Périmètre

- [x] PR #173 fusionnée dans `develop`.
- [x] Continuité automatique sûre étendue à Goals et Weights.
- [x] Whitelist automatique limitée à Strength + Goals + Weights.
- [x] Provenances `both` et `unknown` fail-closed.
- [x] Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16 inchangés.
- [x] Aucune migration D1.
- [x] Aucune modification des formules calories/macros.
- [x] Aucun thème modifié.
- [x] Aucun élargissement IA.

## Qualification fonctionnelle acquise

- [x] Preview immuable : `https://3288522c.sportpilot-pages.pages.dev`.
- [x] Deployment : `3288522c-6c7f-45ce-b1c3-5294736c2af1`.
- [x] Whitelist Dexie de l'origine immuable.
- [x] Preflight CORS positif.
- [x] Alias de branche non autorisé.
- [x] Goals A → B sans synchronisation manuelle.
- [x] Goals suppression A → B.
- [x] Weights création A → B visible dans l'UI.
- [x] Weights mise à jour A → B sans doublon.
- [x] Weights suppression A → B.
- [x] Strength A → B non-régression.
- [x] Isolation inter-compte.

## Gates de préparation 1.0.2

- [ ] `npm ci`.
- [ ] `git diff --check`.
- [ ] Suite Vitest complète.
- [ ] Lint.
- [ ] Build PWA.
- [ ] Audit de consolidation 1.0.2.
- [ ] Audit P0 de continuité.
- [ ] npm audit requalifié sans `--force`.
- [ ] CI GitHub Actions complète.
- [ ] Stabilité d'ordre en CI Linux.
- [ ] Playwright WebKit iPhone 15 et Chromium en CI Linux.
- [ ] PWA update et conservation des données en CI Linux.

Le faux négatif Windows/CRLF #136 reste hors périmètre : la CI Linux officielle
reste le gate complet pour les contrôles sensibles aux fins de ligne.

## Publication

- [ ] Fusion de la préparation `release/1.0.2 → develop`.
- [ ] Contrôle du diff de préparation comme strictement non fonctionnel.
- [ ] Preview Cloudflare Pages Direct Upload du SHA préparé exact.
- [ ] CORS Dexie Cloud vérifié pour l'origine immuable finale.
- [ ] PR `develop → main`.
- [ ] CI de `main`.
- [ ] Tag `v1.0.2`.
- [ ] GitHub Release SportPilot 1.0.2.
- [ ] Production Pages du SHA publié.
- [ ] Contrôles post-déploiement.
- [x] Aucun tag créé par la préparation.
- [x] Aucune migration D1 prévue.

#141 et #146 restent terminées. #162 suit le résiduel Quagga/Sharp accepté
pour V1. #138 reste la dette distincte des Workers Builds Cloudflare.

## Archive 1.0.1 — publiée le 17 août 2026

- PR de publication : #172.
- Commit publié : `df28f61396160a68d24d110dd0924f491383faae`.
- Tag : `v1.0.1`.
- GitHub Release : SportPilot 1.0.1.
- Production : `https://sportpilot-pages.pages.dev`.
- Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16.
- Aucune migration D1.

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
