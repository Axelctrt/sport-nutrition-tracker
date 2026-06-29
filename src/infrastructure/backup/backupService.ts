import { z } from 'zod';
import { ensureExerciseCatalog } from '@/application/strength/exerciseCatalogSeeder';
import {
  createDefaultUserSettings,
  normalizeUserSettings,
} from '@/domain/defaults/appSettings';
import {
  BACKUP_USER_STATE_TABLE_NAMES,
  type BackupData,
  type BackupEnvelope,
  type BackupUserStateTableName,
} from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  migrateBackupEnvelope,
} from '@/infrastructure/backup/backupMigrations';
import { formatBackupValidationError } from '@/infrastructure/backup/backupSchemas';
import { appDatabase } from '@/infrastructure/database/database';
import {
  flushUserStatePersistence,
  reloadUserStateRuntime,
} from '@/infrastructure/user-state/userStateRuntime';

export const MAX_BACKUP_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export class BackupOperationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupOperationError';
  }
}

export interface BackupSummary {
  hasProfile: boolean;
  profileCount: number;
  totalRecords: number;
  weights: number;
  dailySteps: number;
  activities: number;
  foodProducts: number;
  foodEntries: number;
  recipes: number;
  favoriteMeals: number;
  weeklyReviews: number;
  workoutSessions: number;
  strengthSets: number;
  exportedAt: string;
  schemaVersion: number;
  sourceSchemaVersion: number;
  appVersion?: string;
  requiresMigration: boolean;
  compatibility: 'compatible';
}

export interface ParsedBackup {
  envelope: BackupEnvelope;
  sourceSchemaVersion: number;
  requiresMigration: boolean;
}

export function tableList(database: AppDatabase) {
  return [
    database.userProfile,
    database.userSettings,
    database.weights,
    database.dailySteps,
    database.activities,
    database.foodProducts,
    database.meals,
    database.foodEntries,
    database.favoriteMeals,
    database.recipes,
    database.recipeIngredients,
    database.dailyTargets,
    database.dailyJournalStatuses,
    database.weeklyReviews,
    database.acceptedCalorieAdjustments,
    database.exerciseDefinitions,
    database.workoutTemplates,
    database.workoutTemplateExercises,
    database.workoutSessions,
    database.workoutSessionExercises,
    database.strengthSets,
    database.progressionSuggestions,
  ] as const;
}

export function userStateTableList(database: AppDatabase) {
  return [
    database.goals,
    database.endurancePlanningSessions,
    database.earnedAchievements,
    database.unlockedVisualThemes,
    database.visualThemePreferences,
    database.weeklyMissionCompletions,
    database.routineReminderCompletions,
  ] as const;
}

export function allUserDataTableList(database: AppDatabase) {
  return [
    ...tableList(database),
    ...userStateTableList(database),
  ] as const;
}

