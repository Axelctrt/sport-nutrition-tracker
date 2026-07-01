# SportPilot 0.19.0 B3 — Synchronisation de la musculation

## Périmètre

Le lot B3 étend la synchronisation manuelle Dexie Cloud aux données structurées de musculation de l’espace de compte actif : exercices personnalisés, séances modèles et séances réalisées avec leurs exercices et leurs séries.

Les exercices du catalogue système ne sont pas envoyés au cloud. Le catalogue est déterministe et déjà recréé localement sur chaque appareil ; seuls les exercices créés par l’utilisateur sont synchronisés.

## Modèle d’agrégats

Les modèles et les séances ne sont pas synchronisés table par table. Ils sont matérialisés sous forme d’agrégats complets :

```text
WorkoutTemplateAggregate
├── template
└── exercises[]

WorkoutSessionAggregate
├── session
├── exercises[]
└── sets[]
```

Cette organisation garantit qu’une séance distante est appliquée dans une transaction unique. SportPilot ne peut donc pas afficher une séance téléchargée sans ses exercices ou avec des séries orphelines.

## Modèle cloud

La base Dexie Cloud passe en version 5. Le runtime IndexedDB local est désormais nommé automatiquement `sportpilot-sync-runtime-0.19.0-v5` : chaque évolution du schéma cloud utilise ainsi une base locale neuve et ne peut plus rester bloquée derrière une ancienne file de synchronisation.

Elle ajoute :

- `realStrengthExercises` ;
- `realWorkoutTemplates` ;
- `realWorkoutSessions` ;
- `realStrengthDeletionRecords`.

La base locale métier reste en Dexie v8 et le format de sauvegarde reste en JSON v7.

## Résolution des conflits

Chaque exercice personnalisé et chaque agrégat possède un `updatedAt` calculé à partir de l’entité parent et de ses enfants. La version la plus récente est conservée. En cas d’égalité, une comparaison déterministe du contenu départage les versions.

Les métadonnées techniques Dexie Cloud `owner`, `realmId`, `$ts` et `_hasBlobRefs` sont exclues des comparaisons métier. Toutes les lignes cloud sont filtrées par propriétaire avant lecture locale.

## Suppressions et restaurations

Les suppressions de séries et d’exercices de séance réutilisent les `DeletionRecord` existants :

- `strengthSet` supprime uniquement la série concernée ;
- `workoutSessionExercise` supprime l’exercice de séance et toutes ses séries ;
- une entité restaurée plus récente transforme l’ancien marqueur en restauration explicite ;
- l’agrégat cloud est réécrit sans l’enfant supprimé afin d’éviter toute résurrection lors des synchronisations suivantes.

Les modèles et séances utilisent leurs mécanismes d’archivage et de statut existants ; aucune nouvelle suppression physique de parent n’est introduite dans B3.

## Interface

Le panneau **Synchronisation de la musculation** est ajouté dans `Paramètres → Synchronisation des données`. Il propose :

- une analyse sans écriture ;
- une synchronisation manuelle avec confirmation ;
- les volumes locaux et cloud ;
- le nombre de marqueurs de suppression et d’agrégats différents.

## Invariants

- version applicative maintenue à `0.18.0` jusqu’au lot de release B4 ;
- base locale principale maintenue en Dexie v8 ;
- sauvegarde maintenue en JSON v7 ;
- aucun exercice de catalogue n’est dupliqué dans le cloud ;
- aucune donnée d’un autre compte n’est importée ;
- plusieurs synchronisations successives restent idempotentes ;
- les pesées, activités et objectifs ne sont pas modifiés par B3 ;
- le nom du runtime local contient toujours `SYNC_PROTOTYPE_DATABASE_VERSION`, afin qu’une montée de schéma ne réutilise jamais une file IndexedDB antérieure.
