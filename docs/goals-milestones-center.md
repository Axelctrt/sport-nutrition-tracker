# Centre d’objectifs et jalons

Cette phase ajoute un espace transversal permettant de créer et suivre des
objectifs mesurables à partir des données déjà enregistrées dans SportPilot.

## Métriques disponibles

- poids cible ;
- nombre cumulé de pas ;
- minutes cumulées d’activité ;
- distance cumulée en course ;
- distance cumulée en natation ;
- distance cumulée à vélo ;
- séances de musculation terminées ;
- régularité des pesées.

## Calcul automatique

La progression est recalculée depuis la date de départ de chaque objectif.

Les données sources restent celles des modules existants :

- pesées ;
- pas quotidiens ;
- activités ;
- séances de musculation.

Aucune valeur sportive n’est dupliquée dans l’objectif.

## Jalons

Les jalons suivants sont attribués automatiquement :

- 25 % ;
- 50 % ;
- 75 % ;
- 100 %.

Un objectif actif qui atteint 100 % passe automatiquement au statut
`completed`.

## Échéance et rythme

Une échéance facultative permet d’afficher :

- le nombre de jours restants ;
- la quantité encore nécessaire ;
- le rythme quotidien moyen à maintenir ;
- un avertissement si l’échéance est dépassée.

## Statuts

Un objectif peut être :

- actif ;
- en pause ;
- atteint ;
- archivé.

Il peut également être modifié ou supprimé sans toucher aux données utilisées
pour calculer sa progression.

## Persistance et sauvegardes

Les objectifs utilisent un état local versionné :

```text
sportpilot:goals:v1
```

Cet état est inclus dans la partie locale de la sauvegarde JSON avec les
récompenses et thèmes.

Les anciennes sauvegardes sans objectifs restent compatibles et ne suppriment
pas les objectifs déjà présents lors d’une restauration.

## Navigation

Le centre est disponible sur :

```text
/goals
```

Il est présent :

- dans la navigation principale ;
- dans la rubrique mobile « Suivi et décisions ».

## Technique

- Dexie reste en version 4 ;
- sauvegarde JSON inchangée en version ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm ;
- fonctionnement hors connexion ;
- aucune transmission serveur.