export async function readBackupData(
  database: AppDatabase,
): Promise<BackupData> {
  const [
    userProfile,
    userSettings,
    weights,
    dailySteps,
    activities,
    foodProducts,
    meals,
    foodEntries,
    favoriteMeals,
    recipes,
    recipeIngredients,
    dailyTargets,
    dailyJournalStatuses,
    weeklyReviews,
    acceptedCalorieAdjustments,
    exerciseDefinitions,
    workoutTemplates,
    workoutTemplateExercises,
    workoutSessions,
    workoutSessionExercises,
    strengthSets,
    progressionSuggestions,
    goals,
    endurancePlanningSessions,
    earnedAchievements,
    unlockedVisualThemes,
    visualThemePreferences,
    weeklyMissionCompletions,
    routineReminderCompletions,
  ] = await Promise.all([
    database.userProfile.toArray(),
    database.userSettings.toArray(),
    database.weights.toArray(),
    database.dailySteps.toArray(),
    database.activities.toArray(),
    database.foodProducts.toArray(),
    database.meals.toArray(),
    database.foodEntries.toArray(),
    database.favoriteMeals.toArray(),
    database.recipes.toArray(),
    database.recipeIngredients.toArray(),
    database.dailyTargets.toArray(),
    database.dailyJournalStatuses.toArray(),
    database.weeklyReviews.toArray(),
    database.acceptedCalorieAdjustments.toArray(),
    database.exerciseDefinitions.toArray(),
    database.workoutTemplates.toArray(),
    database.workoutTemplateExercises.toArray(),
    database.workoutSessions.toArray(),
    database.workoutSessionExercises.toArray(),
    database.strengthSets.toArray(),
    database.progressionSuggestions.toArray(),
    database.goals.toArray(),
    database.endurancePlanningSessions.toArray(),
    database.earnedAchievements.toArray(),
    database.unlockedVisualThemes.toArray(),
    database.visualThemePreferences.toArray(),
    database.weeklyMissionCompletions.toArray(),
    database.routineReminderCompletions.toArray(),
  ]);

  return {
    userProfile,
    userSettings: userSettings.map(normalizeUserSettings),
    weights,
    dailySteps,
    activities,
    foodProducts,
    meals,
    foodEntries,
    favoriteMeals,
    recipes,
    recipeIngredients,
    dailyTargets,
    dailyJournalStatuses,
    weeklyReviews,
    acceptedCalorieAdjustments,
    exerciseDefinitions,
    workoutTemplates,
    workoutTemplateExercises,
    workoutSessions,
    workoutSessionExercises,
    strengthSets,
    progressionSuggestions,
    goals,
    endurancePlanningSessions,
    earnedAchievements,
    unlockedVisualThemes,
    visualThemePreferences,
    weeklyMissionCompletions,
    routineReminderCompletions,
  };
}

export async function createBackupEnvelope(
  database: AppDatabase = appDatabase,
  exportedAt: string = new Date().toISOString(),
): Promise<BackupEnvelope> {
  try {
    await flushUserStatePersistence();
    const data = await readBackupData(database);

    return {
      format: 'sportpilot-backup',
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
      exportedAt,
      appVersion: __APP_VERSION__,
      includedUserStateTables: [
        ...BACKUP_USER_STATE_TABLE_NAMES,
      ],
      data,
    };
  } catch (error) {
    throw new BackupOperationError(
      'La sauvegarde locale n’a pas pu être créée.',
      { cause: error },
    );
  }
}

export function serializeBackupEnvelope(
  envelope: BackupEnvelope,
): string {
  return JSON.stringify(envelope, null, 2);
}

export function createBackupFileName(exportedAt: string): string {
  const date = new Date(exportedAt);
  if (Number.isNaN(date.getTime())) {
    return 'sportpilot-backup.json';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    'sportpilot-backup-',
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    '.json',
  ].join('');
}

