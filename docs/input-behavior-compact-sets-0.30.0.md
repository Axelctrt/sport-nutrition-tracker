# SportPilot 0.30.0 — U16 Saisie fluide et séries compactes

## Objectif

U16 ajuste deux points validés après la recette UX finale :

- les champs texte et numériques préremplis se vident à la prise de focus, puis restaurent leur valeur initiale si aucune nouvelle valeur n’est saisie ;
- les séries de musculation détaillée utilisent une présentation compacte en lignes afin de réduire le défilement pendant l’exécution.

## Comportement des champs

Le comportement est centralisé dans `useClearInputValueOnFocus` et activé dans `AppLayout`.

Sont concernés :

- les champs texte classiques ;
- les champs numériques ;
- les zones de texte.

Sont exclus :

- recherche ;
- mots de passe ;
- dates et horaires ;
- cases à cocher ;
- boutons radio ;
- fichiers ;
- champs désactivés ou en lecture seule ;
- champs portant `data-clear-on-focus="false"`.

Le champ prend comme référence sa valeur au moment du focus. Si l’utilisateur sort du champ sans avoir saisi une nouvelle valeur, cette référence est restaurée. Si une nouvelle valeur est saisie, elle est conservée.

## Séries compactes

Chaque série est affichée sous forme d’une ligne compacte :

- numéro de série ;
- charge, répétitions ou mesure adaptée au mode de suivi ;
- RPE ;
- validation ou réouverture ;
- enregistrement rapide ;
- options secondaires repliées.

Les options secondaires sont regroupées dans `Options discrètes` :

- type de série ;
- notes ;
- duplication ;
- suppression.

Les séries validées restent éditables sans devoir rouvrir une grande carte. Les actions de duplication, suppression, modification et validation conservent les services existants.

## Séances libres

Lors de l’ajout d’un exercice dans une séance libre, l’utilisateur choisit le nombre de séries prévues avant l’ajout. Le choix génère immédiatement les lignes correspondantes. Les valeurs sont limitées de 1 à 12 séries, avec des raccourcis 1 à 6.

## Hors périmètre

U16 ne modifie pas :

- les modèles Dexie ;
- les migrations D1 ;
- les calculs de volume ;
- les records ;
- les règles de progression ;
- le minuteur de repos ;
- la synchronisation.
