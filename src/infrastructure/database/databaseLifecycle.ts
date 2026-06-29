import { ensureExerciseCatalog } from "@/application/strength/exerciseCatalogSeeder";
import {
  composeAppSettings,
  createDefaultDeviceSettings,
  createDefaultUserSettings,
} from "@/domain/defaults/appSettings";
import {
  DEVICE_SETTINGS_ID,
  USER_SETTINGS_ID,
} from "@/domain/defaults/identifiers";
import { RepositoryError } from "@/domain/errors/RepositoryError";
import type { AppSettings } from "@/domain/models/settings";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";
import { ensureCurrentMigrationJournalEntry } from "@/infrastructure/database/migrationJournal";
import { initializeUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

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

    await ensureCurrentMigrationJournalEntry(database);
    await ensureExerciseCatalog(database);
    await initializeUserStateRuntime(database);

    const [storedUser, storedDevice] = await Promise.all([
      database.userSettings.get(USER_SETTINGS_ID),
      database.deviceSettings.get(DEVICE_SETTINGS_ID),
    ]);
    const createdDefaultSettings = !storedUser || !storedDevice;
    const user = storedUser ?? createDefaultUserSettings();
    const device = storedDevice ?? createDefaultDeviceSettings();

    await Promise.all([
      database.userSettings.put(user),
      database.deviceSettings.put(device),
    ]);

    return {
      settings: composeAppSettings(user, device),
      createdDefaultSettings,
    };
  } catch (error) {
    throw new RepositoryError(
      "Impossible d'initialiser la base de données locale.",
      "initialize",
      { cause: error },
    );
  }
}

export function closeDatabase(database: AppDatabase = appDatabase): void {
  database.close();
}
