# Centre de cohérence profonde des données

Cette phase complète le diagnostic technique du schéma IndexedDB avec un
contrôle des relations entre les enregistrements métier.

## Contrôles réalisés

Le contrôle local vérifie notamment :

- l'unicité logique du profil et des paramètres ;
- les ingrédients reliés à une recette et à un produit ;
- les entrées alimentaires reliées à leur repas ;
- les sources des repas favoris ;
- les exercices reliés à leurs modèles ;
- les exercices reliés à leurs séances ;
- les séries reliées à leur séance et à leur exercice parent ;
- les suggestions de progression reliées aux séances et exercices ;
- les positions dupliquées dans les modèles et les séances ;
- les numéros de série dupliqués dans un même exercice.

## Distinction entre alerte et réparation

Une référence source manquante n'est pas automatiquement supprimée lorsqu'un
snapshot permet encore de lire les valeurs historiques. C'est le cas notamment
des valeurs nutritionnelles figées et du nom d'un exercice réalisé.

La réparation automatique est réservée aux enfants devenus inaccessibles :

- ingrédient dont la recette n'existe plus ;
- exercice dont le modèle n'existe plus ;
- exercice dont la séance n'existe plus ;
- série dont la séance ou l'exercice parent n'existe plus ;
- suggestion de progression dont la séance ou l'exercice n'existe plus.

Les enfants qui deviendraient orphelins à cause de la même réparation sont
inclus dans le plan.

## Protection

Avant toute réparation :

1. une sauvegarde JSON complète est préparée ;
2. le fichier de sécurité est téléchargé ;
3. la transaction de réparation est exécutée ;
4. un nouveau contrôle de cohérence est lancé.

Si la sauvegarde échoue, aucune réparation n'est exécutée.

## Diagnostic exportable

Le rapport peut être téléchargé au format JSON :

```text
sportpilot-coherence-donnees-<horodatage>.json
```

Il contient le statut, les compteurs et les anomalies détectées, mais n'inclut
pas le contenu complet des repas, notes ou séances.

## Technique

- traitement intégralement local ;
- aucune transmission réseau ;
- Dexie v4 inchangé ;
- sauvegarde JSON v3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
