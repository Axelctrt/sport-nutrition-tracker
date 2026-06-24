import type { AppSettings } from '@/domain/models/settings';
import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';

export interface DatabaseInitializationResult {
  settings: AppSettings;
  createdDefaultSettings: boolean;
}

export async function initializeDatabase(
  database: AppDatabase = appDatabase,
): Promise<DatabaseInitializationResult> {
  try {
    if (!database.isOpen()) {
      await database.open();
    }

    const existingSettings = await database.appSettings.get(APP_SETTINGS_ID);

    if (existingSettings) {
      return {
        settings: existingSettings,
        createdDefaultSettings: false,
      };
    }

    const settings = createDefaultAppSettings();
    await database.appSettings.add(settings);

    return {
      settings,
      createdDefaultSettings: true,
    };
  } catch (error) {
    throw new RepositoryError(
      "Impossible d'initialiser la base de données locale.",
      'initialize',
      { cause: error },
    );
  }
}

export function closeDatabase(database: AppDatabase = appDatabase): void {
  database.close();
}