function parseRawBackupText(text: string): unknown {
  if (!text.trim()) {
    throw new BackupOperationError(
      'Le fichier de sauvegarde est vide.',
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new BackupOperationError(
      'Le fichier ne contient pas un JSON valide.',
      { cause: error },
    );
  }
}

function readSourceSchemaVersion(raw: unknown): number {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    Array.isArray(raw)
  ) {
    return 0;
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  return Number.isInteger(version) ? Number(version) : 0;
}

function migrateParsedBackup(raw: unknown): BackupEnvelope {
  try {
    return migrateBackupEnvelope(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BackupOperationError(
        `La sauvegarde ne respecte pas le format attendu.\n${formatBackupValidationError(error)}`,
        { cause: error },
      );
    }
    throw new BackupOperationError(
      error instanceof Error
        ? error.message
        : 'La sauvegarde est invalide.',
      { cause: error },
    );
  }
}

export function parseBackupTextWithMetadata(
  text: string,
): ParsedBackup {
  const raw = parseRawBackupText(text);
  const sourceSchemaVersion = readSourceSchemaVersion(raw);
  const envelope = migrateParsedBackup(raw);

  return {
    envelope,
    sourceSchemaVersion,
    requiresMigration:
      sourceSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION,
  };
}

export function parseBackupText(text: string): BackupEnvelope {
  return parseBackupTextWithMetadata(text).envelope;
}

export function summarizeBackup(
  envelope: BackupEnvelope,
  metadata: Pick<
    ParsedBackup,
    'sourceSchemaVersion' | 'requiresMigration'
  > = {
    sourceSchemaVersion: envelope.schemaVersion,
    requiresMigration: false,
  },
): BackupSummary {
  const { data } = envelope;
  const totalRecords = Object.values(data).reduce(
    (total, records) =>
      total + (Array.isArray(records) ? records.length : 0),
    0,
  );

  return {
    hasProfile: data.userProfile.length === 1,
    profileCount: data.userProfile.length,
    totalRecords,
    weights: data.weights.length,
    dailySteps: data.dailySteps.length,
    activities: data.activities.length,
    foodProducts: data.foodProducts.length,
    foodEntries: data.foodEntries.length,
    recipes: data.recipes.length,
    favoriteMeals: data.favoriteMeals.length,
    weeklyReviews: data.weeklyReviews.length,
    workoutSessions: data.workoutSessions.length,
    strengthSets: data.strengthSets.length,
    exportedAt: envelope.exportedAt,
    schemaVersion: envelope.schemaVersion,
    sourceSchemaVersion: metadata.sourceSchemaVersion,
    ...(envelope.appVersion === undefined
      ? {}
      : { appVersion: envelope.appVersion }),
    requiresMigration: metadata.requiresMigration,
    compatibility: 'compatible',
  };
}

async function clearTables(database: AppDatabase): Promise<void> {
  for (const table of tableList(database)) {
    await table.clear();
  }
}

async function populateTables(
  database: AppDatabase,
  data: BackupData,
): Promise<void> {
  if (data.userProfile.length > 0) {
    await database.userProfile.bulkAdd(data.userProfile);
  }
  await database.userSettings.bulkAdd(
    (data.userSettings ?? []).map(normalizeUserSettings),
  );
  if (data.weights.length > 0) {
    await database.weights.bulkAdd(data.weights);
  }
  if (data.dailySteps.length > 0) {
    await database.dailySteps.bulkAdd(data.dailySteps);
  }
  if (data.activities.length > 0) {
    await database.activities.bulkAdd(data.activities);
  }
  if (data.foodProducts.length > 0) {
    await database.foodProducts.bulkAdd(data.foodProducts);
  }
  if (data.meals.length > 0) {
    await database.meals.bulkAdd(data.meals);
  }
  if (data.foodEntries.length > 0) {
    await database.foodEntries.bulkAdd(data.foodEntries);
  }
  if (data.favoriteMeals.length > 0) {
    await database.favoriteMeals.bulkAdd(data.favoriteMeals);
  }
  if (data.recipes.length > 0) {
    await database.recipes.bulkAdd(data.recipes);
  }
  if (data.recipeIngredients.length > 0) {
    await database.recipeIngredients.bulkAdd(
      data.recipeIngredients,
    );
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
}

function includedUserStateTables(
  envelope: BackupEnvelope,
): ReadonlySet<BackupUserStateTableName> {
  return new Set(envelope.includedUserStateTables ?? []);
}

async function clearIncludedUserStateTables(
  database: AppDatabase,
  included: ReadonlySet<BackupUserStateTableName>,
): Promise<void> {
  for (const tableName of BACKUP_USER_STATE_TABLE_NAMES) {
    if (!included.has(tableName)) continue;

    switch (tableName) {
      case 'goals':
        await database.goals.clear();
        break;
      case 'endurancePlanningSessions':
        await database.endurancePlanningSessions.clear();
        break;
      case 'earnedAchievements':
        await database.earnedAchievements.clear();
        break;
      case 'unlockedVisualThemes':
        await database.unlockedVisualThemes.clear();
        break;
      case 'visualThemePreferences':
        await database.visualThemePreferences.clear();
        break;
      case 'weeklyMissionCompletions':
        await database.weeklyMissionCompletions.clear();
        break;
      case 'routineReminderCompletions':
        await database.routineReminderCompletions.clear();
        break;
    }
  }
}

async function populateIncludedUserStateTables(
  database: AppDatabase,
  data: BackupData,
  included: ReadonlySet<BackupUserStateTableName>,
): Promise<void> {
  if (included.has('goals') && (data.goals?.length ?? 0) > 0) {
    await database.goals.bulkAdd(data.goals ?? []);
  }
  if (
    included.has('endurancePlanningSessions') &&
    (data.endurancePlanningSessions?.length ?? 0) > 0
  ) {
    await database.endurancePlanningSessions.bulkAdd(
      data.endurancePlanningSessions ?? [],
    );
  }
  if (
    included.has('earnedAchievements') &&
    (data.earnedAchievements?.length ?? 0) > 0
  ) {
    await database.earnedAchievements.bulkAdd(
      data.earnedAchievements ?? [],
    );
  }
  if (
    included.has('unlockedVisualThemes') &&
    (data.unlockedVisualThemes?.length ?? 0) > 0
  ) {
    await database.unlockedVisualThemes.bulkAdd(
      data.unlockedVisualThemes ?? [],
    );
  }
  if (
    included.has('visualThemePreferences') &&
    (data.visualThemePreferences?.length ?? 0) > 0
  ) {
    await database.visualThemePreferences.bulkAdd(
      data.visualThemePreferences ?? [],
    );
  }
  if (
    included.has('weeklyMissionCompletions') &&
    (data.weeklyMissionCompletions?.length ?? 0) > 0
  ) {
    await database.weeklyMissionCompletions.bulkAdd(
      data.weeklyMissionCompletions ?? [],
    );
  }
  if (
    included.has('routineReminderCompletions') &&
    (data.routineReminderCompletions?.length ?? 0) > 0
  ) {
    await database.routineReminderCompletions.bulkAdd(
      data.routineReminderCompletions ?? [],
    );
  }
}

export async function replaceIncludedUserStateTables(
  database: AppDatabase,
  data: BackupData,
  tableNames: readonly BackupUserStateTableName[],
): Promise<void> {
  const included = new Set(tableNames);
  await clearIncludedUserStateTables(database, included);
  await populateIncludedUserStateTables(
    database,
    data,
    included,
  );
}

export async function replaceDatabaseFromBackup(
  envelope: BackupEnvelope,
  database: AppDatabase = appDatabase,
): Promise<void> {
  const included = includedUserStateTables(envelope);

  try {
    await flushUserStatePersistence();
    await database.transaction(
      'rw',
      allUserDataTableList(database),
      async () => {
        await clearTables(database);
        await populateTables(database, envelope.data);
        await replaceIncludedUserStateTables(
          database,
          envelope.data,
          [...included],
        );
        await ensureExerciseCatalog(database);
      },
    );

    if (included.size > 0) {
      await reloadUserStateRuntime(database);
    }
  } catch (error) {
    throw new BackupOperationError(
      'La restauration a échoué. Les données précédentes ont été conservées.',
      { cause: error },
    );
  }
}

export async function clearAllUserData(
  database: AppDatabase = appDatabase,
): Promise<void> {
  try {
    await database.transaction(
      'rw',
      allUserDataTableList(database),
      async () => {
        await clearTables(database);
        for (const table of userStateTableList(database)) {
          await table.clear();
        }
        await database.userSettings.add(createDefaultUserSettings());
        await ensureExerciseCatalog(database);
      },
    );
    await reloadUserStateRuntime(database);
  } catch (error) {
    throw new BackupOperationError(
      'Les données locales n’ont pas pu être effacées.',
      { cause: error },
    );
  }
}
