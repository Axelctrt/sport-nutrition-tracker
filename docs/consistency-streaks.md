# Séries de régularité

Cette phase ajoute un résumé de régularité dans les paramètres avancés.

## Sources prises en compte

Une journée est active lorsqu'elle contient au moins :

- une activité ;
- une séance de musculation terminée ;
- une pesée.

Plusieurs enregistrements le même jour ne comptent que pour une seule journée active.

## Indicateurs

- série active actuelle ;
- meilleure série historique ;
- nombre de jours actifs sur les 7 derniers jours ;
- nombre de jours actifs sur les 30 derniers jours ;
- dernière journée active connue.

La série actuelle reste active lorsque la dernière journée enregistrée est aujourd'hui ou hier.
Une interruption de deux jours ou plus remet la série actuelle à zéro sans effacer le record historique.

## Compatibilité

- aucune nouvelle table Dexie ;
- aucune migration ;
- aucune dépendance npm ;
- aucune écriture supplémentaire ;
- aucun changement du format de sauvegarde.
