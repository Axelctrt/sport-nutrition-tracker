# Checklist de publication — SportPilot 1.0.0-rc.1

Cette section suit uniquement la préparation de la candidate V1.

## Source et périmètre RC

- [x] `origin/develop` vérifié au commit `3eff34a73cc40d98d3de2ab947ac8b45bfae5f01`.
- [x] Branche `codex/rc-1-0-0-rc1` créée depuis ce commit.
- [x] Issue de préparation #139 créée.
- [x] Aucun travail utilisateur local écrasé ou placé dans un stash.
- [x] Écart réel depuis le commit stable `84fea3d49e68c7d190c00d505502a5c4aa2e672a` audité.
- [x] PR historique #68 identifiée comme non fusionnée et remplacée dans `develop` par #70.

## Version, données et confidentialité RC

- [x] `package.json` et `package-lock.json` alignés sur `1.0.0-rc.1`.
- [x] Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16 conservés.
- [x] Contrat de snapshot social `0.29.0-a3` conservé.
- [x] Aucun fichier Functions, Cloudflare, IA, schéma ou migration modifié.
- [x] Aucune modification des formules caloriques ou des contrats de données.
- [x] #103, #136, #137 et #138 documentées comme dettes séparées.

## Contrôles automatiques RC

- [x] `git diff --check`.
- [ ] Suite Vitest locale : 2 397/2 398 ; seul le faux négatif CRLF Windows
  suivi par #136 échoue, validation Linux attendue en CI.
- [ ] Ordre de tests mélangé : même résultat 2 397/2 398 et même #136.
- [x] Lint et TypeScript ; avertissement Fast Refresh préexistant conservé.
- [x] Build PWA.
- [x] `npm run audit:rc` et tous les audits de release/données/sécurité.
- [x] `npm audit` analysé sans correctif : 9 vulnérabilités hautes documentées,
  dont React Router et Sharp via Quagga 2 ; aucun `npm audit fix --force`.
- [x] Playwright Chromium desktop, 320/360/412 et paysage.
- [ ] Playwright WebKit iPhone 15 : tous les parcours sauf la restitution de
  focus du profil Amis passent sous WebKit Windows ; 3/3 reproductions hors
  diff, validation Linux attendue en CI.
- [x] Mise à jour PWA et conservation des données sur serveur local isolé.
- [ ] CI GitHub Actions complète verte sur le HEAD exact de la PR draft.

## Gates postérieurs — non autorisés à cette étape

- [x] Aucun déploiement Preview Cloudflare effectué.
- [x] Aucun tag créé.
- [x] Aucune release GitHub créée.
- [x] Aucun déploiement de production effectué.
- [ ] Autorisation distincte avant Preview, fusion, `main`, tag, release ou production.

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
