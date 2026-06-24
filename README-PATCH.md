# SportPilot 0.14.0-alpha.1 — socle de données musculation

Branche obligatoire : `feature/strength-data-model`

Cette étape ajoute uniquement l’infrastructure de données du carnet de musculation :

- modèles TypeScript des exercices, séances modèles, séances réalisées, séries et suggestions ;
- sept nouvelles tables Dexie ;
- migration du schéma IndexedDB version 1 vers la version 2 ;
- conservation non destructive des anciennes activités de musculation ;
- sauvegarde JSON version 2 ;
- migration automatique des sauvegardes version 1 ;
- tests de migration IndexedDB et d’export/import.

Aucun écran de musculation détaillé n’est encore ajouté dans cette étape.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.1` ;
- 59 fichiers de tests ;
- 238 tests ;
- lint sans erreur ;
- build Vite/PWA réussi ;
- audit MVP réussi.
