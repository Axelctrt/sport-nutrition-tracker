# SportPilot 0.20.0 C1 — Journal nutritionnel synchronisé

## Périmètre

C1 synchronise manuellement, pour le compte actif :

- les repas ;
- les entrées alimentaires ;
- les objectifs nutritionnels quotidiens ;
- les statuts de complétude du journal ;
- les suppressions et restaurations de repas et d’entrées.

Les produits, recettes et repas favoris restent hors périmètre jusqu’au lot C2.
Les entrées conservent néanmoins leurs instantanés nutritionnels, ce qui permet
les calculs de calories et macronutriments même lorsque la bibliothèque source
n’est pas encore présente sur le second appareil.

## Agrégat journalier

La table cloud `realNutritionJournalDays` stocke une journée complète :

```text
Journée nutritionnelle
├── repas
├── entrées alimentaires
├── objectif quotidien facultatif
└── statut du journal facultatif
```

Le service fusionne les entités individuellement selon `updatedAt`, puis applique
le résultat dans une transaction Dexie unique. Une entrée n’est jamais conservée
sans repas parent cohérent. Une journée cloud incohérente est refusée avant toute
écriture locale.

## Suppressions

Les marqueurs `meal` et `foodEntry` sont synchronisés dans
`realNutritionJournalDeletionRecords`. Une suppression plus récente gagne sur
l’entité. Une entité plus récente restaure explicitement son marqueur. La
suppression d’un repas fait également disparaître ses entrées pour empêcher les
données orphelines.

## Versions

- application : `0.19.0` pendant le développement C1 ;
- runtime cloud : `sportpilot-sync-runtime-0.20.0-v6` ;
- schéma cloud : v6 ;
- base métier : Dexie v8 ;
- sauvegarde : JSON v7.

Le nouveau nom de runtime évite de rouvrir une file IndexedDB d’un ancien schéma.
Une reconnexion OTP unique peut donc être demandée après installation de C1.
