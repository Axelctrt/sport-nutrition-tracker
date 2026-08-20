# Changelog

Ce fichier synthétise les versions publiées. Les notes détaillées versionnées
restent les archives de référence et conservent l’état de préparation de chaque
livraison.

## 1.0.4 — continuité Activities + Goals both en préparation

- Extension de la continuité automatique sûre au domaine logique Activities.
- Planning endurance, tombstones et restaurations Activity inclus dans le même domaine.
- Écritures automatiques strictement directionnelles : `local-only` upload, `cloud-only` download.
- `both` et `unknown` restent sans écriture automatique.
- Résolution Goals `both` exclusivement manuelle, explicite et revalidée avant écriture.
- Journal immuable create/update/delete/restore pour préserver les mutations
  Goals concurrentes, avec ordre HLC calibré sur la session authentifiée.
- Whitelist automatique limitée à Strength + Goals + Weights + Activities.
- CI PR #179 complète 4/4 et CI post-merge develop 4/4.
- Dexie v12 et sauvegarde JSON v10 inchangées ; runtime Dexie Cloud v17 migré
  additivement dans le stockage v16 existant ; aucune migration D1.

Cette entrée prépare `1.0.4` ; Preview immuable, smoke physique, `main`, tag, GitHub Release et production restent des gates distincts.

Voir [`RELEASE-NOTES-1.0.4.md`](RELEASE-NOTES-1.0.4.md).

## 1.0.3 — publiée le 18 août 2026

- Première réconciliation explicite des comptes Goals historiques divergents.
- Signal Goals post-persistance durable pour l’automatisme A → B.
- `unknown` et `both` fail-closed hors parcours explicitement autorisé.
- Détail Objectifs réparé sur `/settings/sync-prototype`.
- Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16 inchangés.
- Aucune migration D1, formule calorique, thème ou extension IA.
- Commit publié : `9c6ea1df7ea3f686020b7b86f49def0ecc85a9cd`.
- Tag : `v1.0.3`.
- GitHub Release : SportPilot 1.0.3.
- Production : `https://sportpilot-pages.pages.dev`.

Voir [`RELEASE-NOTES-1.0.3.md`](RELEASE-NOTES-1.0.3.md).

## 1.0.2 — publiée le 17 août 2026

- Extension de la continuité automatique sûre de Strength vers Goals et Weights.
- Upload automatique uniquement en provenance `local-only`.
- Download automatique uniquement en provenance `cloud-only`.
- Refus de toute écriture automatique en provenance `both` ou `unknown`.
- Préservation des tombstones/suppressions, de l'idempotence et de l'isolation du compte.
- Validation physique A → B de Goals, Weights et non-régression Strength.
- Absence de doublon Weight validée sur deux appareils/profils.
- Versions de données inchangées : Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16.
- Aucune migration D1, formule calorique, thème ou extension IA.
- Commit publié : `6e479170731d689683822374ba7c74fff425730d`.
- Tag : `v1.0.2`.
- GitHub Release : SportPilot 1.0.2.
- Production : `https://sportpilot-pages.pages.dev`.

Voir [`RELEASE-NOTES-1.0.2.md`](RELEASE-NOTES-1.0.2.md).

## 1.0.1 — publiée le 17 août 2026

- Continuité du compte entre appareils renforcée.
- Synchronisation automatique sûre de Strength publiée.
- Primitives `local-only` / `cloud-only` et refus fail-closed de `both` / `unknown`.
- Tombstones, idempotence et isolation du compte préservés.
- Commit publié : `df28f61396160a68d24d110dd0924f491383faae`.
- Tag : `v1.0.1`.
- GitHub Release : SportPilot 1.0.1.
- Production : `https://sportpilot-pages.pages.dev`.
- Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud v16.
- Aucune migration D1.

Voir [`RELEASE-NOTES-1.0.1.md`](RELEASE-NOTES-1.0.1.md).

## 1.0.0 — publiée le 14 août 2026

