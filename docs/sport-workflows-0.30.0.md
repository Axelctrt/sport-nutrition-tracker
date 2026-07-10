# U14 — Parcours musculation et cardio (0.30.0)

## Objectif

Rendre les parcours Sport plus rapides et plus lisibles pendant l'exécution réelle d'une séance, en particulier sur mobile.

## Musculation détaillée

- affichage d'une progression globale de la séance ;
- nombre de séries et d'exercices terminés ;
- mise en avant de l'exercice et de la série à réaliser ensuite ;
- bouton de reprise qui ramène directement au prochain élément ;
- séries validées compactées pour réduire le défilement ;
- réouverture explicite d'une série terminée pour la modifier ;
- avertissement précis avant de terminer une séance incomplète ;
- progression visible dans la barre d'actions persistante.

Les calculs de volume, le minuteur de repos, les records personnels, les repositories et la clôture de séance existants sont conservés.

## Cardio et activités simples

Le formulaire d'activité propose désormais :

- des raccourcis de durée : 20, 30, 45, 60 et 90 minutes ;
- un choix direct de l'intensité : légère, modérée ou élevée ;
- la saisie manuelle de la durée toujours disponible ;
- les champs spécifiques à la course, la natation, le vélo, la marche et au cardio inchangés.

## Accessibilité et mobile

- commandes d'au moins 44 px de hauteur ;
- états sélectionnés exposés avec `aria-pressed` ;
- barre de progression sémantique ;
- libellé explicite pour chaque raccourci de durée ;
- mise en page sans défilement horizontal critique.

## Hors périmètre

Cette phase ne modifie pas :

- les formules de calories ou de macros ;
- les valeurs MET par défaut ;
- le modèle Dexie ou D1 ;
- la synchronisation ;
- les modèles de séance ;
- les règles de récompenses ou de partage social ;
- la version applicative.
