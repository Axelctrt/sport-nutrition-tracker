import { z } from 'zod';
import { ensureExerciseCatalog } from '@/application/strength/exerciseCatalogSeeder';
import { createDefaultAppSettings, normalizeAppSettings } from '@/domain/defaults/appSettings';
import type { BackupData, BackupEnvelope } from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  migrateBackupEnvelope,
} from '@/infrastructure/backup/backupMigrations';
import { formatBackupValidationError } from '@/infrastructure/backup/backupSchemas';
import { appDatabase } from '@/infrastructure/database/database';

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
    database.appSettings,
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

export async function readBackupData(database: AppDatabase): Promise<BackupData> {
  const [
    userProfile,
    appSettings,
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
  ] = await Promise.all(tableList(database).map((table) => table.toArray()));

  return {
    userProfile,
    appSettings: ((appSettings ?? []) as BackupData['appSettings']).map(normalizeAppSettings),
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
  } as BackupData;
}

export async function createBackupEnvelope(
  database: AppDatabase = appDatabase,
  exportedAt: string = new Date().toISOString(),
): Promise<BackupEnvelope> {
  try {
    const data = await readBackupData(database);
    return {
      format: 'sportpilot-backup',
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
      exportedAt,
      appVersion: __APP_VERSION__,
      data,
    };
  } catch (error) {
    throw new BackupOperationError('La sauvegarde locale n’a pas pu être créée.', { cause: error });
  }
}

export function serializeBackupEnvelope(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export function createBackupFileName(exportedAt: string): string {
  const date = new Date(exportedAt);
  if (Number.isNaN(date.getTime())) return 'sportpilot-backup.json';
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
    throw new BackupOperationError('Le fichier de sauvegarde est vide.');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new BackupOperationError('Le fichier ne contient pas un JSON valide.', { cause: error });
  }
}

function readSourceSchemaVersion(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 0;
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
      error instanceof Error ? error.message : 'La sauvegarde est invalide.',
      { cause: error },
    );
  }
}

export function parseBackupTextWithMetadata(text: string): ParsedBackup {
  const raw = parseRawBackupText(text);
  const sourceSchemaVersion = readSourceSchemaVersion(raw);
  const envelope = migrateParsedBackup(raw);

  return {
    envelope,
    sourceSchemaVersion,
    requiresMigration: sourceSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION,
  };
}

export function parseBackupText(text: string): BackupEnvelope {
  return parseBackupTextWithMetadata(text).envelope;
}

export function summarizeBackup(
  envelope: BackupEnvelope,
  metadata: Pick<ParsedBackup, 'sourceSchemaVersion' | 'requiresMigration'> = {
    sourceSchemaVersion: envelope.schemaVersion,
    requiresMigration: false,
  },
): BackupSummary {
  const { data } = envelope;
  const totalRecords = Object.values(data).reduce((total, records) => total + records.length, 0);
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
    ...(envelope.appVersion === undefined ? {} : { appVersion: envelope.appVersion }),
    requiresMigration: metadata.requiresMigration,
    compatibility: 'compatible',
  };
}

async function clearTables(database: AppDatabase): Promise<void> {
  for (const table of tableList(database)) {
    await table.clear();
  }
}

async function populateTables(database: AppDatabase, data: BackupData): Promise<void> {
  if (data.userProfile.length > 0) await database.userProfile.bulkAdd(data.userProfile);
  await database.appSettings.bulkAdd(data.appSettings.map(normalizeAppSettings));
  if (data.weights.length > 0) await database.weights.bulkAdd(data.weights);
  if (data.dailySteps.length > 0) await database.dailySteps.bulkAdd(data.dailySteps);
  if (data.activities.length > 0) await database.activities.bulkAdd(data.activities);
  if (data.foodProducts.length > 0) await database.foodProducts.bulkAdd(data.foodProducts);
  if (data.meals.length > 0) await database.meals.bulkAdd(data.meals);
  if (data.foodEntries.length > 0) await database.foodEntries.bulkAdd(data.foodEntries);
  if (data.favoriteMeals.length > 0) await database.favoriteMeals.bulkAdd(data.favoriteMeals);
  if (data.recipes.length > 0) await database.recipes.bulkAdd(data.recipes);
  if (data.recipeIngredients.length > 0) await database.recipeIngredients.bulkAdd(data.recipeIngredients);
  if (data.dailyTargets.length > 0) await database.dailyTargets.bulkAdd(data.dailyTargets);
  if (data.dailyJournalStatuses.length > 0) {
    await database.dailyJournalStatuses.bulkAdd(data.dailyJournalStatuses);
  }
  if (data.weeklyReviews.length > 0) await database.weeklyReviews.bulkAdd(data.weeklyReviews);
  if (data.acceptedCalorieAdjustments.length > 0) {
    await database.acceptedCalorieAdjustments.bulkAdd(data.acceptedCalorieAdjustments);
  }
  if (data.exerciseDefinitions.length > 0) {
    await database.exerciseDefinitions.bulkAdd(data.exerciseDefinitions);
  }
  if (data.workoutTemplates.length > 0) {
    await database.workoutTemplates.bulkAdd(data.workoutTemplates);
  }
  if (data.workoutTemplateExercises.length > 0) {
    await database.workoutTemplateExercises.bulkAdd(data.workoutTemplateExercises);
  }
  if (data.workoutSessions.length > 0) {
    await database.workoutSessions.bulkAdd(data.workoutSessions);
  }
  if (data.workoutSessionExercises.length > 0) {
    await database.workoutSessionExercises.bulkAdd(data.workoutSessionExercises);
  }
  if (data.strengthSets.length > 0) {
    await database.strengthSets.bulkAdd(data.strengthSets);
  }
  if (data.progressionSuggestions.length > 0) {
    await database.progressionSuggestions.bulkAdd(data.progressionSuggestions);
  }
}

export async function replaceDatabaseFromBackup(
  envelope: BackupEnvelope,
  database: AppDatabase = appDatabase,
): Promise<void> {
  try {
    await database.transaction('rw', tableList(database), async () => {
      await clearTables(database);
      await populateTables(database, envelope.data);
      await ensureExerciseCatalog(database);
    });
  } catch (error) {
    throw new BackupOperationError(
      'La restauration a échoué. Les données précédentes ont été conservées.',
      { cause: error },
    );
  }
}

export async function clearAllUserData(database: AppDatabase = appDatabase): Promise<void> {
  try {
    await database.transaction('rw', tableList(database), async () => {
      await clearTables(database);
      await database.appSettings.add(createDefaultAppSettings());
      await ensureExerciseCatalog(database);
    });
  } catch (error) {
    throw new BackupOperationError('Les données locales n’ont pas pu être effacées.', { cause: error });
  }
}
