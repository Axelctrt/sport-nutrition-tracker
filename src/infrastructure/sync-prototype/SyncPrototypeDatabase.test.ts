import Dexie from 'dexie';
import { DEFAULT_DATABASE_NAME } from '@/infrastructure/database/AppDatabase';
import {
  createSyncPrototypeDatabase,
  LEGACY_SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
  SyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

const enabledConfig = {
  enabled: true as const,
  databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
  realWeightSyncEnabled: true,
  realActivitySyncEnabled: true,
  realGoalSyncEnabled: true,
  realStrengthSyncEnabled: true,
  realNutritionJournalSyncEnabled: true,
  realNutritionLibrarySyncEnabled: true,
  realNutritionTrackingSyncEnabled: true,
  realDailyCoachingSyncEnabled: true,
  realAccountPreferencesSyncEnabled: true,
  realRewardsRoutinesSyncEnabled: true,
  realSocialCloudEnabled: false,
  diagnosticsEnabled: true,
};

describe('base isolée du prototype Dexie Cloud', () => {
  it('reste distincte de la base SportPilot réelle', () => {
    expect(SYNC_PROTOTYPE_DATABASE_NAME).not.toBe(DEFAULT_DATABASE_NAME);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).not.toBe(
      LEGACY_SYNC_PROTOTYPE_DATABASE_NAME,
    );
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(17);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
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
      'realEndurancePlanningSessions',
      'realActivityDeletionRecords',
      'realGoals',
      'realGoalDeletionRecords',
      'realGoalMutations',
      'realGoalMutationClocks',
      'realStrengthExercises',
      'realWorkoutTemplates',
      'realWorkoutSessions',
      'realStrengthDeletionRecords',
      'realNutritionJournalDays',
      'realNutritionJournalDeletionRecords',
      'realNutritionProducts',
      'realNutritionRecipes',
      'realFavoriteMeals',
      'realNutritionLibraryDeletionRecords',
      'realNutritionTracking',
      'realAccountPreferences',
      'realRewardsRoutines',
      'realDailyCoachingDays',
      'socialIdentities',
      'socialHandleReservations',
      'socialFriendRequests',
      'socialFriendships',
      'socialFriendPermissions',
      'socialActivitySnapshots',
      'realSyncBaselines',
    ]);
  });

  it('configure les tables fictives et réelles séparément avec authentification OTP', () => {
    const database = createSyncPrototypeDatabase(enabledConfig);

    expect(database.cloud.options).toEqual(
      expect.objectContaining({
        databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
        requireAuth: false,
        customLoginGui: true,
        tryUseServiceWorker: false,
        nameSuffix: true,
        socialAuth: false,
        disableEagerSync: true,
        unsyncedTables: ['realSyncBaselines', 'realGoalMutationClocks'],
      }),
    );
    expect(database.table('weights').schema.primKey.keyPath).toBe('id');
    expect(database.table('deletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWeights').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWeightDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realActivities').schema.primKey.keyPath).toBe('id');
    expect(database.table('realEndurancePlanningSessions').schema.primKey.keyPath).toBe('id');
    expect(database.table('realActivityDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realGoals').schema.primKey.keyPath).toBe('id');
    expect(database.table('realGoalDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realGoalMutations').schema.primKey.keyPath).toBe('id');
    expect(database.table('realGoalMutationClocks').schema.primKey.keyPath).toBe('id');
    expect(database.table('realStrengthExercises').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWorkoutTemplates').schema.primKey.keyPath).toBe('id');
    expect(database.table('realWorkoutSessions').schema.primKey.keyPath).toBe('id');
    expect(database.table('realStrengthDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionJournalDays').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionJournalDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionProducts').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionRecipes').schema.primKey.keyPath).toBe('id');
    expect(database.table('realFavoriteMeals').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionLibraryDeletionRecords').schema.primKey.keyPath).toBe('id');
    expect(database.table('realNutritionTracking').schema.primKey.keyPath).toBe('id');
    expect(database.table('realAccountPreferences').schema.primKey.keyPath).toBe('id');
    expect(database.table('realRewardsRoutines').schema.primKey.keyPath).toBe('id');
    expect(database.table('realDailyCoachingDays').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialIdentities').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialHandleReservations').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialFriendRequests').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialFriendRequests').schema.idxByName.recipientUserId).toBeDefined();
    expect(database.table('socialFriendRequests').schema.idxByName.requesterUserId).toBeDefined();
    expect(database.table('socialFriendRequests').schema.idxByName.status).toBeDefined();
    expect(database.table('socialFriendships').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialFriendships').schema.idxByName.userAId).toBeDefined();
    expect(database.table('socialFriendships').schema.idxByName.userBId).toBeDefined();
    expect(database.table('socialFriendPermissions').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialFriendPermissions').schema.idxByName.ownerUserId).toBeDefined();
    expect(database.table('socialFriendPermissions').schema.idxByName.friendUserId).toBeDefined();
    expect(database.table('socialActivitySnapshots').schema.primKey.keyPath).toBe('id');
    expect(database.table('socialActivitySnapshots').schema.idxByName.ownerUserId).toBeDefined();
    expect(database.table('socialActivitySnapshots').schema.idxByName.publishedForUserId).toBeDefined();
    expect(database.table('realSyncBaselines').schema.primKey.keyPath).toBe('id');
    const handleReservationIndex = database.table('socialHandleReservations').schema.idxByName.handle;
    expect(handleReservationIndex).toBeDefined();
    expect(handleReservationIndex?.unique).toBe(true);

    database.close();
  });

  it('migre le runtime v16 en v17 sans changer son nom ni perdre ses lignes', async () => {
    const databaseName = `sportpilot-sync-v16-v17-${crypto.randomUUID()}`;
    const persistedDatabaseName = `${databaseName}-sportpilot-prototype`;
    const legacy = new Dexie(persistedDatabaseName);
    legacy.version(16).stores({
      realGoals: 'id, updatedAt',
      realGoalDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId',
    });
    await legacy.open();
    await legacy.table('realGoals').bulkPut([
      {
        id: '#goal-before-v17',
        targetValue: 10_000,
        updatedAt: '2026-08-20T08:00:00.000Z',
      },
      {
        id: '#goal-restored-before-v17',
        targetValue: 20_000,
        updatedAt: '2026-08-20T08:10:00.000Z',
      },
      {
        id: '#goal-with-tombstone-before-v17',
        targetValue: 30_000,
        updatedAt: '2026-08-20T08:20:00.000Z',
      },
    ]);
    await legacy.table('realGoalDeletionRecords').bulkPut([
      {
        id: '#deletion:goal:goal-deleted-before-v17',
        entityType: 'goal',
        entityId: 'goal-deleted-before-v17',
        status: 'deleted',
        deletedAt: '2026-08-20T08:05:00.000Z',
        updatedAt: '2026-08-20T08:05:00.000Z',
      },
      {
        id: '#deletion:goal:goal-restored-before-v17',
        entityType: 'goal',
        entityId: 'goal-restored-before-v17',
        status: 'restored',
        deletedAt: '2026-08-20T08:06:00.000Z',
        restoredAt: '2026-08-20T08:10:00.000Z',
        updatedAt: '2026-08-20T08:10:00.000Z',
      },
      {
        id: '#deletion:goal:goal-with-tombstone-before-v17',
        entityType: 'goal',
        entityId: 'goal-with-tombstone-before-v17',
        status: 'deleted',
        deletedAt: '2026-08-20T08:30:00.000Z',
        updatedAt: '2026-08-20T08:30:00.000Z',
      },
    ]);
    await legacy.table('realSyncBaselines').put({
      id: 'account:goals:goals',
      accountUserId: 'account',
      domainId: 'goals',
      entityId: 'goals',
      localDigest: 'legacy-local',
      cloudDigest: 'legacy-cloud',
      revision: 4,
      actorId: 'legacy-device',
      updatedAt: '2026-08-20T08:30:00.000Z',
    });
    legacy.close();

    const online = vi.spyOn(window.navigator, 'onLine', 'get')
      .mockReturnValue(false);
    const fetcher = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('offline migration test'));
    const migrated = new SyncPrototypeDatabase(enabledConfig, databaseName);
    try {
      await migrated.open();
      expect(migrated.verno).toBe(17);
      expect(await migrated.realGoals.get('#goal-before-v17')).toMatchObject({
        targetValue: 10_000,
      });
      expect(await migrated.realGoals.count()).toBe(3);
      expect(await migrated.realGoalDeletionRecords.count()).toBe(3);
      expect(await migrated.realGoalDeletionRecords
        .get('#deletion:goal:goal-deleted-before-v17'))
        .toMatchObject({ status: 'deleted' });
      expect(await migrated.realGoalDeletionRecords
        .get('#deletion:goal:goal-restored-before-v17'))
        .toMatchObject({ status: 'restored' });
      expect(await migrated.realSyncBaselines.get('account:goals:goals'))
        .toMatchObject({ revision: 4, actorId: 'legacy-device' });
      expect(await migrated.realGoalMutations.count()).toBe(0);
      expect(await migrated.realGoalMutationClocks.count()).toBe(0);
      expect(migrated.realGoalMutations.schema.primKey.keyPath).toBe('id');
      expect(migrated.realGoalMutationClocks.schema.primKey.keyPath).toBe('id');
    } finally {
      fetcher.mockRestore();
      online.mockRestore();
      await migrated.delete();
    }
  });

  it('refuse toute création lorsque le prototype est désactivé', () => {
    expect(() =>
      createSyncPrototypeDatabase({ enabled: false }),
    ).toThrow('désactivé');
  });
});
