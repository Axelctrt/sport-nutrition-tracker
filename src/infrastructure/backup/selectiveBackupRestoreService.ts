import { ensureExerciseCatalog } from '@/application/strength/exerciseCatalogSeeder';
import { normalizeAppSettings } from '@/domain/defaults/appSettings';
import type {
  BackupData,
  BackupEnvelope,
} from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  BackupOperationError,
  parseBackupTextWithMetadata,
  readBackupData,
  summarizeBackup,
  tableList,
  type BackupSummary,
} from '@/infrastructure/backup/backupService';
import {
  readRewardBackupState,
  restoreRewardBackupState,
} from '@/infrastructure/backup/rewardBackupState';
import { appDatabase } from '@/infrastructure/database/database';

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
      label: 'Récompenses et thèmes',
      description:
        'Badges, thèmes débloqués et historique des missions hebdomadaires.',
    },
  ];

function countCategoryRecords(
  data: BackupData,
  category: Exclude<SelectiveRestoreCategory, 'rewards'>,
): number {
  switch (category) {
    case 'profileSettings':
      return data.userProfile.length + data.appSettings.length;
    case 'bodyTracking':
      return data.weights.length + data.dailySteps.length;
    case 'activities':
      return data.activities.length;
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
        data.acceptedCalorieAdjustments.length
      );
    case 'strength':
      return (
        data.exerciseDefinitions.length +
        data.workoutTemplates.length +
        data.workoutTemplateExercises.length +
        data.workoutSessions.length +
        data.workoutSessionExercises.length +
        data.strengthSets.length +
        data.progressionSuggestions.length
      );
  }
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
          return {
            ...definition,
            currentRecords: 1,
            incomingRecords:
              envelope.rewardState === undefined ? 0 : 1,
            available: envelope.rewardState !== undefined,
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
  await database.appSettings.clear();

  if (data.userProfile.length > 0) {
    await database.userProfile.bulkAdd(data.userProfile);
  }

  await database.appSettings.bulkAdd(
    data.appSettings.map(normalizeAppSettings),
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

function restoredRecordCount(
  envelope: BackupEnvelope,
  categories: ReadonlySet<SelectiveRestoreCategory>,
): number {
  let total = 0;

  for (const category of categories) {
    if (category === 'rewards') {
      total += envelope.rewardState === undefined ? 0 : 1;
    } else {
      total += countCategoryRecords(
        envelope.data,
        category,
      );
    }
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

  const previousRewards = selected.has('rewards')
    ? readRewardBackupState()
    : undefined;

  try {
    if (selected.has('rewards')) {
      const rewardState = prepared.envelope.rewardState;
      if (!rewardState) {
        throw new BackupOperationError(
          'Cette sauvegarde ne contient pas de progression de récompenses.',
        );
      }
      await restoreRewardBackupState(rewardState, database);
    }

    const hasDatabaseSelection = [...selected].some(
      (category) => category !== 'rewards',
    );

    if (hasDatabaseSelection) {
      await database.transaction(
        'rw',
        tableList(database),
        async () => {
          const { data } = prepared.envelope;

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
        },
      );
    }
  } catch (error) {
    if (previousRewards) {
      try {
        await restoreRewardBackupState(
          previousRewards,
          database,
        );
      } catch {
        // La sauvegarde JSON téléchargée reste le point de retour fiable.
      }
    }

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
