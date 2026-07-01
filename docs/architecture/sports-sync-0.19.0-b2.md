# SportPilot 0.19.0 B2 — Synchronisation des objectifs

## Périmètre

Le lot B2 étend le socle manuel Dexie Cloud aux objectifs sportifs. Il synchronise les objectifs de l’espace de compte actif sans toucher aux séances de musculation détaillées, à la nutrition ou aux autres espaces locaux.

## Données synchronisées

- objectifs et jalons atteints ;
- statut actif, en pause, terminé ou archivé ;
- cible, métrique, dates et valeur de référence ;
- marqueurs de suppression de type `goal`.

## Modèle cloud

La base `sportpilot-sync-prototype` passe en version 4 et ajoute :

- `realGoals` ;
- `realGoalDeletionRecords`.

Les identifiants envoyés au cloud restent privés, avec le préfixe `#`. Les lignes sont filtrées par propriétaire avant toute comparaison ou écriture locale.

## Résolution des conflits

La version ayant le `updatedAt` le plus récent est conservée. En cas d’égalité, une comparaison déterministe du contenu départage les versions. Une suppression plus récente gagne sur l’objectif ; un objectif plus récent qu’un ancien marqueur transforme ce marqueur en restauration explicite.

Les métadonnées techniques Dexie Cloud `owner`, `realmId`, `$ts` et `_hasBlobRefs` sont exclues des comparaisons métier.

## Suppressions locales

La suppression depuis la page Objectifs écrit désormais un `DeletionRecord` de type `goal` dans la même transaction que la suppression de la ligne locale. Le runtime utilisateur est ensuite rechargé afin que l’interface reflète immédiatement l’état persistant.

## Interface

Le panneau `Synchronisation des objectifs` est ajouté dans Paramètres > Synchronisation des données. Il permet :

- une analyse sans écriture ;
- une synchronisation manuelle confirmée ;
- l’affichage des volumes locaux, cloud, suppressions et différences.

## Invariants

- version applicative maintenue à `0.18.0` jusqu’au lot de release ;
- base locale principale maintenue en Dexie `v8` ;
- sauvegarde maintenue en JSON `v7` ;
- aucune donnée d’un autre compte n’est importée ;
- plusieurs synchronisations successives restent idempotentes.


## Correctif de runtime local

Le runtime Dexie Cloud B2 utilise une nouvelle base IndexedDB locale
` sportpilot-sync-runtime-0.19.0 ` (suffixée par l’identifiant de la base cloud).
L’ancienne base `sportpilot-sync-prototype` est conservée sans être relue : elle peut
contenir une file de mutations B2 bloquée après une montée de schéma interrompue.
Les données métier restent dans la base principale Dexie v8 et les copies cloud
restent sur le même service Dexie Cloud. Une reconnexion OTP est donc requise une
seule fois, sans perte des pesées, activités ou objectifs réels.

La synchronisation eager de Dexie Cloud est désactivée pour ce runtime. Les échanges
sont déclenchés explicitement par les contrôleurs SportPilot afin d’éviter qu’un push
Dexie Cloud concurrent ne capture une opération intermédiaire pendant la convergence.
