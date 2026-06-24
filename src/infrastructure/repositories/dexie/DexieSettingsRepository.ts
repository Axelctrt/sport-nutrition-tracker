import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { EntityChanges } from '@/domain/models/common';
import type { AppSettings } from '@/domain/models/settings';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateEntity } from '@/shared/utils/entities';

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
          return settings;
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
        const updated = updateEntity(current, changes);
        await this.database.appSettings.put(updated);
        return updated;
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
