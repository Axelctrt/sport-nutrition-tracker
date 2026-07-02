# SportPilot 0.21.1

## Correctif

SportPilot 0.21.1 corrige une divergence répétitive du journal nutritionnel observée après une simple ouverture de l’accueil.

L’objectif nutritionnel quotidien était recalculé correctement, mais son champ `updatedAt` était renouvelé à chaque passage sur le tableau de bord, même lorsque les calories, les macronutriments, le poids de calcul et les dépenses étaient strictement identiques. Le journal local redevenait alors artificiellement différent du cloud.

Le dépôt de l’objectif quotidien est désormais idempotent :

- un calcul identique conserve l’entité et son horodatage ;
- une modification métier réelle continue de mettre à jour l’objectif ;
- la synchronisation du journal reste à `0 différence` après une simple navigation ;
- les autres domaines de synchronisation ne sont pas modifiés.

## Compatibilité

- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- Dexie Cloud : v8 ;
- runtime cloud : `sportpilot-sync-runtime-0.20.0-v8` ;
- registre local des espaces : v1.

Aucune migration de données, aucune suppression locale et aucune nouvelle authentification OTP ne sont requises.

## Validation

Le correctif est couvert par :

- un test du dépôt Dexie vérifiant la conservation de `updatedAt` pour un calcul identique ;
- un test d’intégration vérifiant que le journal reste convergé après ce recalcul ;
- l’audit du journal nutritionnel ;
- la suite complète et la suite mélangée de publication.
