# SportPilot 0.14.0-alpha.3 — séances modèles

Branche obligatoire : `feature/workout-templates`

Cette étape ajoute les séances modèles du carnet de musculation :

- création, modification, duplication, archivage et réactivation ;
- choix des exercices depuis le catalogue local ;
- réorganisation accessible des exercices ;
- séries prévues, répétitions minimales et maximales ;
- charge cible, incrément, repos et limite RPE facultative ;
- notes générales et notes par exercice ;
- stockage transactionnel dans `workoutTemplates` et `workoutTemplateExercises` ;
- conservation des identifiants stables lors des modifications ;
- fonctionnement hors connexion et sauvegarde JSON déjà couverte par le schéma version 2.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.3` ;
- 66 fichiers de tests ;
- 259 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