- Publication stable issue de la PR #167.
- Commit publié : `d3ff60017027295f75b665d7efe2a037db69d69e`.
- Tag annoté : `v1.0.0`.
- Release GitHub : SportPilot 1.0.0.
- Production : `https://sportpilot-pages.pages.dev`.
- Versions de données : Dexie v12, sauvegarde JSON v10 et runtime Dexie Cloud
  v16, sans migration supplémentaire.

Voir [`RELEASE-NOTES-1.0.0.md`](RELEASE-NOTES-1.0.0.md).

## 1.0.0-rc.2 — candidate en préparation le 11 août 2026

- Correction du cold launch PWA hors ligne observé sur RC1.
- Ajout d'une preuve E2E réelle : online, fermeture, nouvelle page offline,
  lecture et écriture locales.
- Préservation du nouveau focus acquis après navigation (#151/#152), tout en
  conservant le transfert vers le contenu principal en l'absence de nouveau
  focus.
- Stabilisation de la preuve WebKit Progress Photos (#149/#150) : le scénario
  conserve l'action clavier réelle `50` → `ArrowRight` → `51` et vérifie le
  focus du slider.
- Préparation d'une nouvelle candidate après le rejet historique de RC1.
- Aucun changement de schéma ou de données : Dexie v12, sauvegarde JSON v10,
  runtime Dexie Cloud v16, registre d'espaces v1 et snapshot social
  `0.29.0-a3`.

Cette entrée n'est pas une publication. Aucune Preview, fusion, modification
CORS/Dexie Cloud, action sur `main`, tag, release ou production n'est incluse.
La production reste en `0.37.0`.

Voir [`RELEASE-NOTES-1.0.0-rc.2.md`](RELEASE-NOTES-1.0.0-rc.2.md).

## 1.0.0-rc.1 — déployée puis rejetée le 11 août 2026

- Convergence mobile/desktop des hubs Sport, Nutrition et Progression.
- Continuité des saisies non enregistrées sur les surfaces critiques.
- Feedbacks, états filtrés, clavier/focus et reduced-motion consolidés.
- Preuves Chromium, WebKit/iPhone, PWA, isolation et continuité renforcées.
- Versions de données inchangées : Dexie v12, sauvegarde JSON v10, runtime
  Dexie Cloud v16 et snapshot social `0.29.0-a3`.

RC1 a été déployée une seule fois depuis
`2fd781087a65e125b0e77edcd53d41fdf82922ed`, puis rejetée après la reproduction
du cold launch PWA #144. Aucun tag, aucune release GitHub et aucune production
n'ont été créés ; la production reste en `0.37.0`.

Voir [`RELEASE-NOTES-1.0.0-rc.1.md`](RELEASE-NOTES-1.0.0-rc.1.md).

## 0.37.0 - publiée le 2 août 2026

- Ajout local et privé des photos de progression.
- Galerie, filtres et comparateur avant/après.
- Archive photo séparée et restauration additive.
- Migration Dexie v12 additive, sans migration D1.
- Ajustements UX validés sur l’Accueil, les Amis et les séances.
- Compatibilité Chromium, WebKit, IndexedDB et PWA renforcée.

Publication :

- PR #21 : livraison de `develop` dans `main` ;
- commit publié : `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- tag annoté : `v0.37.0` ;
- release GitHub stable :
  `https://github.com/Axelctrt/sport-nutrition-tracker/releases/tag/v0.37.0` ;
- production : `https://sportpilot-pages.pages.dev` ;
- migration D1 ajoutée ou exécutée : aucune.

Voir [`RELEASE-NOTES-0.37.0.md`](RELEASE-NOTES-0.37.0.md).

## Versions publiées précédentes

- [`0.36.0`](RELEASE-NOTES-0.36.0.md)
- [`0.35.1`](RELEASE-NOTES-0.35.1.md)
- [`0.35.0`](RELEASE-NOTES-0.35.0.md)
