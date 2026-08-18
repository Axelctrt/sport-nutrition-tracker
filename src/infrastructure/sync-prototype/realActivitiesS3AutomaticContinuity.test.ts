import Dexie, { type Table } from 'dexie';
import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { Activity } from '@/domain/models/activity';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { AppSettings } from '@/domain/models/settings';
import {
  ENDURANCE_PLANNING_PERSISTED_EVENT,
  flushEndurancePlanningPersistence,
  resetEndurancePlanningRuntimeForTests,
  writeEndurancePlanningState,
  type PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import {
  applyPreparedCloudAccountRestore,
  prepareCloudAccountRestore,
  readCloudAccountRestoreSourceSnapshot,
  restoreCloudAccountDataToDatabase,
  type CloudAccountRestoreRuntime,
} from '@/infrastructure/data-spaces/cloudAccountRestoreService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { accountDatabaseNameForFingerprint } from '@/infrastructure/database/databaseNames';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { DexieActivityRepository } from '@/infrastructure/repositories/dexie/DexieActivityRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealActivitySync,
  synchronizeRealActivities,
} from '@/infrastructure/sync-prototype/realActivitySyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { initializeUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

const USER_ID = 'activities-s3-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;
const B_DATABASE_NAME = accountDatabaseNameForFingerprint(FINGERPRINT);
const ACTIVITY_BASELINE_ID = `${USER_ID}:activities:activities`;

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
};
type CloudActivity = Activity & CloudMetadata;
type CloudPlanning = PlannedEnduranceSession & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realActivities: Table<CloudActivity, string>;
  declare realEndurancePlanningSessions: Table<CloudPlanning, string>;
  declare realActivityDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor(label: string) {
    super(`sportpilot-activities-s3-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realActivities: 'id, date, type, [date+type], updatedAt',
      realEndurancePlanningSessions:
        'id, date, activityType, status, updatedAt',
      realActivityDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realStrengthExercises: 'id, updatedAt',
      realWorkoutTemplates: 'id, updatedAt',
      realWorkoutSessions: 'id, updatedAt',
      realStrengthDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realNutritionJournalDays: 'id, date, updatedAt',
      realNutritionJournalDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realNutritionProducts: 'id, barcode, updatedAt',
      realNutritionRecipes: 'id, updatedAt',
      realFavoriteMeals: 'id, updatedAt',
      realNutritionLibraryDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realNutritionTracking: 'id, updatedAt',
      realAccountPreferences: 'id, updatedAt',
      realRewardsRoutines: 'id, updatedAt',
      realDailyCoachingDays: 'id, date, updatedAt',
      realSyncBaselines:
        'id, accountUserId, domainId, entityId, updatedAt, [accountUserId+domainId]',
    });
  }
}

function settingsRepository(): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint: FINGERPRINT,
    automaticWeightSyncEnabled: false,
  };
  return {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => Object.assign(settings, changes)),
    reset: vi.fn(async () => settings),
  };
}

function createDeviceClient(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  onAnalysis?: (changeOrigin: string | undefined) => void,
): SyncPrototypeClient {
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealActivities = vi.fn(async () => {
    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    onAnalysis?.(preview.changeOrigin);
    snapshot = {
      ...snapshot,
      realActivities: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealActivities,
    syncRealActivities: vi.fn(async () => synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )),
    analyzeRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    })),
    syncRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
      uploadedWeights: 0,
      downloadedWeights: 0,
      removedLocalWeights: 0,
      removedCloudWeights: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-08-18T13:00:00.000Z',
    })),
  } as unknown as SyncPrototypeClient;
}

function createS3Runtime(cloud: TestCloudDatabase): CloudAccountRestoreRuntime {
  const database = cloud as unknown as SyncPrototypeDatabase;
  return {
    syncCloud: vi.fn(async () => undefined),
    readSourceSnapshot: () =>
      readCloudAccountRestoreSourceSnapshot(database, USER_ID),
    restoreTo: (targetDatabase) =>
      restoreCloudAccountDataToDatabase(targetDatabase, database, USER_ID),
  };
}

async function replicateActivitiesBusinessCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const [activities, planning, markers] = await Promise.all([
    source.realActivities.toArray(),
    source.realEndurancePlanningSessions.toArray(),
    source.realActivityDeletionRecords.toArray(),
  ]);
  await target.transaction(
    'rw',
    [
      target.realActivities,
      target.realEndurancePlanningSessions,
      target.realActivityDeletionRecords,
    ],
    async () => {
      await Promise.all([
        target.realActivities.clear(),
        target.realEndurancePlanningSessions.clear(),
        target.realActivityDeletionRecords.clear(),
      ]);
      if (activities.length > 0) await target.realActivities.bulkPut(activities);
      if (planning.length > 0) {
        await target.realEndurancePlanningSessions.bulkPut(planning);
      }
      if (markers.length > 0) {
        await target.realActivityDeletionRecords.bulkPut(markers);
      }
    },
  );
}

function cloudBusinessState(cloud: TestCloudDatabase) {
  return Promise.all([
    cloud.realActivities.toArray(),
    cloud.realEndurancePlanningSessions.toArray(),
    cloud.realActivityDeletionRecords.toArray(),
  ]);
}

function activityInput(distanceKm = 8) {
  return {
    type: 'running' as const,
    date: '2026-08-18',
    time: '08:00',
    sessionType: 'easy' as const,
    durationMinutes: 45,
    intensity: 'moderate' as const,
    distanceKm,
    averageCadenceSpm: 168,
    terrainType: 'road' as const,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 500,
      coefficientUsed: 1,
      calculationVersion: 1,
    },
  };
}

function planning(id: string): PlannedEnduranceSession {
  return {
    id,
    title: 'Sortie A→B S3',
    activityType: 'running',
    date: '2026-08-19',
    intensity: 'low',
    targetDurationMinutes: 40,
    status: 'planned',
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-18T13:00:00.000Z',
  };
}

describe('gate Activities — S3 nouvel appareil puis continuité automatique', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    resetEndurancePlanningRuntimeForTests();
    window.localStorage.clear();
    await Dexie.delete(B_DATABASE_NAME);
    localA = new AppDatabase(`activities-s3-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(B_DATABASE_NAME);
    cloudA = new TestCloudDatabase('a');
    cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);
  });

  afterEach(async () => {
    resetEndurancePlanningRuntimeForTests();
    window.localStorage.clear();
    const names = [localA.name, localB.name, cloudA.name, cloudB.name];
    localA.close();
    localB.close();
    cloudA.close();
    cloudB.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('restaure B par S3 sans baseline transportée puis reprend en cloud-only automatique après association', async () => {
    await previewRealActivitySync(
      localA,
      cloudA as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    await initializeUserStateRuntime(localA);
    const clientA = createDeviceClient(localA, cloudA);
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: settingsRepository(),
      eventTarget: window,
      isVisible: () => true,
      isOnline: () => true,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });
    await controllerA.initialize();

    const repositoryA = new DexieActivityRepository(localA);
    const surviving = await repositoryA.create(activityInput());
    await vi.waitFor(async () => {
      expect(await cloudA.realActivities.get(`#${surviving.id}`)).toBeDefined();
    });

    const deleted = await repositoryA.create(activityInput(6));
    await vi.waitFor(async () => {
      expect(await cloudA.realActivities.get(`#${deleted.id}`)).toBeDefined();
    });
    await repositoryA.delete(deleted.id);
    await vi.waitFor(async () => {
      expect(await cloudA.realActivities.get(`#${deleted.id}`)).toBeUndefined();
      expect(
        await cloudA.realActivityDeletionRecords
          .get(`#deletion:activity:${deleted.id}`),
      ).toMatchObject({ status: 'deleted' });
    });

    const persisted = vi.fn();
    window.addEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);
    writeEndurancePlanningState({
      version: 1,
      sessions: [planning('plan-s3-a-b')],
    });
    await flushEndurancePlanningPersistence();
    expect(persisted).toHaveBeenCalledTimes(1);
    window.removeEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);
    await vi.waitFor(async () => {
      expect(
        await cloudA.realEndurancePlanningSessions.get('#plan-s3-a-b'),
      ).toBeDefined();
    });

    // Phase B1 — le transport réplique uniquement les données métier.
    await replicateActivitiesBusinessCloud(cloudA, cloudB);
    expect(await cloudB.realSyncBaselines.count()).toBe(0);
    expect(await localB.activities.count()).toBe(0);
    expect(await localB.endurancePlanningSessions.count()).toBe(0);
    expect(
      await localB.deletionRecords.where('entityType').equals('activity').count(),
    ).toBe(0);

    const cloudBeforeS3 = await cloudBusinessState(cloudB);
    const runtime = createS3Runtime(cloudB);
    const restoreOptions = {
      targetDatabase: localB,
      storage: window.localStorage,
      stageDatabaseName: `${B_DATABASE_NAME}--s3-${crypto.randomUUID()}`,
    };
    const prepared = await prepareCloudAccountRestore(
      FINGERPRINT,
      runtime,
      restoreOptions,
    );
    expect(prepared.preview).toMatchObject({
      localState: 'empty',
      hasCloudData: true,
      canRestore: true,
      cloudDeletionMarkerCount: 1,
    });
    expect(prepared.preview.categories).toContainEqual(
      expect.objectContaining({ key: 'activities', recordCount: 2 }),
    );

    const restored = await applyPreparedCloudAccountRestore(
      prepared,
      runtime,
      restoreOptions,
    );
    expect(restored.sourcePreserved).toBe(true);
    expect(restored.restoredDeletionMarkers).toBe(1);
    expect(await localB.activities.get(surviving.id)).toMatchObject({
      distanceKm: 8,
    });
    expect(await localB.activities.get(deleted.id)).toBeUndefined();
    expect(await localB.endurancePlanningSessions.get('plan-s3-a-b'))
      .toMatchObject({ title: 'Sortie A→B S3' });
    expect(
      await localB.deletionRecords.where('entityType').equals('activity').toArray(),
    ).toEqual([
      expect.objectContaining({ entityId: deleted.id, status: 'deleted' }),
    ]);
    expect(await cloudBusinessState(cloudB)).toEqual(cloudBeforeS3);
    expect(await cloudB.realSyncBaselines.get(ACTIVITY_BASELINE_ID)).toBeUndefined();

    const equalAfterS3 = await previewRealActivitySync(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(equalAfterS3.differingEntityCount).toBe(0);
    expect(await cloudB.realSyncBaselines.get(ACTIVITY_BASELINE_ID)).toBeDefined();

    // Phase B2 — après association, le vrai lifecycle B peut converger cloud-only.
    const observedBOrigins: Array<string | undefined> = [];
    const eventTargetB = new EventTarget();
    const clientB = createDeviceClient(
      localB,
      cloudB,
      (origin) => observedBOrigins.push(origin),
    );
    const controllerB = new AutomaticSyncController({
      client: clientB,
      settingsRepository: settingsRepository(),
      eventTarget: eventTargetB,
      isVisible: () => true,
      isOnline: () => true,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });

    try {
      await controllerB.initialize();
      const baselineBeforeTransport = await cloudB.realSyncBaselines.get(
        ACTIVITY_BASELINE_ID,
      );
      expect(surviving.type).toBe('running');
      if (surviving.type !== 'running') {
        throw new Error('Le scénario attend une activité running.');
      }
      const updated = await repositoryA.save({
        ...surviving,
        distanceKm: 12,
      });
      await vi.waitFor(async () => {
        expect(await cloudA.realActivities.get(`#${surviving.id}`)).toMatchObject({
          distanceKm: 12,
        });
      });

      await replicateActivitiesBusinessCloud(cloudA, cloudB);
      expect(await cloudB.realSyncBaselines.get(ACTIVITY_BASELINE_ID))
        .toEqual(baselineBeforeTransport);
      const cloudBeforeB2 = await cloudBusinessState(cloudB);
      const analysisOffset = observedBOrigins.length;

      eventTargetB.dispatchEvent(new Event('focus'));
      await vi.waitFor(async () => {
        expect(await localB.activities.get(updated.id)).toMatchObject({
          distanceKm: 12,
        });
      });

      expect(observedBOrigins.slice(analysisOffset)).toContain('cloud');
      expect(await cloudBusinessState(cloudB)).toEqual(cloudBeforeB2);
      expect(await previewRealActivitySync(
        localB,
        cloudB as unknown as SyncPrototypeDatabase,
        USER_ID,
      )).toMatchObject({ differingEntityCount: 0 });
      expect(clientA.syncRealActivities).not.toHaveBeenCalled();
      expect(clientB.syncRealActivities).not.toHaveBeenCalled();
    } finally {
      controllerB.dispose();
      controllerA.dispose();
    }
  });
});
