import { ensureExerciseCatalog } from '@/application/strength/exerciseCatalogSeeder';
import { normalizeUserSettings } from '@/domain/defaults/appSettings';
import type { DeletionEntityType } from '@/domain/models/deletion';
import {
  type BackupData,
  type BackupEnvelope,
  type BackupUserStateTableName,
} from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  allUserDataTableList,
  BackupOperationError,
  parseBackupTextWithMetadata,
  readBackupData,
  replaceIncludedUserStateTables,
  summarizeBackup,
  type BackupSummary,
} from '@/infrastructure/backup/backupService';
import { appDatabase } from '@/infrastructure/database/database';
import {
  flushUserStatePersistence,
  reloadUserStateRuntime,
} from '@/infrastructure/user-state/userStateRuntime';

export type SelectiveRestoreCategory =
  | 'profileSettings'
  | 'bodyTracking'
  | 'activities'
  | 'nutrition'
  | 'strength'
  | 'rewards';

export interface SelectiveRestoreCategoryDefinition {
  key: SelectiveRestoreCategory;
  label: string;
  description: string;
}

export interface SelectiveRestoreCategoryPreview
  extends SelectiveRestoreCategoryDefinition {
  currentRecords: number;
  incomingRecords: number;
  available: boolean;
}

export interface PreparedSelectiveBackupRestore {
  envelope: BackupEnvelope;
  summary: BackupSummary;
  categories: SelectiveRestoreCategoryPreview[];
}

export interface SelectiveBackupRestoreResult {
  selectedCategories: SelectiveRestoreCategory[];
  restoredRecordCount: number;
}

const REWARD_USER_STATE_TABLE_NAMES = [
  'goals',
  'endurancePlanningSessions',
  'earnedAchievements',
  'unlockedVisualThemes',
  'visualThemePreferences',
  'weeklyMissionCompletions',
  'routineReminderCompletions',
] as const satisfies readonly BackupUserStateTableName[];

const DELETION_ENTITY_TYPES_BY_CATEGORY: Partial<
  Record<SelectiveRestoreCategory, readonly DeletionEntityType[]>
> = {
  bodyTracking: ['weight'],
  activities: ['activity'],
  nutrition: [
    'foodEntry',
    'meal',
    'favoriteMeal',
    'recipe',
    'recipeIngredient',
  ],
  strength: ['strengthSet', 'workoutSessionExercise'],
};

function deletionEntityTypesForCategories(
  categories: ReadonlySet<SelectiveRestoreCategory>,
): DeletionEntityType[] {
  const types = new Set<DeletionEntityType>();

  for (const category of categories) {
    for (const entityType of
      DELETION_ENTITY_TYPES_BY_CATEGORY[category] ?? []) {
      types.add(entityType);
    }
  }

  return [...types];
}

function countDeletionRecords(
  data: BackupData,
  entityTypes: readonly DeletionEntityType[],
): number {
  const allowed = new Set(entityTypes);

  return (data.deletionRecords ?? []).filter(({ entityType }) =>
    allowed.has(entityType),
  ).length;
}

export const SELECTIVE_RESTORE_CATEGORY_DEFINITIONS: readonly SelectiveRestoreCategoryDefinition[] =
  [
    {
      key: 'profileSettings',
      label: 'Profil et réglages',
      description:
        'Profil, objectifs, préférences générales et réglages de l’application.',
    },
    {
      key: 'bodyTracking',
      label: 'Poids et pas',
      description:
        'Historique des pesées et suivi quotidien des pas.',
    },
    {
      key: 'activities',
      label: 'Activités d’endurance',
      description:
        'Course, natation, vélo, marche et autres activités cardio.',
    },
    {
      key: 'nutrition',
      label: 'Nutrition et bilans',
      description:
        'Aliments, recettes, repas, journal, objectifs et bilans hebdomadaires.',
    },
    {
      key: 'strength',
      label: 'Musculation',
      description:
        'Exercices, modèles, séances, séries et suggestions de progression.',
    },
    {
      key: 'rewards',
      label: 'Objectifs et progression',
      description:
        'Objectifs, planning, badges, thèmes, missions et rappels terminés.',
    },
  ];

