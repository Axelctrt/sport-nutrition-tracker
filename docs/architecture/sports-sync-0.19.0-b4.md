# SportPilot 0.19.0 B4 — finalisation de la synchronisation sportive

## Périmètre final

La version 0.19.0 couvre quatre familles synchronisées : pesées, activités, objectifs et musculation. Les échanges restent explicitement déclenchés par les contrôleurs SportPilot, à l’exception de l’actualisation historique des pesées au démarrage.

## Règle commune de convergence

Tous les services utilisent `cloudSyncValue.ts` pour :

1. ignorer `owner`, `realmId`, `$ts` et `_hasBlobRefs` lors des comparaisons ;
2. convertir les identifiants locaux en identifiants privés cloud préfixés par `#` ;
3. comparer récursivement les objets avec un ordre de clés stable ;
4. choisir l’entité au `updatedAt` le plus récent ;
5. départager de façon déterministe deux valeurs portant le même `updatedAt` ;
6. filtrer les lignes cloud selon le compte courant.

## Suppressions

Les suppressions sont matérialisées par des `DeletionRecord`. Un marqueur supprimé gagne lorsque son `updatedAt` est supérieur ou égal à celui de la donnée. Une donnée modifiée plus récemment produit un marqueur restauré afin d’éviter une suppression différée.

Pour la musculation, les marqueurs `strengthSet` et `workoutSessionExercise` empêchent la réapparition d’enfants supprimés à l’intérieur d’un agrégat plus ancien.

## Atomicité de la musculation

Les modèles et séances sont reconstruits puis appliqués dans une transaction Dexie unique. Une transaction invalide est annulée intégralement. Les contrôles vérifient les relations séance → exercice → série avant écriture.

## Runtime cloud

Le nom de la base locale de synchronisation inclut `SYNC_PROTOTYPE_DATABASE_VERSION`. Le schéma v5 utilise donc `sportpilot-sync-runtime-0.19.0-v5`. Une future évolution de schéma créera automatiquement un nouveau runtime local et ne réutilisera pas une file IndexedDB incompatible.

## Versions

- application : 0.19.0 ;
- base cloud : v5 ;
- base métier locale : Dexie v8 ;
- sauvegarde : JSON v7 ;
- registre d’espaces : v1.
