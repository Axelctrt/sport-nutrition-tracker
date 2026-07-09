# SportPilot 0.30.0 — activités planifiées et séances détaillées

## Objectif

Cette phase ajoute les dépenses sportives prévues à la cible calorique quotidienne avant leur réalisation, tout en évitant de les additionner une seconde fois lorsqu'une activité réelle correspondante existe.

## Sources prises en charge

- séances d'endurance planifiées ;
- séances de musculation planifiées depuis un modèle ;
- séances détaillées de musculation terminées, y compris les séances libres.

## Musculation

Une séance planifiée enregistre une durée cible et un type interne :

- classique / hypertrophie : 3,5 MET ;
- force / mouvements lourds : 5,0 MET ;
- circuit / supersets denses : 5,8 MET ;
- très intense : 6,0 MET.

Le MET reste un paramètre de calcul interne. Les calories sont calculées avec la formule nette du moteur v2. Une séance détaillée terminée utilise sa durée réelle. Une séance libre terminée utilise le profil classique par défaut.

## Endurance

- la course utilise en priorité la distance prévue et le coefficient kcal/kg/km ;
- les autres activités utilisent la durée, le type et l'intensité ;
- aucune estimation n'est produite si les données disponibles sont insuffisantes.

## Remplacement par le réel

Sur une même date, une activité réelle du même type remplace une seule estimation planifiée correspondante. Cette règle transitoire empêche le double comptage avant l'ajout des liens explicites prévu/réalisé de la phase U2B.4.

## Temporalité

- ajout ou modification : recalcul de la date concernée ;
- déplacement : recalcul de l'ancienne et de la nouvelle date ;
- annulation : retrait de l'estimation ;
- répétition d'une semaine : recalcul des dates futures créées ;
- fin ou abandon d'une séance détaillée : recalcul de sa date réelle ;
- les dates antérieures à aujourd'hui ne sont pas réécrites par ces actions.

Le recalcul post-action est non bloquant : une indisponibilité temporaire du profil n'annule pas une planification ou une séance déjà enregistrée. La cible sera recalculée au prochain accès valide.

## Snapshots

Les cibles quotidiennes peuvent conserver :

- la source et l'identifiant de la séance ;
- le type d'activité ;
- la durée, la distance ou le MET utilisés ;
- le poids hebdomadaire de référence ;
- les calories estimées ;
- la version du calcul.

Les champs sont optionnels pour préserver les sauvegardes et données historiques.

## Limites conservées pour U2B.4

- pas encore d'identifiant explicite entre une activité générique et sa séance planifiée ;
- rapprochement transitoire par date et type d'activité ;
- pas de conversion silencieuse des anciennes séances planifiées sans durée ;
- la synchronisation et l'historique complet de la réconciliation seront renforcés dans les phases suivantes.
