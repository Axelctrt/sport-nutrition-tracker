# Annulation immédiate des suppressions

Cette phase ajoute une action **Annuler** aux notifications affichées après une
suppression protégée par la corbeille.

## Fonctionnement

Après une suppression réussie, SportPilot affiche pendant huit secondes :

- le message indiquant que l'élément a été déplacé dans la corbeille ;
- le libellé de l'élément ;
- un bouton **Annuler**.

L'action restaure le snapshot correspondant avec le service de corbeille
existant. Après restauration, l'écran courant est remonté afin de relire les
données locales sans recharger entièrement la PWA.

## Périmètre

Le mécanisme est global et couvre automatiquement :

- activités ;
- pesées ;
- entrées alimentaires ;
- repas complets ;
- repas favoris ;
- recettes ;
- séries de musculation ;
- exercices retirés d'une séance.

## Sécurité transactionnelle

L'événement d'annulation n'est publié qu'après la réussite complète de la
transaction Dexie. Une suppression annulée ou échouée ne produit donc aucun
toast trompeur.

Les conflits de restauration continuent d'être contrôlés par
`restoreTrashItem`. En cas de conflit :

- aucune donnée existante n'est écrasée ;
- le snapshot reste dans la corbeille ;
- un toast d'erreur explique le problème.

## Notifications avec action

Le composant de toast prend maintenant en charge une action optionnelle :

- libellé visible ;
- libellé accessible dédié ;
- callback synchrone ou asynchrone ;
- fermeture immédiate du toast au clic ;
- protection contre les rejets non gérés.

## Versions

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
