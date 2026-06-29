import { createDefaultAppSettings, normalizeAppSettings } from '@/domain/defaults/appSettings';
import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { EntityChanges } from '@/domain/models/common';
import type { AppSettings } from '@/domain/models/settings';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';

export class DexieSettingsRepository implements SettingsRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  get(): Promise<AppSettings> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les paramètres locaux.',
      async () => {
        const settings = await this.database.appSettings.get(APP_SETTINGS_ID);

        if (settings) {
          const normalized = normalizeAppSettings(settings);
          if (
            normalized.backupReminderIntervalDays !== settings.backupReminderIntervalDays
            || normalized.restTimerAutoStart !== settings.restTimerAutoStart
            || normalized.restTimerSoundEnabled !== settings.restTimerSoundEnabled
            || normalized.restTimerVibrationEnabled !== settings.restTimerVibrationEnabled
            || normalized.enduranceTemplates !== settings.enduranceTemplates
            || normalized.enduranceTemplatesVersion !== settings.enduranceTemplatesVersion
            || JSON.stringify(normalized.dashboardPreferences) !== JSON.stringify(settings.dashboardPreferences)
              || JSON.stringify(normalized.routineReminderPreferences) !== JSON.stringify(settings.routineReminderPreferences)
          ) {
            await this.database.appSettings.put(normalized);
          }
          return normalized;
        }

        const defaults = createDefaultAppSettings();
        await this.database.appSettings.put(defaults);
        return defaults;
      },
    );
  }

  update(changes: EntityChanges<AppSettings>): Promise<AppSettings> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier les paramètres locaux.',
      async () => {
        const current = await this.get();
        return updateStoredEntity(
          this.database.appSettings,
          current,
          changes,
        );
      },
    );
  }

  reset(): Promise<AppSettings> {
    return runRepositoryOperation(
      'update',
      'Impossible de réinitialiser les paramètres locaux.',
      async () => {
        const defaults = createDefaultAppSettings();
        await this.database.appSettings.put(defaults);
        return defaults;
      },
    );
  }
}
