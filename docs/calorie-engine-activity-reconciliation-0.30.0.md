# SportPilot 0.30.0 — Réconciliation explicite prévu/réalisé

## Objectif

Remplacer le rapprochement transitoire par date et type par une liaison persistante, univoque et synchronisable entre une séance planifiée et l’activité réellement enregistrée.

## Contrat de liaison

Une activité réelle peut contenir une référence `plannedActivity` composée de :

- `source` : `strengthSession` ou `endurancePlanning` ;
- `sourceId` : identifiant stable de la séance prévue.

La source planifiée conserve réciproquement `completedActivityId` lorsque sa réalisation passe par une activité simplifiée. Une séance détaillée de musculation utilise déjà le même `WorkoutSession` du planning jusqu’à sa réalisation et ne crée donc pas de doublon visible.

## Règles

1. Une séance planifiée ne peut être associée qu’à une activité réelle.
2. Une activité réelle ne remplace la prévision que si la liaison est explicite.
3. Deux activités du même type le même jour restent indépendantes sans identifiant commun.
4. Une activité créée depuis le planning est préassociée avec l’identifiant de la séance.
5. Une activité créée librement peut rester imprévue ou sélectionner une séance compatible.
6. Modifier la date de l’activité ne supprime pas automatiquement sa liaison.
7. Modifier ou retirer la liaison restaure la séance précédente et recalcule les dates concernées.
8. Supprimer l’activité réelle restaure la prévision.
9. Supprimer une séance prévue conserve l’activité réelle mais retire sa référence devenue invalide.
10. Les liens sont conservés par les sauvegardes et les synchronisations d’activités et de musculation.

## Compatibilité

Les champs sont optionnels. Les activités et séances historiques sans liaison restent valides et sont considérées comme indépendantes. Aucune migration Dexie ou D1 n’est nécessaire.

## Limite volontaire

La réparation automatique de données partiellement synchronisées ou historiquement incohérentes relève de la phase U2B.5 consacrée à l’historique et à la synchronisation avancée.
