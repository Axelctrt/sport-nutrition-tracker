# Patch SportPilot 0.28.0 F7 — Correctif audit C2 bibliothèque nutritionnelle

Ce correctif aligne `audit:nutrition-library-sync` avec la release stable `0.28.x`.

Fichier modifié :
- `scripts/audit-nutrition-library-sync.mjs`

Ce patch ne modifie pas :
- la base métier Dexie locale, qui reste en v10 ;
- la sauvegarde JSON, qui reste en v9 ;
- le runtime cloud prototype, qui reste en v14.
