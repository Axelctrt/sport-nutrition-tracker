# SportPilot 0.20.0 C4 — finalisation de la synchronisation nutritionnelle

## Décision de release

La version 0.20.0 publie les trois lots nutritionnels validés : journal C1, bibliothèque C2 et suivi hebdomadaire C3. C4 ne modifie ni le schéma cloud ni les modèles métier ; il consolide les contrôles de release et active officiellement les domaines dans le build public.

## Périmètre synchronisé

- journées nutritionnelles avec repas, entrées, objectifs et statuts ;
- produits utiles, recettes atomiques et repas favoris ;
- bilans hebdomadaires et ajustements caloriques acceptés ;
- suppressions et restaurations associées ;
- recalcul des objectifs quotidiens obsolètes puis propagation par C1.

## Convergence commune

Les trois domaines utilisent `cloudSyncValue` pour :

- filtrer les enregistrements du compte actif ;
- retirer les métadonnées Dexie Cloud des comparaisons ;
- produire des identifiants privés stables ;
- résoudre les conflits par `updatedAt` ;
- départager les égalités de façon déterministe.

## Intégrité

- les journées et recettes sont appliquées transactionnellement ;
- une entrée sans repas parent est refusée ;
- un ingrédient sans recette ou produit valide est refusé ;
- un ajustement sans bilan accepté est refusé ;
- les marqueurs de suppression empêchent les résurrections ;
- la déduplication Open Food Facts remappe toutes les références utiles.

## Déploiement

La configuration publique active les domaines sportifs et nutritionnels validés, tout en gardant les diagnostics de laboratoire désactivés. Les variables de la plateforme conservent la priorité sur cette configuration de secours.

## Versions

- application : 0.20.0 ;
- base cloud : v8 ;
- runtime local cloud : `sportpilot-sync-runtime-0.20.0-v8` ;
- base métier : Dexie v8 ;
- sauvegarde : JSON v7 ;
- registre des espaces : v1.
