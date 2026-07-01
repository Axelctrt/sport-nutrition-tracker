# SportPilot 0.20.1

## Correctif de production

- correction d’une collision Dexie sur l’index unique `dailyTargets.date` lors de la synchronisation nutritionnelle ;
- fusion des objectifs quotidiens par date, même lorsque des installations historiques utilisent des identifiants différents ;
- normalisation vers l’identifiant déterministe `daily-target:<date>` avant l’écriture locale et cloud ;
- application de la même protection aux statuts journaliers avec `journal-status:<date>` ;
- conservation de la valeur la plus récente selon `updatedAt`, puis départage déterministe en cas d’égalité ;
- aucune suppression de repas, d’entrées, de bilans ou d’ajustements ;
- aucune migration de la base métier, du schéma cloud ou du format de sauvegarde.

## Validation attendue

- synchronisation du journal nutritionnel sans `ConstraintError` ;
- synchronisation du suivi nutritionnel sans `dailyTargets.bulkPut()` en erreur ;
- analyse C1 et C3 à `0 différence` après réparation ;
- `npm run check` ;
- validation sur iPhone 15 sous iOS 26.
