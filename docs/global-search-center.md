# Centre de recherche globale

Cette phase ajoute une recherche transversale entièrement locale dans
SportPilot.

## Domaines indexés

Le centre retrouve :

- les activités d'endurance et de musculation ;
- les aliments locaux non archivés ;
- les recettes ;
- les repas favoris ;
- les séances de musculation planifiées, en cours ou terminées ;
- les séances modèles non archivées ;
- les exercices non archivés ;
- les pesées.

## Navigation directe

Chaque résultat ouvre l'écran le plus précis disponible :

- éditeur de l'activité ;
- fiche de l'aliment ;
- éditeur de la recette ;
- page des repas favoris ;
- séance de musculation ;
- éditeur de la séance modèle ;
- éditeur de l'exercice ;
- page du poids positionnée sur la date concernée.

## Qualité de recherche

La recherche :

- ignore les majuscules ;
- ignore les accents ;
- accepte plusieurs mots ;
- recherche dans le titre, le résumé et les mots-clés métier ;
- classe d'abord les correspondances exactes et les débuts de titre ;
- limite l'affichage à 80 résultats.

## Filtres

Des filtres par domaine apparaissent uniquement lorsqu'ils ont des résultats.
Le nombre de correspondances est affiché sur chaque filtre.

## Recherches récentes

Les huit dernières recherches sont conservées dans `localStorage` :

- elles restent uniquement sur l'appareil ;
- elles sont dédupliquées ;
- elles peuvent être effacées depuis la page ;
- elles ne font pas partie de la base sportive.

## Accès rapide

La page est accessible :

- depuis la navigation desktop ;
- depuis le menu mobile **Suivi et décisions** ;
- avec `Ctrl + K` sous Windows/Linux ;
- avec `⌘ + K` sur macOS ;
- avec `/` lorsqu'aucun champ de saisie n'est actif.

## Confidentialité et hors connexion

L'index est construit à partir des tables IndexedDB déjà présentes. Aucune
requête de recherche ni donnée personnelle n'est transmise à un serveur.

## Versions techniques

- Dexie : version 4 inchangée ;
- sauvegarde complète JSON : version 3 inchangée ;
- archive de corbeille : version 1 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
