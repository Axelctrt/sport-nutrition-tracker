# Résumé des récompenses sur le tableau de bord

Le tableau de bord affiche désormais un résumé compact des accomplissements : nombre de badges gagnés, prochain objectif, progression et deux derniers badges obtenus.

Le composant observe les tables `activities`, `workoutSessions` et `weights` avec `Dexie.liveQuery`. Il se met donc à jour après une activité, une séance terminée, une pesée, une restauration ou une réinitialisation sélective.

Le chargement utilisé par ce résumé est non mutatif : il calcule l'état courant sans écrire de badge dans `localStorage`. La persistance et les notifications de déblocage restent gérées par le système global déjà présent.

Aucune table, migration Dexie, dépendance npm ou modification du format de sauvegarde n'est ajoutée.
