# SportPilot 0.14.0-alpha.5 — saisie des séries

Branche obligatoire : `feature/strength-sets`

Cette étape ajoute la saisie détaillée des séries dans les séances en cours :

- ajout d’une série préremplie depuis l’objectif de l’exercice ou la série précédente ;
- répétitions, charge, RPE, type et notes ;
- validation et réouverture ;
- enregistrement sans validation ;
- duplication rapide ;
- suppression et renumérotation ;
- progression visuelle par rapport aux séries prévues ;
- lecture seule dans les séances terminées ;
- persistance complète dans IndexedDB.

Aucune migration Dexie supplémentaire n’est nécessaire.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.5` ;
- 71 fichiers de tests ;
- 277 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
