import { DEFAULT_DATABASE_NAME } from '@/infrastructure/database/AppDatabase';
import {
  createSyncPrototypeDatabase,
  LEGACY_SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('base isolée du prototype Dexie Cloud', () => {
  it('reste distincte de la base SportPilot réelle', () => {
    expect(SYNC_PROTOTYPE_DATABASE_NAME).not.toBe(DEFAULT_DATABASE_NAME);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).not.toBe(
      LEGACY_SYNC_PROTOTYPE_DATABASE_NAME,
    );
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(6);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      `sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}`,
    );
    expect(SYNC_PROTOTYPE_DATABASE_NAME).not.toBe(
      'sportpilot-sync-runtime-0.19.0',
    );
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toEqual([
      'weights',
      'deletionRecords',
      'realWeights',
      'realWeightDeletionRecords',
      'realActivities',
      'realActivityDeletionRecords',
      'realGoals',
      'realGoalDeletionRecords',
      'realStrengthExercises',
      'realWorkoutTemplates',
      'realWorkoutSessions',
      'realStrengthDeletionRecords',
      'realNutritionJournalDays',
      'realNutritionJournalDeletionRecords',
    ]);
  });

  it('configure les tables fictives et réelles séparément avec authentification OTP', () => {
    const database = createSyncPrototypeDatabase({
      enabled: true,
      databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
      realWeightSyncEnabled: true,
      realActivitySyncEnabled: true,
      realGoalSyncEnabled: true,
      realStrengthSyncEnabled: true,
      realNutritionJournalSyncEnabled: true,
      diagnosticsEnabled: true,
    });

    expect(database.cloud.options).toEqual(
      expect.objectContaining({
        databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
        requireAuth: false,
        customLoginGui: true,
        tryUseServiceWorker: false,
        nameSuffix: true,
        socialAuth: false,
        disableEagerSync: true,
      }),
    );
    expect(database.table('weights').schema.primKey.keyPath).toBe('id');
    expect(database.table('deletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWeights').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWeightDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realActivities').schema.primKey.keyPath).toBe('id');
    expect(database.table('realActivityDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realGoals').schema.primKey.keyPath).toBe('id');
    expect(database.table('realGoalDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realStrengthExercises').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWorkoutTemplates').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWorkoutSessions').schema.primKey.keyPath).toBe('id');
    expect(database.table('realStrengthDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionJournalDays').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionJournalDeletionRecords').schema.primKey.keyPath).toBe('id');

    database.close();
  });

  it('refuse toute création lorsque le prototype est désactivé', () => {
    expect(() =>
      createSyncPrototypeDatabase({ enabled: false }),
    ).toThrow('désactivé');
  });
});
