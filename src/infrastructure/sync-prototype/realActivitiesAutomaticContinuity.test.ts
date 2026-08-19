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
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
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
  synchronizeRealActivitiesFromCloud,
  synchronizeRealActivitiesToCloud,
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

const USER_ID = 'activities-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

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
    super(`sportpilot-activities-a-b-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realActivities: 'id, date, type, [date+type], updatedAt',
      realEndurancePlanningSessions: 'id, date, activityType, status, updatedAt',
      realActivityDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
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
): SyncPrototypeClient {
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realActivities: { enabled: true, status: 'idle' },
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

export async function replicateActivitiesCloud(
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
      if (activities.length) await target.realActivities.bulkPut(activities);
      if (planning.length) await target.realEndurancePlanningSessions.bulkPut(planning);
      if (markers.length) await target.realActivityDeletionRecords.bulkPut(markers);
    },
  );
}

function activityInput() {
  return {
    type: 'running' as const,
    date: '2026-08-18',
    time: '08:00',
    sessionType: 'easy' as const,
    durationMinutes: 45,
    intensity: 'moderate' as const,
    distanceKm: 8,
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
    title: 'Sortie A→B',
    activityType: 'running',
    date: '2026-08-19',
    intensity: 'low',
    targetDurationMinutes: 40,
    status: 'planned',
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-18T13:00:00.000Z',
  };
}

describe('gate A→B Activities', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    resetEndurancePlanningRuntimeForTests();
    window.localStorage.clear();
    localA = new AppDatabase(`activities-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`activities-b-${crypto.randomUUID()}`);
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

  it('A repository durable → upload automatique → B frais restaure l’activité sans action manuelle de sync', async () => {
    await previewRealActivitySync(
      localA,
      cloudA as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const clientA = createDeviceClient(localA, cloudA);
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: settingsRepository(),
      eventTarget: window,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controllerA.initialize();

    const repository = new DexieActivityRepository(localA);
    const created = await repository.create(activityInput());
    await vi.waitFor(async () => {
      expect(await cloudA.realActivities.get(`#${created.id}`)).toBeDefined();
    });

    await replicateActivitiesCloud(cloudA, cloudB);
    const cloudBeforeRestore = await cloudB.realActivities.toArray();
    const restored = await synchronizeRealActivities(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(restored.downloadedActivities).toBe(1);
    expect(await localB.activities.get(created.id)).toMatchObject({
      distanceKm: 8,
    });
    expect(await cloudB.realActivities.toArray()).toEqual(cloudBeforeRestore);
    controllerA.dispose();
  });

  it('planning durable PERSISTED → upload automatique → B frais restaure la séance', async () => {
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
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controllerA.initialize();

    const persisted = vi.fn();
    window.addEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);
    writeEndurancePlanningState({ version: 1, sessions: [planning('plan-a-b')] });
    await flushEndurancePlanningPersistence();
    expect(persisted).toHaveBeenCalledTimes(1);
    await vi.waitFor(async () => {
      expect(await cloudA.realEndurancePlanningSessions.get('#plan-a-b')).toBeDefined();
    });
    window.removeEventListener(ENDURANCE_PLANNING_PERSISTED_EVENT, persisted);

    await replicateActivitiesCloud(cloudA, cloudB);
    await synchronizeRealActivities(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );
    expect(await localB.endurancePlanningSessions.get('plan-a-b')).toMatchObject({
      title: 'Sortie A→B',
    });
    controllerA.dispose();
  });

  it('conserve aussi les primitives explicites FromCloud/ToCloud qualifiées par baseline', async () => {
    const initial = {
      ...activityInput(),
      id: 'activity-directionals',
      createdAt: '2026-08-18T09:00:00.000Z',
      updatedAt: '2026-08-18T09:00:00.000Z',
    } satisfies Activity;
    await localA.activities.put(initial);
    await cloudA.realActivities.put({ ...initial, id: '#activity-directionals', owner: USER_ID });
    await previewRealActivitySync(
      localA,
      cloudA as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    await localA.activities.put({
      ...initial,
      distanceKm: 9,
      updatedAt: '2026-08-18T10:00:00.000Z',
    });
    expect((await synchronizeRealActivitiesToCloud(
      localA,
      cloudA as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).uploadedActivities).toBe(1);

    await cloudA.realActivities.put({
      ...initial,
      id: '#activity-directionals',
      distanceKm: 10,
      updatedAt: '2026-08-18T11:00:00.000Z',
      owner: USER_ID,
      syncRevision: 9,
      syncActorId: 'cloud-device',
    });
    expect((await synchronizeRealActivitiesFromCloud(
      localA,
      cloudA as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).downloadedActivities).toBe(1);
    expect(await localA.activities.get('activity-directionals')).toMatchObject({
      distanceKm: 10,
    });
  });
});
