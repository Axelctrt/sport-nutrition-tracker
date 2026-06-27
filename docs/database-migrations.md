# Migrations de la base locale SportPilot

## Règle de gouvernance

Une version Dexie publiée est immuable.

- Un fichier historique enregistre toujours son propre numéro figé.
- Une migration historique ne doit jamais importer une constante représentant la version courante.
- Toute évolution ajoute un nouveau numéro, un nouveau schéma et un nouveau fichier de migration.
- Une migration ne supprime ni table ni propriété sans stratégie de conservation explicitement testée.
- Le nom de base `sportpilot-local-database` reste stable en production.

Exemple attendu pour une future version :

```ts
export const DATABASE_VERSION_3 = 3 as const;

database.version(DATABASE_VERSION_3).stores(schemaVersion3).upgrade(...);
```

Les déclarations des versions 1 et 2 ne doivent alors pas être modifiées.

## Version 1

Numéro Dexie : `1`.

Tables :

- `userProfile`
- `appSettings`
- `weights`
- `dailySteps`
- `activities`
- `foodProducts`
- `meals`
- `foodEntries`
- `favoriteMeals`
- `recipes`
- `recipeIngredients`
- `dailyTargets`
- `dailyJournalStatuses`
- `weeklyReviews`
- `acceptedCalorieAdjustments`

Cette version contient le profil, les préférences, le poids, les pas, les activités,
la nutrition, les recettes et les données de suivi hebdomadaire.

## Version 2

Numéro Dexie : `2`.

Évolution additive : aucune table de la version 1 n’est retirée et aucun
contenu existant n’est transformé. Les tables suivantes sont ajoutées :

- `exerciseDefinitions`
- `workoutTemplates`
- `workoutTemplateExercises`
- `workoutSessions`
- `workoutSessionExercises`
- `strengthSets`
- `progressionSuggestions`

La migration attendue de la version 1 vers la version 2 conserve donc à
l’identique tous les enregistrements historiques et crée les sept nouvelles
tables de musculation vides.

## Couverture de non-régression

`AppDatabase.version-chain.test.ts` vérifie l’enregistrement effectif des versions `[1, 2]`. Ce test échoue sur la version 0.16.0 non corrigée, qui enregistre `[2, 2]`.

`AppDatabase.migration.test.ts` vérifie :

1. la conservation du contenu de chacune des quinze tables v1 pendant une vraie ouverture v1 vers v2 ;
2. la conservation de chacune des vingt-deux tables v2 après fermeture et réouverture ;
3. la conservation du schéma v2 lorsqu’une version 3 additive est simulée.