function countCategoryRecords(
  data: BackupData,
  category: Exclude<SelectiveRestoreCategory, 'rewards'>,
): number {
  switch (category) {
    case 'profileSettings':
      return data.userProfile.length + (data.userSettings?.length ?? 0);
    case 'bodyTracking':
      return (
        data.weights.length +
        data.dailySteps.length +
        countDeletionRecords(
          data,
          DELETION_ENTITY_TYPES_BY_CATEGORY.bodyTracking ?? [],
        )
      );
    case 'activities':
      return (
        data.activities.length +
        countDeletionRecords(
          data,
          DELETION_ENTITY_TYPES_BY_CATEGORY.activities ?? [],
        )
      );
    case 'nutrition':
      return (
        data.foodProducts.length +
        data.meals.length +
        data.foodEntries.length +
        data.favoriteMeals.length +
        data.recipes.length +
        data.recipeIngredients.length +
        data.dailyTargets.length +
        data.dailyJournalStatuses.length +
        data.weeklyReviews.length +
        data.acceptedCalorieAdjustments.length +
        countDeletionRecords(
          data,
          DELETION_ENTITY_TYPES_BY_CATEGORY.nutrition ?? [],
        )
      );
    case 'strength':
      return (
        data.exerciseDefinitions.length +
        data.workoutTemplates.length +
        data.workoutTemplateExercises.length +
        data.workoutSessions.length +
        data.workoutSessionExercises.length +
        data.strengthSets.length +
        data.progressionSuggestions.length +
        countDeletionRecords(
          data,
          DELETION_ENTITY_TYPES_BY_CATEGORY.strength ?? [],
        )
      );
  }
}

function countUserStateRecords(
  data: BackupData,
  tableNames: readonly BackupUserStateTableName[],
): number {
  return tableNames.reduce(
    (total, tableName) =>
      total + (data[tableName]?.length ?? 0),
    0,
  );
}

export function createSelectiveRestorePreview(
  currentData: BackupData,
  envelope: BackupEnvelope,
  summary: BackupSummary = summarizeBackup(envelope),
): PreparedSelectiveBackupRestore {
  return {
    envelope,
    summary,
    categories: SELECTIVE_RESTORE_CATEGORY_DEFINITIONS.map(
      (definition) => {
        if (definition.key === 'rewards') {
          const incomingTables =
            envelope.includedUserStateTables ?? [];

          return {
            ...definition,
            currentRecords: countUserStateRecords(
              currentData,
              REWARD_USER_STATE_TABLE_NAMES,
            ),
            incomingRecords: countUserStateRecords(
              envelope.data,
              incomingTables.filter(
                (tableName) => tableName !== 'deletionRecords',
              ),
            ),
            available: incomingTables.some(
              (tableName) => tableName !== 'deletionRecords',
            ),
          };
        }

        return {
          ...definition,
          currentRecords: countCategoryRecords(
            currentData,
            definition.key,
          ),
          incomingRecords: countCategoryRecords(
            envelope.data,
            definition.key,
          ),
          available: true,
        };
      },
    ),
  };
}

export async function prepareSelectiveBackupRestore(
  text: string,
  database: AppDatabase = appDatabase,
): Promise<PreparedSelectiveBackupRestore> {
  const parsed = parseBackupTextWithMetadata(text);
  const summary = summarizeBackup(parsed.envelope, parsed);
  const currentData = await readBackupData(database);

  return createSelectiveRestorePreview(
    currentData,
    parsed.envelope,
    summary,
  );
}

async function replaceProfileSettings(
  database: AppDatabase,
  data: BackupData,
): Promise<void> {
  await database.userProfile.clear();
  await database.userSettings.clear();

  if (data.userProfile.length > 0) {
    await database.userProfile.bulkAdd(data.userProfile);
  }

  await database.userSettings.bulkAdd(
    (data.userSettings ?? []).map(normalizeUserSettings),
  );
}

