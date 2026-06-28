# Corbeille nutrition et recettes — lot 2

Cette phase étend la corbeille locale aux suppressions de nutrition qui sont
réellement destructives.

## Éléments protégés

- entrée alimentaire individuelle ;
- repas complet avec toutes ses entrées ;
- repas favori ;
- recette avec tous ses ingrédients.

Les activités et les pesées restent protégées par le lot 1.

## Produits locaux

Les produits locaux ne sont pas ajoutés à la corbeille. SportPilot utilise déjà
un archivage réversible avec le champ `isArchived`, ce qui évite une
suppression destructive et préserve les références historiques.

## Transactions

Chaque suppression copie le snapshot complet dans `trashItems` et retire les
données actives dans une seule transaction Dexie.

Pour un repas, le snapshot contient le repas et toutes ses entrées.

Pour une recette, le snapshot contient la recette et tous ses ingrédients.

## Restauration et conflits

La restauration refuse toute opération susceptible d'écraser une donnée
existante :

- repas déjà présent au même créneau et à la même date ;
- identifiant d'entrée déjà utilisé ;
- recette déjà présente ;
- identifiant d'ingrédient déjà utilisé ;
- repas associé absent lors de la restauration d'une entrée isolée.

En cas de conflit, le snapshot reste intact dans la corbeille.

## Versions

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.

## Périmètre restant

La musculation sera traitée dans un lot dédié. Les suppressions de séries
renumérotent les données restantes, et les exercices ou modèles peuvent être
référencés par plusieurs tables : leur restauration exige donc une stratégie
spécifique.
