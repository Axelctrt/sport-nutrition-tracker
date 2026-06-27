# Accomplissement et historique des missions hebdomadaires

Cette phase complète les missions hebdomadaires avec :

- une célébration unique lorsque les cinq missions sont terminées ;
- un historique des semaines accomplies ;
- une série hebdomadaire actuelle ;
- un meilleur record de semaines consécutives.

## Persistance

L'historique est conservé dans `localStorage` sous la clé
`sport-pilot.weekly-mission-history`.

Une semaine terminée n'est enregistrée qu'une seule fois. Le rechargement de
l'application ne répète ni l'enregistrement ni la notification.

## Série hebdomadaire

La série reste active lorsque la dernière semaine accomplie est :

- la semaine courante ;
- ou la semaine précédente, tant que la semaine courante n'est pas terminée.

## Compatibilité

- aucune nouvelle table Dexie ;
- aucune migration ;
- aucune dépendance npm ;
- aucun changement du format de sauvegarde JSON ;
- aucun changement des cinq objectifs hebdomadaires.
