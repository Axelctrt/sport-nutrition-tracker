# SportPilot 0.14.0-alpha.2 — catalogue d’exercices

Branche obligatoire : `feature/strength-exercises`

Cette étape ajoute le catalogue fonctionnel d’exercices de musculation :

- 43 exercices système intégrés et disponibles hors connexion ;
- recherche et filtres par muscle, matériel et origine ;
- création, modification, archivage et réactivation des exercices personnels ;
- duplication des exercices système et personnels ;
- nouvelle entrée « Exercices » dans la navigation ordinateur ;
- accès au catalogue depuis le journal des activités ;
- catalogue réinstallé automatiquement sans écraser les données existantes ;
- sauvegarde et restauration compatibles avec les exercices système et personnels.

## Validation

```powershell
npm install
npm run check
```

Résultats attendus :

- version `0.14.0-alpha.2` ;
- 63 fichiers de tests ;
- 249 tests ;
- lint sans erreur ni avertissement ;
- build Vite/PWA réussi ;
- audit MVP réussi.
