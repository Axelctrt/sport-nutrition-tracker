# Rappel global de sauvegarde

Cette phase rend le rappel de sauvegarde visible depuis l'ensemble des écrans
principaux de SportPilot.

## Fonctionnement

Le réglage existant reste inchangé :

- désactivé ;
- tous les 7 jours ;
- tous les 14 jours ;
- tous les 30 jours.

Lorsque le délai est dépassé, un toast discret affiche :

- le titre **Sauvegarde recommandée** ;
- l'ancienneté de la dernière sauvegarde ;
- un bouton **Sauvegarder** ouvrant directement la page dédiée.

## Limitation des répétitions

Le rappel est reporté pendant 24 heures dès son affichage. Ce report est
conservé dans `localStorage` et reste lié à la date de référence de la dernière
sauvegarde.

Une nouvelle sauvegarde change la date de référence et remet naturellement le
cycle à zéro.

## Page Sauvegarde

Aucun toast global n'est affiché lorsque l'utilisateur se trouve déjà sur la
page Sauvegarde. L'encart existant continue d'y présenter l'état détaillé du
rappel.

## Robustesse

L'échec du chargement des paramètres ou l'indisponibilité de
`localStorage` ne bloque jamais l'application.

## Versions

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
