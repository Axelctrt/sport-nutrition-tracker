# Missions hebdomadaires

Cette phase ajoute cinq missions renouvelées automatiquement chaque lundi et
affichées directement sur le tableau de bord.

## Missions

- bouger pendant 3 journées distinctes ;
- enregistrer 2 activités d'endurance ;
- terminer 2 séances de musculation ;
- compléter le journal nutritionnel pendant 5 journées ;
- enregistrer au moins une journée de pesée.

## Calcul

La semaine commence le lundi et se termine le dimanche.

Les données sont calculées depuis les tables existantes :

- `activities` ;
- `workoutSessions` ;
- `dailyJournalStatuses` ;
- `weights`.

Plusieurs données identiques le même jour ne comptent qu'une seule fois pour
les missions exprimées en journées.

## Compatibilité

- aucune nouvelle table Dexie ;
- aucune migration ;
- aucune dépendance npm ;
- aucune donnée supplémentaire persistée ;
- aucun changement du format de sauvegarde.
