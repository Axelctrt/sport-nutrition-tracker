# SportPilot 0.20.0 C2 — bibliothèque nutritionnelle synchronisée

## Périmètre

C2 synchronise les produits utiles, les recettes avec leurs ingrédients et les repas favoris. Les produits manuels sont toujours inclus. Les produits Open Food Facts ne sont transférés que lorsqu’ils sont réellement utilisés, favoris ou personnalisés localement.

## Agrégats et références

Une recette est transférée avec l’intégralité de ses ingrédients. L’application locale est transactionnelle et refuse toute recette dont un produit parent est absent. Les favoris sont validés contre les produits et recettes finaux.

## Déduplication Open Food Facts

Les produits Open Food Facts partageant le même code-barres normalisé convergent vers la fiche la plus récente. Les références des recettes, favoris et entrées C1 sont remappées vers l’identifiant retenu. Les caches Open Food Facts inutilisés restent locaux et reconstructibles.

## Suppressions

Les suppressions de recettes, ingrédients et favoris reposent sur les marqueurs durables de la base métier. Le remplacement des ingrédients d’une recette crée désormais explicitement les marqueurs nécessaires afin d’empêcher leur résurrection sur un autre appareil.

## Versions

- application : `0.19.0` pendant le développement C2 ;
- runtime Dexie Cloud : `sportpilot-sync-runtime-0.20.0-v7` ;
- base métier : Dexie `v8` ;
- sauvegarde : JSON `v7`.
