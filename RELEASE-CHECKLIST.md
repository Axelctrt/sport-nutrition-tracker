# Checklist de publication — SportPilot 1.0.0-rc.2

Cette section suit la préparation de RC2. Le futur SHA gelé, l'URL immuable et
les preuves de recette seront consignés principalement dans l'issue #147 afin
de ne pas modifier le dépôt après gel uniquement pour cocher des cases.

## Acquis avant gel RC2

- [x] Readiness V1, lots de convergence et preuve transverse terminés ; #63
  fermée en `completed`.
- [x] RC1 déployée une seule fois depuis
  `2fd781087a65e125b0e77edcd53d41fdf82922ed`, puis rejetée dans #142.
- [x] Blocker cold launch PWA suivi par #144 et corrigé par la PR #145.
- [x] Correctif PWA intégré dans `develop` au squash
  `465f927c6ed17dd7537bfa83d6fe11e9329825ea`.
- [x] CI du correctif PWA, run `31503922947` : 4/4 jobs applicatifs verts.
- [x] Cold launch réel désormais couvert par un E2E online → fermeture →
  nouvelle page offline ; le test historique update/rétention reste couvert.
- [x] Blocker produit de navigation/focus #151 corrigé par #152 et intégré au
  squash `2d87ef9ddbf1d667c54229093b0895e948e6c73d` ; CI `31587850131`, 4/4
  jobs applicatifs verts.
- [x] Stabilisation test-only WebKit/Progress Photos #149/#150 intégrée au
  squash `e1921f5807292f8236e70c1688d8d9f02c22bdf0` ; le contrat utilisateur
  reste `50` → `ArrowRight` → `51` avec vérification explicite du focus ; CI
  `31593091148`, 4/4 jobs applicatifs verts.
- [x] Base technique finale avant gel RC2 :
  `develop@e1921f5807292f8236e70c1688d8d9f02c22bdf0`.
- [x] Dexie v12, sauvegarde JSON v10, runtime Dexie Cloud v16, registre
  d'espaces v1 et snapshot social `0.29.0-a3` inchangés.
- [x] #141 reste le gate de sécurité avant toute stable `1.0.0`.
- [x] #103, #136, #137 et #138 restent des dettes séparées.
- [x] #146 qualifie une configuration Preview manquante et reste un gate de
  recette RC2, sans défaut d'URL produit démontré.

## Préparation documentaire et technique RC2

- [x] Journal RC2 #147 créé.
- [x] Branche `codex/rc-1-0-0-rc2` créée depuis le SHA `develop` vérifié.
- [x] Version active `1.0.0-rc.2` alignée dans `package.json`, le lockfile, les
  contrats de readiness et la documentation courante.
- [x] Notes RC2 créées sans réécrire l'archive RC1.
- [x] Aucun code métier, dépendance, schéma, migration, Function ou contrat de
  données modifié.
- [x] Aucun travail utilisateur local écrasé ou placé dans un stash.
- [x] Suite Vitest complète et ordre mélangé.
- [x] Lint, TypeScript et Build PWA.
- [x] `npm run audit:rc`, audits release, consolidation, repository et
  readiness pertinents.
- [x] Playwright Chromium et suite PWA complète.
- [x] Playwright WebKit/iPhone 15 attendu dans la CI GitHub complète.
- [x] Le faux négatif Windows/CRLF reste suivi par #136 ; il n'est pas présenté
  comme corrigé par cette candidate.

## À prouver sur RC2

- [ ] SHA gelé exact après fusion explicitement autorisée.
- [ ] Preview immuable créée après autorisation distincte.
- [ ] Intégrité entre build validé, SHA et deployment.
- [ ] Responsive 320/360/412 et desktop.
- [ ] Chromium.
- [ ] WebKit/iPhone.
- [ ] Cold launch offline.
- [ ] Mise à jour PWA et rétention.
- [ ] Continuité locale en lecture et écriture.
- [ ] Compte et synchronisation.
- [ ] Isolation multi-compte.
- [ ] Origine immuable ajoutée explicitement puis preflight CORS validé selon
  #146.
- [ ] Photo Nutrition et fallback manuel selon #103.

## Stable interdite

- [x] Aucun tag créé.
- [x] Aucune release GitHub créée.
- [x] Aucun déploiement de production effectué.
- [x] `main` et la production restent inchangés sur SportPilot `0.37.0`.
- [ ] #141 traitée ou explicitement acceptée avant toute stable `1.0.0`.
- [ ] Autorisations distinctes avant fusion RC2, Preview, `main`, tag, release
  ou production.

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
