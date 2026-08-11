# Changelog

Ce fichier synthétise les versions publiées. Les notes détaillées versionnées
restent les archives de référence et conservent l’état de préparation de chaque
livraison.

## 1.0.0-rc.2 — candidate en préparation le 11 août 2026

- Correction du cold launch PWA hors ligne observé sur RC1.
- Ajout d'une preuve E2E réelle : online, fermeture, nouvelle page offline,
  lecture et écriture locales.
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
