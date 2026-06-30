import {
  composeAppSettings,
  createDefaultDeviceSettings,
  createDefaultUserSettings,
  normalizeDeviceSettings,
  normalizeUserSettings,
} from '@/domain/defaults/appSettings';
import {
  DEVICE_SETTINGS_ID,
  USER_SETTINGS_ID,
} from '@/domain/defaults/identifiers';
import type { EntityChanges } from '@/domain/models/common';
import type {
  AppSettings,
  DeviceSettings,
  UserSettings,
} from '@/domain/models/settings';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { updateStoredEntity } from '@/infrastructure/repositories/dexie/updateStoredEntity';
import { notifyAutomaticWeightSyncPreferenceChanged } from '@/infrastructure/sync-prototype/weightSyncEvents';

const deviceSettingKeys = new Set<keyof AppSettings>([
  'theme',
  'requestPersistentStorage',
  'backupReminderIntervalDays',
  'restTimerAutoStart',
  'restTimerSoundEnabled',
  'restTimerVibrationEnabled',
  'automaticWeightSyncEnabled',
  'automaticWeightSyncAccountFingerprint',
  'lastBackupExportedAt',
  'lastBackupAppVersion',
  'lastBackupSchemaVersion',
]);

export class DexieSettingsRepository implements SettingsRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  private async readParts(): Promise<{
    user: UserSettings;
    device: DeviceSettings;
  }> {
    const [storedUser, storedDevice] = await Promise.all([
      this.database.userSettings.get(USER_SETTINGS_ID),
      this.database.deviceSettings.get(DEVICE_SETTINGS_ID),
    ]);

    const user = normalizeUserSettings(
      storedUser ?? createDefaultUserSettings(),
    );
    const device = normalizeDeviceSettings(
      storedDevice ?? createDefaultDeviceSettings(),
    );

    await Promise.all([
      this.database.userSettings.put(user),
      this.database.deviceSettings.put(device),
    ]);

    return { user, device };
  }

  get(): Promise<AppSettings> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les paramètres locaux.',
      async () => {
        const { user, device } = await this.readParts();
        return composeAppSettings(user, device);
      },
    );
  }

  update(changes: EntityChanges<AppSettings>): Promise<AppSettings> {
    return runRepositoryOperation(
      'update',
      'Impossible de modifier les paramètres locaux.',
      async () => {
        const { user, device } = await this.readParts();
        const userChanges: Record<string, unknown> = {};
        const deviceChanges: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(changes)) {
          if (deviceSettingKeys.has(key as keyof AppSettings)) {
            deviceChanges[key] = value;
          } else {
            userChanges[key] = value;
          }
        }

        const [updatedUser, updatedDevice] = await Promise.all([
          Object.keys(userChanges).length === 0
            ? user
            : updateStoredEntity(
                this.database.userSettings,
                user,
                userChanges as EntityChanges<UserSettings>,
              ),
          Object.keys(deviceChanges).length === 0
            ? device
            : updateStoredEntity(
                this.database.deviceSettings,
                device,
                deviceChanges as EntityChanges<DeviceSettings>,
              ),
        ]);

        const composed = composeAppSettings(updatedUser, updatedDevice);
        notifyAutomaticWeightSyncPreferenceChanged(
          composed.automaticWeightSyncEnabled,
        );
        return composed;
      },
    );
  }

  reset(): Promise<AppSettings> {
    return runRepositoryOperation(
      'update',
      'Impossible de réinitialiser les paramètres locaux.',
      async () => {
        const existingDevice = await this.database.deviceSettings.get(
          DEVICE_SETTINGS_ID,
        );
        const user = createDefaultUserSettings();
        const device = createDefaultDeviceSettings(
          existingDevice?.deviceId,
        );
        await this.database.transaction(
          'rw',
          this.database.userSettings,
          this.database.deviceSettings,
          async () => {
            await this.database.userSettings.put(user);
            await this.database.deviceSettings.put(device);
          },
        );
        const composed = composeAppSettings(user, device);
        notifyAutomaticWeightSyncPreferenceChanged(
          composed.automaticWeightSyncEnabled,
        );
        return composed;
      },
    );
  }
}
