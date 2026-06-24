import { z } from 'zod';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { BackupData, BackupEnvelope } from '@/domain/models/backup';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  migrateBackupEnvelope,
} from '@/infrastructure/backup/backupMigrations';
import { formatBackupValidationError } from '@/infrastructure/backup/backupSchemas';

export const MAX_BACKUP_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export class BackupOperationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupOperationError';
  }
}

export interface BackupSummary {
  hasProfile: boolean;
  totalRecords: number;
  weights: number;
  dailySteps: number;
  activities: number;
  foodProducts: number;
  foodEntries: number;
  recipes: number;
  favoriteMeals: number;
  weeklyReviews: number;
  exportedAt: string;
  schemaVersion: number;
}

function tableList(database: AppDatabase) {
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
  ] as const;
}

async function readBackupData(database: AppDatabase): Promise<BackupData> {
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
  ] = await Promise.all(tableList(database).map((table) => table.toArray()));

  return {
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

export function parseBackupText(text: string): BackupEnvelope {
  if (!text.trim()) {
    throw new BackupOperationError('Le fichier de sauvegarde est vide.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch (error) {
    throw new BackupOperationError('Le fichier ne contient pas un JSON valide.', { cause: error });
  }

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

export function summarizeBackup(envelope: BackupEnvelope): BackupSummary {
  const { data } = envelope;
  const totalRecords = Object.values(data).reduce((total, records) => total + records.length, 0);
  return {
    hasProfile: data.userProfile.length === 1,
    totalRecords,
    weights: data.weights.length,
    dailySteps: data.dailySteps.length,
    activities: data.activities.length,
    foodProducts: data.foodProducts.length,
    foodEntries: data.foodEntries.length,
    recipes: data.recipes.length,
    favoriteMeals: data.favoriteMeals.length,
    weeklyReviews: data.weeklyReviews.length,
    exportedAt: envelope.exportedAt,
    schemaVersion: envelope.schemaVersion,
  };
}

async function clearTables(database: AppDatabase): Promise<void> {
  for (const table of tableList(database)) {
    await table.clear();
  }
}

async function populateTables(database: AppDatabase, data: BackupData): Promise<void> {
  if (data.userProfile.length > 0) await database.userProfile.bulkAdd(data.userProfile);
  await database.appSettings.bulkAdd(data.appSettings);
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
}

export async function replaceDatabaseFromBackup(
  envelope: BackupEnvelope,
  database: AppDatabase = appDatabase,
): Promise<void> {
  try {
    await database.transaction('rw', tableList(database), async () => {
      await clearTables(database);
      await populateTables(database, envelope.data);
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
    });
  } catch (error) {
    throw new BackupOperationError('Les données locales n’ont pas pu être effacées.', { cause: error });
  }
}
