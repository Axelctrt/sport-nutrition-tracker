import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { APP_SETTINGS_ID, LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { BackupEnvelope } from '@/domain/models/backup';
import type { UserProfile } from '@/domain/models/profile';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import {
  clearAllUserData,
  createBackupEnvelope,
  parseBackupText,
  replaceDatabaseFromBackup,
  serializeBackupEnvelope,
  summarizeBackup,
} from '@/infrastructure/backup/backupService';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-backup-test-${crypto.randomUUID()}`);
}

function createEnvelope(overrides: Partial<BackupEnvelope['data']> = {}): BackupEnvelope {
  return {
    format: 'sportpilot-backup',
    schemaVersion: 1,
    exportedAt: '2026-06-24T10:00:00.000Z',
    data: {
      userProfile: [createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID)],
      appSettings: [createDefaultAppSettings()],
      weights: [],
      dailySteps: [],
      activities: [],
      foodProducts: [],
      meals: [],
      foodEntries: [],
      favoriteMeals: [],
      recipes: [],
      recipeIngredients: [],
      dailyTargets: [],
      dailyJournalStatuses: [],
      weeklyReviews: [],
      acceptedCalorieAdjustments: [],
      ...overrides,
    },
  };
}

describe('backupService', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await initializeDatabase(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('exporte toutes les tables et produit un JSON réimportable', async () => {
    await database.userProfile.add(
      createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID),
    );
    await database.weights.add(
      createEntity({ date: '2026-06-23', weightKg: 60 }, 'weight-1'),
    );

    const envelope = await createBackupEnvelope(database, '2026-06-24T10:00:00.000Z');
    const parsed = parseBackupText(serializeBackupEnvelope(envelope));
    const summary = summarizeBackup(parsed);

    expect(parsed.data.userProfile).toHaveLength(1);
    expect(parsed.data.weights).toHaveLength(1);
    expect(parsed.data.appSettings[0]?.id).toBe(APP_SETTINGS_ID);
    expect(summary.totalRecords).toBe(3);
    expect(summary.hasProfile).toBe(true);
  });

  it('remplace intégralement les données avec une sauvegarde valide', async () => {
    await database.weights.add(
      createEntity({ date: '2026-06-20', weightKg: 62 }, 'old-weight'),
    );
    const envelope = createEnvelope({
      weights: [createEntity({ date: '2026-06-23', weightKg: 60 }, 'new-weight')],
    });

    await replaceDatabaseFromBackup(envelope, database);

    expect(await database.weights.toArray()).toEqual([
      expect.objectContaining({ id: 'new-weight', weightKg: 60 }),
    ]);
    expect(await database.userProfile.get(LOCAL_USER_PROFILE_ID)).toBeDefined();
  });

  it('annule toute la transaction lorsque l’écriture échoue', async () => {
    await database.weights.add(
      createEntity({ date: '2026-06-20', weightKg: 62 }, 'old-weight'),
    );
    const envelope = createEnvelope({
      weights: [
        createEntity({ date: '2026-06-23', weightKg: 60 }, 'duplicate-1'),
        createEntity({ date: '2026-06-23', weightKg: 59 }, 'duplicate-2'),
      ],
    });

    await expect(replaceDatabaseFromBackup(envelope, database)).rejects.toThrow(
      /données précédentes ont été conservées/,
    );
    expect(await database.weights.toArray()).toEqual([
      expect.objectContaining({ id: 'old-weight', weightKg: 62 }),
    ]);
  });

  it('efface les données utilisateur et recrée uniquement les paramètres par défaut', async () => {
    await database.userProfile.add(
      createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID),
    );
    await database.weights.add(
      createEntity({ date: '2026-06-23', weightKg: 60 }, 'weight-1'),
    );

    await clearAllUserData(database);

    expect(await database.userProfile.count()).toBe(0);
    expect(await database.weights.count()).toBe(0);
    expect(await database.appSettings.count()).toBe(1);
    expect(await database.appSettings.get(APP_SETTINGS_ID)).toMatchObject({
      id: APP_SETTINGS_ID,
      theme: 'system',
    });
  });

  it('refuse un JSON invalide avant toute opération de base', () => {
    expect(() => parseBackupText('{not-json')).toThrow(/JSON valide/);
  });
});