async function replaceBodyTracking(
  database: AppDatabase,
  data: BackupData,
): Promise<void> {
  await database.weights.clear();
  await database.dailySteps.clear();

  if (data.weights.length > 0) {
    await database.weights.bulkAdd(data.weights);
  }

  if (data.dailySteps.length > 0) {
    await database.dailySteps.bulkAdd(data.dailySteps);
  }
}

async function replaceActivities(
  database: AppDatabase,
  data: BackupData,
): Promise<void> {
  await database.activities.clear();

  if (data.activities.length > 0) {
    await database.activities.bulkAdd(data.activities);
  }
}

async function replaceNutrition(
  database: AppDatabase,
  data: BackupData,
): Promise<void> {
  await Promise.all([
    database.foodEntries.clear(),
    database.recipeIngredients.clear(),
    database.favoriteMeals.clear(),
    database.meals.clear(),
    database.recipes.clear(),
    database.foodProducts.clear(),
    database.dailyTargets.clear(),
    database.dailyJournalStatuses.clear(),
    database.acceptedCalorieAdjustments.clear(),
    database.weeklyReviews.clear(),
  ]);

  if (data.foodProducts.length > 0) {
    await database.foodProducts.bulkAdd(data.foodProducts);
  }
  if (data.meals.length > 0) {
    await database.meals.bulkAdd(data.meals);
  }
  if (data.recipes.length > 0) {
    await database.recipes.bulkAdd(data.recipes);
  }
  if (data.recipeIngredients.length > 0) {
    await database.recipeIngredients.bulkAdd(
      data.recipeIngredients,
    );
  }
  if (data.foodEntries.length > 0) {
    await database.foodEntries.bulkAdd(data.foodEntries);
  }
  if (data.favoriteMeals.length > 0) {
    await database.favoriteMeals.bulkAdd(data.favoriteMeals);
  }
  if (data.dailyTargets.length > 0) {
    await database.dailyTargets.bulkAdd(data.dailyTargets);
  }
  if (data.dailyJournalStatuses.length > 0) {
    await database.dailyJournalStatuses.bulkAdd(
      data.dailyJournalStatuses,
    );
  }
  if (data.weeklyReviews.length > 0) {
    await database.weeklyReviews.bulkAdd(data.weeklyReviews);
  }
  if (data.acceptedCalorieAdjustments.length > 0) {
    await database.acceptedCalorieAdjustments.bulkAdd(
      data.acceptedCalorieAdjustments,
    );
  }
}

async function replaceStrength(
  database: AppDatabase,
  data: BackupData,
): Promise<void> {
  await Promise.all([
    database.strengthSets.clear(),
    database.progressionSuggestions.clear(),
    database.workoutSessionExercises.clear(),
    database.workoutSessions.clear(),
    database.workoutTemplateExercises.clear(),
    database.workoutTemplates.clear(),
    database.exerciseDefinitions.clear(),
  ]);

  if (data.exerciseDefinitions.length > 0) {
    await database.exerciseDefinitions.bulkAdd(
      data.exerciseDefinitions,
    );
  }
  if (data.workoutTemplates.length > 0) {
    await database.workoutTemplates.bulkAdd(
      data.workoutTemplates,
    );
  }
  if (data.workoutTemplateExercises.length > 0) {
    await database.workoutTemplateExercises.bulkAdd(
      data.workoutTemplateExercises,
    );
  }
  if (data.workoutSessions.length > 0) {
    await database.workoutSessions.bulkAdd(
      data.workoutSessions,
    );
  }
  if (data.workoutSessionExercises.length > 0) {
    await database.workoutSessionExercises.bulkAdd(
      data.workoutSessionExercises,
    );
  }
  if (data.strengthSets.length > 0) {
    await database.strengthSets.bulkAdd(data.strengthSets);
  }
  if (data.progressionSuggestions.length > 0) {
    await database.progressionSuggestions.bulkAdd(
      data.progressionSuggestions,
    );
  }

  await ensureExerciseCatalog(database);
}

