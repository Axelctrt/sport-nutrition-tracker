# Migrations de la base locale SportPilot

## Règles de gouvernance

Une version Dexie publiée est immuable.

- Une migration historique conserve son numéro et son schéma.
- Elle n’importe jamais `CURRENT_DATABASE_VERSION` comme numéro propre.
- Toute évolution ajoute une constante, un schéma et un fichier de migration.
- Une suppression de table ou de propriété exige une stratégie de conservation testée.
- Le nom `sportpilot-local-database` reste stable.
- Les versions sont enregistrées dans l’ordre de `version1.ts` à la version courante.

Version courante après la préparation à la synchronisation :

```ts
export const CURRENT_DATABASE_VERSION = DATABASE_VERSION_8;
```

## Version 1 — socle métier

Tables :

- `userProfile` ;
- `appSettings` ;
- `weights` ;
- `dailySteps` ;
- `activities` ;
- `foodProducts` ;
- `meals` ;
- `foodEntries` ;
- `favoriteMeals` ;
- `recipes` ;
- `recipeIngredients` ;
- `dailyTargets` ;
- `dailyJournalStatuses` ;
- `weeklyReviews` ;
- `acceptedCalorieAdjustments`.

## Version 2 — musculation

Ajoute :

- `exerciseDefinitions` ;
- `workoutTemplates` ;
- `workoutTemplateExercises` ;
- `workoutSessions` ;
- `workoutSessionExercises` ;
- `strengthSets` ;
- `progressionSuggestions`.

Aucune table v1 n’est retirée.

## Version 3 — gouvernance et diagnostics

Ajoute les tables internes :

- `migrationJournal` ;
- `databaseDiagnostics`.

La migration écrit une entrée de journal décrivant le passage depuis la version précédente.

## Version 4 — corbeille locale

Ajoute :

- `trashItems`.

Cette table contient les snapshots nécessaires à l’annulation et à la restauration. Elle reste locale, non exportée et non synchronisée.

## Version 5 — objectifs et planning d’endurance

Ajoute :

- `goals` ;
- `endurancePlanningSessions`.

Au démarrage applicatif, la migration des états hérités transfère les anciennes clés `localStorage` vers ces tables puis hydrate le runtime depuis Dexie.

## Version 6 — récompenses et rappels

Ajoute :

- `earnedAchievements` ;
- `unlockedVisualThemes` ;
- `visualThemePreferences` ;
- `weeklyMissionCompletions` ;
- `routineReminderCompletions`.

Les complétions de rappels deviennent des données utilisateur. Les informations de dernier affichage et de report restent locales.

## Version 7 — séparation utilisateur/appareil

Évolution :

- suppression du store historique `appSettings` après migration ;
- ajout de `userSettings` ;
- ajout de `deviceSettings` ;
- génération d’un `deviceId` UUID local.

La migration lit l’ancien singleton et distribue ses champs selon leur portée.

`userSettings` est exporté. `deviceSettings` ne l’est pas.

## Version 8 — marqueurs de suppression

Ajoute :

- `deletionRecords`.

La migration reprend les éléments encore présents dans `trashItems` et crée des marqueurs déterministes :

```text
deletion:<entityType>:<entityId>
```

Pour les snapshots parents, elle crée également les marqueurs enfants nécessaires.

Le journal enregistre le passage v7 → v8.

## Chaîne de sauvegarde associée

| Dexie | Backup courant introduit | Évolution principale |
|---:|---:|---|
| v1–v4 | JSON v1–v4 | Tables historiques et ancien `rewardState` |
| v5 | JSON v5 | États utilisateur représentés en tables |
| v7 | JSON v6 | `userSettings` exporté, `deviceSettings` exclu |
| v8 | JSON v7 | `deletionRecords` exporté, `trashItems` exclu |

Les backups v1 à v6 sont migrés vers la v7 lors de l’import.

## Couverture de non-régression

Les tests principaux vérifient :

- `AppDatabase.version-chain.test.ts` : enregistrement de `[1, 2, 3, 4, 5, 6, 7, 8]` ;
- `AppDatabase.migration.test.ts` : conservation des données historiques ;
- `AppDatabase.trash-migration.test.ts` : ajout de la corbeille ;
- `AppDatabase.user-state-migration.test.ts` : migrations des états utilisateur et chaîne jusqu’à v8 ;
- `AppDatabase.deletion-migration.test.ts` : reprise de la corbeille et création des marqueurs ;
- `migrationJournal.test.ts` : journalisation de chaque évolution ;
- `backupSchemas.test.ts` : validation et migration des backups jusqu’à JSON v7 ;
- `backupService.test.ts` : export et restauration complète ;
- `selectiveBackupRestoreService.test.ts` : restauration sélective, y compris `deletionRecords` ;
- `syncDataReadiness.test.ts` : frontières utilisateur/local et versions de préparation.

Avant toute nouvelle migration :

```powershell
npx vitest run src/infrastructure/database/AppDatabase.version-chain.test.ts src/infrastructure/database/AppDatabase.migration.test.ts
```

Puis exécuter la suite complète, le lint, le build, la stabilité et les E2E.
