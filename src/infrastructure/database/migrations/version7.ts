import type Dexie from 'dexie';
import type { AppSettings } from '@/domain/models/settings';
import {
  createDefaultAppSettings,
  splitAppSettings,
} from '@/domain/defaults/appSettings';
import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import { createMigrationJournalEntry } from '@/infrastructure/database/migrationJournal';
import {
  DATABASE_VERSION_6,
  DATABASE_VERSION_7,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion7 } from '@/infrastructure/database/schema';

function normalizeLegacySettings(value: Partial<AppSettings> | undefined): AppSettings {
  const defaults = createDefaultAppSettings();
  const legacyTheme =
    value && 'appearanceMode' in value
      ? (value as Partial<AppSettings> & { appearanceMode?: unknown }).appearanceMode
      : undefined;

  return {
    ...defaults,
    ...value,
    id: APP_SETTINGS_ID,
    theme:
      value?.theme ??
      (legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'system'
        ? legacyTheme
        : defaults.theme),
    swimmingMetValues: {
      ...defaults.swimmingMetValues,
      ...value?.swimmingMetValues,
    },
    createdAt: value?.createdAt ?? defaults.createdAt,
    updatedAt: value?.updatedAt ?? defaults.updatedAt,
  };
}

export function registerVersion7(database: Dexie): void {
  database
    .version(DATABASE_VERSION_7)
    .stores(schemaVersion7)
    .upgrade(async (transaction) => {
      const legacy = await transaction
        .table<AppSettings, string>('appSettings')
        .get(APP_SETTINGS_ID);
      const { user, device } = splitAppSettings(
        normalizeLegacySettings(legacy),
      );

      await transaction.table('userSettings').put(user);
      await transaction.table('deviceSettings').put(device);
      await transaction.table('migrationJournal').put(
        createMigrationJournalEntry({
          version: DATABASE_VERSION_7,
          previousVersion: DATABASE_VERSION_6,
          source: 'migration',
          description:
            'Séparation des paramètres utilisateur synchronisables et des préférences locales à l’appareil.',
        }),
      );
    });
}