async function replaceDeletionRecordsForCategories(
  database: AppDatabase,
  data: BackupData,
  categories: ReadonlySet<SelectiveRestoreCategory>,
  includedTables: ReadonlySet<BackupUserStateTableName>,
): Promise<void> {
  if (!includedTables.has('deletionRecords')) return;

  const entityTypes = deletionEntityTypesForCategories(categories);
  if (entityTypes.length === 0) return;

  await database.deletionRecords
    .where('entityType')
    .anyOf(entityTypes)
    .delete();

  const incoming = (data.deletionRecords ?? []).filter(
    ({ entityType }) => entityTypes.includes(entityType),
  );

  if (incoming.length > 0) {
    await database.deletionRecords.bulkAdd(incoming);
  }
}

function restoredRecordCount(
  envelope: BackupEnvelope,
  categories: ReadonlySet<SelectiveRestoreCategory>,
): number {
  let total = 0;

  const includedTables = new Set(
    envelope.includedUserStateTables ?? [],
  );

  for (const category of categories) {
    if (category === 'rewards') {
      total += countUserStateRecords(
        envelope.data,
        REWARD_USER_STATE_TABLE_NAMES.filter((tableName) =>
          includedTables.has(tableName),
        ),
      );
      continue;
    }

    total += countCategoryRecords(envelope.data, category);
  }

  if (!includedTables.has('deletionRecords')) {
    total -= countDeletionRecords(
      envelope.data,
      deletionEntityTypesForCategories(categories),
    );
  }

  return total;
}

export async function applySelectiveBackupRestore(
  prepared: PreparedSelectiveBackupRestore,
  categories: readonly SelectiveRestoreCategory[],
  database: AppDatabase = appDatabase,
): Promise<SelectiveBackupRestoreResult> {
  const selected = new Set(categories);

  if (selected.size === 0) {
    throw new BackupOperationError(
      'Sélectionne au moins un domaine à restaurer.',
    );
  }

  const unavailable = prepared.categories.filter(
    ({ key, available }) =>
      selected.has(key) && !available,
  );

  if (unavailable.length > 0) {
    throw new BackupOperationError(
      `La sauvegarde ne contient pas : ${unavailable
        .map(({ label }) => label)
        .join(', ')}.`,
    );
  }

  try {
    await flushUserStatePersistence();
    await database.transaction(
      'rw',
      allUserDataTableList(database),
      async () => {
        const { data } = prepared.envelope;
        const includedTables = new Set(
          prepared.envelope.includedUserStateTables ?? [],
        );

        if (selected.has('profileSettings')) {
          await replaceProfileSettings(database, data);
        }
        if (selected.has('bodyTracking')) {
          await replaceBodyTracking(database, data);
        }
        if (selected.has('activities')) {
          await replaceActivities(database, data);
        }
        if (selected.has('nutrition')) {
          await replaceNutrition(database, data);
        }
        if (selected.has('strength')) {
          await replaceStrength(database, data);
        }
        if (selected.has('rewards')) {
          await replaceIncludedUserStateTables(
            database,
            data,
            REWARD_USER_STATE_TABLE_NAMES.filter((tableName) =>
              includedTables.has(tableName),
            ),
          );
        }

        await replaceDeletionRecordsForCategories(
          database,
          data,
          selected,
          includedTables,
        );
      },
    );

    if (selected.has('rewards')) {
      await reloadUserStateRuntime(database);
    }
  } catch (error) {
    if (error instanceof BackupOperationError) {
      throw error;
    }

    throw new BackupOperationError(
      'La restauration sélective a échoué. Les données de la base ont été conservées.',
      { cause: error },
    );
  }

  return {
    selectedCategories: [...selected],
    restoredRecordCount: restoredRecordCount(
      prepared.envelope,
      selected,
    ),
  };
}
