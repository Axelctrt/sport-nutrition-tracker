# SportPilot 0.21.0 D3 — Restauration d’un compte depuis le cloud

## Objectif

D3 traite le cas d’une installation locale vide alors que le compte connecté possède déjà des données dans Dexie Cloud. L’utilisateur conserve le contrôle : il peut restaurer les domaines synchronisés ou commencer avec un espace local vide. Aucun de ces choix ne supprime la source cloud.

## Périmètre restauré

La restauration couvre les domaines déjà pris en charge par les services de synchronisation :

- pesées et marqueurs de suppression ;
- activités et marqueurs de suppression ;
- objectifs sportifs et marqueurs de suppression ;
- exercices personnels, modèles, séances et suppressions de musculation ;
- produits, recettes, ingrédients et repas favoris ;
- repas, entrées, objectifs quotidiens et statuts du journal nutritionnel ;
- bilans hebdomadaires et ajustements caloriques acceptés.

Les réglages non synchronisés, récompenses, thèmes, missions et rappels restent locaux. D3 ne prétend donc pas remplacer une sauvegarde JSON complète.

## Détection initiale

`DataSpaceAccountGate` conserve la barrière avant les providers métier. Lorsqu’un compte connecté ne possède pas encore d’espace enregistré sur l’installation :

1. l’empreinte opaque du compte est calculée ;
2. le cloud est synchronisé en lecture ;
3. les lignes privées du compte sont filtrées par propriétaire ;
4. un aperçu par domaine est affiché ;
5. le choix d’un espace vide reste bloqué pendant l’analyse initiale.

Si aucun domaine synchronisé ne contient de donnée active, l’utilisateur peut créer son espace vide. Si des données sont trouvées, il peut soit les restaurer, soit conserver volontairement un espace vide.

## Mode lecture seule du cloud

Les sept services de synchronisation acceptent `CloudSyncExecutionOptions` avec `writeCloud: false`. Dans ce mode :

- les lignes cloud sont lues et résolues selon les règles existantes ;
- la base locale cible reçoit les valeurs et marqueurs retenus ;
- aucune table cloud n’est créée, modifiée ou vidée ;
- les compteurs d’envoi et de suppression cloud restent à zéro.

La restauration appelle toujours ces services avec `{ writeCloud: false }`.

## Préparation et empreintes

`prepareCloudAccountRestore` produit un objet lié à :

- l’empreinte du compte ;
- le nom exact de la base locale cible ;
- l’empreinte stable des données cloud visibles ;
- l’empreinte stable de la cible locale ;
- l’état local `missing`, `empty` ou `non-empty`.

Les données purement techniques ne bloquent pas une restauration initiale : exercices intégrés, cache Open Food Facts brut et objectif quotidien calculé automatiquement. Cet objectif est recalculable après la restauration. Toute autre donnée appartenant à un domaine synchronisé rend la cible non vide afin d’éviter un remplacement implicite.

Avant l’application, les empreintes cloud et locale sont recalculées. Elles sont contrôlées une seconde fois après la préparation temporaire et juste avant l’écriture définitive. Toute évolution après l’analyse, y compris l’arrivée concurrente d’un nouvel espace local, interrompt l’opération sans supprimer les données créées par une autre action.

## Application atomique

La restauration suit ce flux :

1. suppression d’une éventuelle base temporaire résiduelle ;
2. ouverture d’une base Dexie temporaire dédiée au compte ;
3. restauration de tous les domaines en mode cloud lecture seule ;
4. lecture d’un instantané exact de la base temporaire ;
5. nouvelle synchronisation en lecture et contrôle des empreintes cloud et locale ;
6. conservation des données locales non synchronisées autorisées ;
7. remplacement transactionnel des tables restaurables dans la base du compte ;
8. activation de l’espace du compte uniquement après succès ;
9. suppression systématique de la base temporaire.

Si une erreur survient après l’écriture locale, le service tente de réappliquer l’instantané antérieur. Une base de compte créée uniquement pour l’opération est supprimée si la restauration échoue.

## Choix d’un espace vide

`Commencer avec un espace vide` utilise le service existant de création d’espace de compte. Cette action :

- ne copie pas l’espace invité ;
- ne supprime aucune donnée invitée ;
- ne supprime et ne remplace aucune donnée cloud ;
- enregistre uniquement un nouvel espace local pour le compte.

Le panneau de restauration reste ensuite disponible dans `Compte et appareils`, tant que l’espace local ne contient pas de donnée métier. Dès qu’il est utilisé, les synchronisations par domaine doivent servir à fusionner les données plutôt qu’une restauration initiale destructive.

## Isolation des comptes

Le client vérifie que l’empreinte demandée correspond au compte Dexie Cloud actuellement connecté. Le nom de la base locale doit également correspondre à cette empreinte. Un aperçu préparé pour le compte A ne peut donc pas être appliqué sous le compte B.

## Versions

D3 ne change aucune version de stockage :

- application : `0.20.1` pendant la branche de préparation 0.21.0 ;
- Dexie Cloud : v8 ;
- runtime cloud local : `sportpilot-sync-runtime-0.20.0-v8` ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.
