# Réinitialisation sélective des données

Cette fonctionnalité permet de retirer les données utilisées pendant les tests sans supprimer le profil ni les réglages de l’application.

## Données toujours conservées

- profil utilisateur ;
- paramètres applicatifs et thème ;
- journal des migrations Dexie ;
- dernier diagnostic d’intégrité.

## Catégories disponibles

- historique du poids ;
- activités et pas ;
- journal nutritionnel ;
- séances de musculation ;
- bibliothèque nutritionnelle ;
- bibliothèque de musculation.

## Cohérence référentielle

La suppression d’une bibliothèque entraîne automatiquement la suppression des historiques qui dépendent de ses éléments :

- bibliothèque nutritionnelle → journal nutritionnel ;
- bibliothèque de musculation → séances de musculation.

La suppression du poids, des activités ou du journal nutritionnel efface également les bilans hebdomadaires et ajustements caloriques calculés à partir de ces données.

Après suppression de la bibliothèque de musculation, le catalogue d’exercices système est recréé. Les exercices personnels restent supprimés.

## Garanties techniques

- aucune modification du schéma Dexie v3 ;
- aucune modification du format de sauvegarde JSON v2 ;
- suppression exécutée dans une transaction Dexie unique ;
- annulation complète en cas d’erreur ;
- intégration à la barrière d’écritures utilisée par les mises à jour PWA ;
- prévisualisation du nombre d’éléments avant confirmation ;
- aucune suppression automatique au chargement de la page.
