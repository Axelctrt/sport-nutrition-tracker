# Planning sportif unifié

Cette phase enrichit le planning hebdomadaire existant sans remplacer le
fonctionnement de la musculation.

## Activités planifiables

- course ;
- natation ;
- vélo ;
- marche ;
- autre cardio.

Chaque activité prévue peut contenir :

- une date ;
- une intensité ;
- une durée cible ;
- une distance cible adaptée au sport ;
- un nom ;
- une note.

## Rapprochement automatique

Une activité réelle est rapprochée d’une activité prévue lorsque :

- la date est identique ;
- le type de sport est identique ;
- l’activité réelle n’a pas déjà été utilisée pour une autre séance prévue.

Le planning n’invente aucune charge physiologique et ne modifie aucune
activité enregistrée.

## Statuts

Les activités d’endurance peuvent être :

- prévues ;
- réalisées automatiquement par rapprochement ;
- non réalisées.

Une activité prévue peut être reportée, réactivée ou supprimée.

## Musculation

Le planning de musculation existant reste inchangé :

- planification depuis un modèle ;
- démarrage ;
- report ;
- séance terminée, abandonnée ou non réalisée.

La même page affiche désormais les deux domaines.

## Persistance

Le planning d’endurance utilise la clé locale versionnée :

```text
sportpilot:endurance-planning:v1
```

Cet état est inclus dans les sauvegardes JSON locales avec les objectifs,
récompenses, thèmes et missions.

Les anciennes sauvegardes qui ne contiennent pas le planning restent
compatibles et ne suppriment pas le planning local existant.

## Technique

- route existante conservée : `#/strength/planning` ;
- aucune nouvelle table Dexie ;
- aucune migration ;
- aucune dépendance npm ;
- fonctionnement hors connexion ;
- aucune transmission serveur.
