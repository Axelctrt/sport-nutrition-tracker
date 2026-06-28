# Tableau de bord — Aujourd’hui et à venir

Cette phase ajoute un bloc personnalisable au tableau de bord pour rendre
le planning sportif immédiatement actionnable.

## Contenu

Le bloc réunit :

- les séances de musculation en cours ;
- les séances de musculation encore prévues ;
- les activités d’endurance planifiées mais non réalisées ;
- les séances en retard ;
- les séances prévues aujourd’hui ;
- les séances des sept prochains jours.

Les activités d’endurance déjà rapprochées d’une activité réelle ne sont
plus affichées.

## Raccourcis

- séance de musculation en cours : reprise directe ;
- séance de musculation prévue : ouverture du planning ;
- activité d’endurance : ouverture du formulaire de saisie avec la date et
  le type préremplis ;
- accès global au planning sportif.

## Personnalisation

Le nouveau widget s’appelle :

```text
trainingAgenda
```

Il est :

- visible dans les préréglages équilibré, nutrition et entraînement ;
- placé juste après la séance en cours dans le préréglage entraînement ;
- masqué dans le préréglage essentiel ;
- automatiquement ajouté aux anciennes préférences lors de leur
  normalisation.

## Technique

- aucune nouvelle route ;
- aucune migration Dexie ;
- aucune nouvelle clé locale ;
- aucune dépendance npm ;
- fonctionnement hors connexion ;
- aucune modification du format de sauvegarde.

## Liens ciblés vers la musculation

Une séance de musculation prévue dans le widget utilise désormais un lien
contenant sa date et son identifiant :

```text
/strength/planning?date=AAAA-MM-JJ&session=IDENTIFIANT
```

La page de planning ouvre la semaine correspondante, fait défiler jusqu’à
la carte exacte, lui donne le focus et la met visuellement en évidence.

La création d’une séance de musculation affiche également un toast de
confirmation avec le nom de la séance et sa date, comme pour les activités
d’endurance.

## Affichage compact du tableau de bord

Le widget affiche désormais uniquement les activités prévues aujourd’hui.
Les activités en retard et les jours suivants ne sont plus détaillés sur
le tableau de bord.

Un bouton pleine largeur « Voir les activités à venir » ouvre directement
la zone hebdomadaire du planning.

## Jours repliables

Les jours de musculation et d’endurance sont fermés par défaut. Chaque jour
peut être ouvert indépendamment pour afficher ses séances.

Lorsqu’un lien cible une séance de musculation précise, le bon jour est
ouvert automatiquement avant le défilement et la mise en évidence de la
séance.
