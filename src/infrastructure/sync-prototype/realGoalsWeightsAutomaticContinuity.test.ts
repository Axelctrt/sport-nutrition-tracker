import Dexie, { type Table } from 'dexie';
import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import {
  flushGoalStatePersistence,
  resetGoalStateRuntimeForTests,
  writeGoalState,
  type Goal,
} from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import type { AppSettings } from '@/domain/models/settings';
import type { WeightEntry } from '@/domain/models/weight';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealGoalSync,
  synchronizeRealGoals,
  synchronizeRealGoalsFromCloud,
  synchronizeRealGoalsToCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import {
  previewRealWeightSync,
  synchronizeRealWeights,
  synchronizeRealWeightsFromCloud,
  synchronizeRealWeightsToCloud,
} from '@/infrastructure/sync-prototype/realWeightSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { REAL_WEIGHT_DATA_CHANGED_EVENT } from '@/infrastructure/sync-prototype/weightSyncEvents';
import { initializeUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

const ACCOUNT_USER_ID = 'user-goals-weights-auto';
const CREATED_AT = '2026-08-17T08:00:00.000Z';
const CHANGED_AT = '2026-08-17T09:00:00.000Z';

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
};
type CloudGoal = Goal & CloudMetadata;
type CloudWeight = WeightEntry & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realGoals: Table<CloudGoal, string>;
  declare realGoalDeletionRecords: Table<CloudMarker, string>;
  declare realWeights: Table<CloudWeight, string>;
  declare realWeightDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor(label = 'cloud') {
    super(`sportpilot-goals-weights-auto-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function goal(
  id: string,
  targetValue = 100_000,
  updatedAt = CHANGED_AT,
): Goal {
  return {
    id,
    title: 'Objectif continuité',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-17',
    status: 'active',
    reachedMilestones: [],
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function weight(
  id: string,
  weightKg = 70,
  updatedAt = CHANGED_AT,
): WeightEntry {
  return {
    id,
    date: '2026-08-17',
    weightKg,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

async function bootstrapGoals(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  userId = ACCOUNT_USER_ID,
) {
  const preview = await previewRealGoalSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    userId,
  );
  expect(preview.differingEntityCount).toBe(0);
  return preview;
}

async function bootstrapWeights(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  userId = ACCOUNT_USER_ID,
) {
  const preview = await previewRealWeightSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    userId,
  );
  expect(preview.differingEntityCount).toBe(0);
  return preview;
}

async function businessState(local: AppDatabase, cloud: TestCloudDatabase) {
  return Promise.all([
    local.goals.toArray(),
    local.weights.toArray(),
    local.deletionRecords.toArray(),
    cloud.realGoals.toArray(),
    cloud.realGoalDeletionRecords.toArray(),
    cloud.realWeights.toArray(),
    cloud.realWeightDeletionRecords.toArray(),
  ]);
}

function createSettingsRepository(
  userId = ACCOUNT_USER_ID,
  overrides: Partial<AppSettings> = {},
): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint:
      createSyncPrototypeAccountFingerprint(userId)!,
    automaticWeightSyncEnabled: false,
    ...overrides,
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
  userId = ACCOUNT_USER_ID,
): SyncPrototypeClient {
  let snapshot = {
    account: { isLoggedIn: true, isLoading: false, userId },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realWeights: { enabled: true, status: 'idle' },
    realGoals: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  } as SyncPrototypeSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeGoals = vi.fn(async () => {
    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      userId,
    );
    snapshot = {
      ...snapshot,
      realGoals: {
        enabled: true,
        status: 'ready',
        preview,
      } as never,
    };
    notify();
    return preview;
  });
  const analyzeWeights = vi.fn(async () => {
    const preview = await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      userId,
    );
    snapshot = {
      ...snapshot,
      realWeights: {
        enabled: true,
        status: 'ready',
        preview,
      } as never,
    };
    notify();
    return preview;
  });
  const manualGoals = vi.fn(async () => synchronizeRealGoals(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    userId,
  ));
  const manualWeights = vi.fn(async () => synchronizeRealWeights(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    userId,
  ));

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: async () => undefined,
    syncNow: vi.fn(async () => undefined),
    analyzeRealGoals: analyzeGoals,
    syncRealGoals: manualGoals,
    analyzeRealWeights: analyzeWeights,
    syncRealWeights: manualWeights,
  } as unknown as SyncPrototypeClient;
}

async function replicateBusinessCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const [goals, goalMarkers, weights, weightMarkers] = await Promise.all([
    source.realGoals.toArray(),
    source.realGoalDeletionRecords.toArray(),
    source.realWeights.toArray(),
    source.realWeightDeletionRecords.toArray(),
  ]);
  await target.transaction(
    'rw',
    [
      target.realGoals,
      target.realGoalDeletionRecords,
      target.realWeights,
      target.realWeightDeletionRecords,
    ],
    async () => {
      await Promise.all([
        target.realGoals.clear(),
        target.realGoalDeletionRecords.clear(),
        target.realWeights.clear(),
        target.realWeightDeletionRecords.clear(),
      ]);
      if (goals.length) await target.realGoals.bulkPut(goals);
      if (goalMarkers.length) {
        await target.realGoalDeletionRecords.bulkPut(goalMarkers);
      }
      if (weights.length) await target.realWeights.bulkPut(weights);
      if (weightMarkers.length) {
        await target.realWeightDeletionRecords.bulkPut(weightMarkers);
      }
    },
  );
}

describe('P0-V2.1 — continuité automatique Goals + Weights', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    resetGoalStateRuntimeForTests();
    local = new AppDatabase(`sportpilot-goals-weights-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    resetGoalStateRuntimeForTests();
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('bootstrappe uniquement des baselines device-local sur des états égaux', async () => {
    const before = await businessState(local, cloud);

    await bootstrapGoals(local, cloud);
    await bootstrapWeights(local, cloud);

    expect(await businessState(local, cloud)).toEqual(before);
    expect((await cloud.realSyncBaselines.toArray()).map((baseline) => ({
      domainId: baseline.domainId,
      entityId: baseline.entityId,
    })).sort((left, right) => left.domainId.localeCompare(right.domainId))).toEqual([
      { domainId: 'goals', entityId: 'goals' },
      { domainId: 'weights', entityId: 'weights' },
    ]);
  });

  it('reste fail-closed sans baseline lorsque Goals ou Weights sont déjà divergents', async () => {
    await local.goals.add(goal('goal-unknown'));
    await local.weights.add(weight('weight:unknown'));

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'unknown' });
    expect(await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'unknown' });
    const before = await businessState(local, cloud);

    expect((await synchronizeRealGoalsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).uploadedGoals).toBe(0);
    expect((await synchronizeRealGoalsFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).downloadedGoals).toBe(0);
    expect((await synchronizeRealWeightsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).uploadedWeights).toBe(0);
    expect((await synchronizeRealWeightsFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).downloadedWeights).toBe(0);
    expect(await businessState(local, cloud)).toEqual(before);
    expect(await cloud.realSyncBaselines.count()).toBe(0);
  });

  it('classe puis envoie uniquement un changement local Goals après bootstrap', async () => {
    await bootstrapGoals(local, cloud);
    const value = goal('goal-local');
    await local.goals.add(value);

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'local' });

    const result = await synchronizeRealGoalsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result).toMatchObject({ uploadedGoals: 1, downloadedGoals: 0 });
    expect(await cloud.realGoals.get(`#${value.id}`)).toBeDefined();
  });

  it('classe puis récupère uniquement un changement cloud Goals après bootstrap', async () => {
    await bootstrapGoals(local, cloud);
    const value = goal('goal-cloud', 120_000);
    await cloud.realGoals.add({
      ...value,
      id: `#${value.id}`,
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'cloud' });

    const result = await synchronizeRealGoalsFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result).toMatchObject({ uploadedGoals: 0, downloadedGoals: 1 });
    expect(await local.goals.get(value.id)).toEqual(value);
  });

  it('classe puis envoie uniquement un changement local Weights après bootstrap', async () => {
    await bootstrapWeights(local, cloud);
    const value = weight('weight:local', 69.4);
    await local.weights.add(value);

    expect(await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'local' });

    const result = await synchronizeRealWeightsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result).toMatchObject({ uploadedWeights: 1, downloadedWeights: 0 });
    expect(await cloud.realWeights.get(`#${value.id}`)).toBeDefined();
  });

  it('classe puis récupère uniquement un changement cloud Weights après bootstrap', async () => {
    await bootstrapWeights(local, cloud);
    const value = weight('weight:cloud', 68.9);
    await cloud.realWeights.add({
      ...value,
      id: `#${value.id}`,
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });

    expect(await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'cloud' });

    const result = await synchronizeRealWeightsFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result).toMatchObject({ uploadedWeights: 0, downloadedWeights: 1 });
    expect(await local.weights.get(value.id)).toEqual(value);
  });

  it('refuse toute écriture quand les deux côtés changent après la baseline', async () => {
    await bootstrapGoals(local, cloud);
    await bootstrapWeights(local, cloud);
    await local.goals.add(goal('goal-local-concurrent'));
    await local.weights.add(weight('weight:local-concurrent'));
    await cloud.realGoals.add({
      ...goal('goal-cloud-concurrent'),
      id: '#goal-cloud-concurrent',
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });
    await cloud.realWeights.add({
      ...weight('weight:cloud-concurrent'),
      id: '#weight:cloud-concurrent',
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ changeOrigin: 'both' });
    expect(await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ changeOrigin: 'both' });
    const before = await businessState(local, cloud);

    const results = await Promise.all([
      synchronizeRealGoalsToCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      ),
      synchronizeRealGoalsFromCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      ),
      synchronizeRealWeightsToCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      ),
      synchronizeRealWeightsFromCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      ),
    ]);

    expect(results[0].uploadedGoals).toBe(0);
    expect(results[1].downloadedGoals).toBe(0);
    expect(results[2].uploadedWeights).toBe(0);
    expect(results[3].downloadedWeights).toBe(0);
    expect(await businessState(local, cloud)).toEqual(before);
  });

  it('revalide la provenance entre analyse et upload et refuse une course cloud', async () => {
    await bootstrapGoals(local, cloud);
    await local.goals.add(goal('goal-race-local'));
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ changeOrigin: 'local' });

    await cloud.realGoals.add({
      ...goal('goal-race-cloud'),
      id: '#goal-race-cloud',
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });

    const result = await synchronizeRealGoalsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result.uploadedGoals).toBe(0);
    expect(await cloud.realGoals.get('#goal-race-local')).toBeUndefined();
    expect(await local.goals.get('goal-race-local')).toBeDefined();
  });

  it('propage les suppressions dans les deux directions sans résurrection', async () => {
    const initialGoal = goal('goal-delete-cloud');
    const initialWeight = weight('weight:delete-local');
    await local.goals.add(initialGoal);
    await local.weights.add(initialWeight);
    await cloud.realGoals.add({
      ...initialGoal,
      id: `#${initialGoal.id}`,
      owner: ACCOUNT_USER_ID,
    });
    await cloud.realWeights.add({
      ...initialWeight,
      id: `#${initialWeight.id}`,
      owner: ACCOUNT_USER_ID,
    });
    await bootstrapGoals(local, cloud);
    await bootstrapWeights(local, cloud);

    await local.weights.delete(initialWeight.id);
    await local.deletionRecords.add(createDeletedDeletionRecord(
      { entityType: 'weight', entityId: initialWeight.id },
      '2026-08-17T10:00:00.000Z',
    ));
    expect(await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ changeOrigin: 'local' });
    await synchronizeRealWeightsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );
    expect(await cloud.realWeights.get(`#${initialWeight.id}`)).toBeUndefined();
    expect(await cloud.realWeightDeletionRecords
      .get(`#deletion:weight:${initialWeight.id}`)).toMatchObject({
        status: 'deleted',
      });

    await cloud.realGoals.delete(`#${initialGoal.id}`);
    await cloud.realGoalDeletionRecords.add({
      ...createDeletedDeletionRecord(
        { entityType: 'goal', entityId: initialGoal.id },
        '2026-08-17T11:00:00.000Z',
      ),
      id: `#deletion:goal:${initialGoal.id}`,
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ changeOrigin: 'cloud' });
    await synchronizeRealGoalsFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );
    expect(await local.goals.get(initialGoal.id)).toBeUndefined();
    expect(await local.deletionRecords
      .get(`deletion:goal:${initialGoal.id}`)).toMatchObject({ status: 'deleted' });
  });

  it('préserve strictement les lignes appartenant à un autre compte', async () => {
    await bootstrapGoals(local, cloud);
    await bootstrapWeights(local, cloud);
    await cloud.realGoals.add({
      ...goal('foreign-goal'),
      id: '#foreign-goal',
      owner: 'another-user',
      syncRevision: 3,
      syncActorId: 'foreign-device',
    });
    await cloud.realWeights.add({
      ...weight('foreign-weight'),
      id: '#foreign-weight',
      owner: 'another-user',
      syncRevision: 3,
      syncActorId: 'foreign-device',
    });

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await local.goals.count()).toBe(0);
    expect(await local.weights.count()).toBe(0);
    expect(await cloud.realGoals.get('#foreign-goal')).toBeDefined();
    expect(await cloud.realWeights.get('#foreign-weight')).toBeDefined();
  });

  it('compte propre : baseline égale puis writeGoalState réel déclenche automatiquement Goals A→B', async () => {
    const localA = new AppDatabase(`sportpilot-goals-gate-clean-a-${crypto.randomUUID()}`);
    const localB = new AppDatabase(`sportpilot-goals-gate-clean-b-${crypto.randomUUID()}`);
    const cloudA = new TestCloudDatabase('clean-a');
    const cloudB = new TestCloudDatabase('clean-b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);

    const clientA = createDeviceClient(localA, cloudA);
    const clientB = createDeviceClient(localB, cloudB);
    const eventTargetB = new EventTarget();
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: createSettingsRepository(),
      eventTarget: window,
      isVisible: () => true,
      isOnline: () => true,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });
    const controllerB = new AutomaticSyncController({
      client: clientB,
      settingsRepository: createSettingsRepository(),
      eventTarget: eventTargetB,
      isVisible: () => true,
      isOnline: () => true,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });

    try {
      await controllerA.initialize();
      await controllerB.initialize();
      expect(await cloudA.realSyncBaselines.count()).toBe(2);
      expect(await cloudB.realSyncBaselines.count()).toBe(2);
      await initializeUserStateRuntime(localA);

      const createdGoal = goal('goal-controller-a-b', 135_000);
      writeGoalState({ version: 1, goals: [createdGoal] });
      await flushGoalStatePersistence();
      expect(await localA.goals.get(createdGoal.id)).toEqual(createdGoal);
      await vi.waitFor(async () => {
        expect(await cloudA.realGoals.get(`#${createdGoal.id}`)).toBeDefined();
      });

      const createdWeight = weight('weight:controller-a-b', 68.4);
      await localA.weights.add(createdWeight);
      window.dispatchEvent(new Event(REAL_WEIGHT_DATA_CHANGED_EVENT));
      await vi.waitFor(async () => {
        expect(await cloudA.realWeights.get(`#${createdWeight.id}`)).toBeDefined();
      });

      await replicateBusinessCloud(cloudA, cloudB);
      eventTargetB.dispatchEvent(new Event('focus'));

      await vi.waitFor(async () => {
        expect(await localB.goals.get(createdGoal.id)).toEqual(createdGoal);
        expect(await localB.weights.get(createdWeight.id)).toEqual(createdWeight);
      });
      expect(await previewRealGoalSync(
        localB,
        cloudB as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      )).toMatchObject({ differingEntityCount: 0 });
      expect(await previewRealWeightSync(
        localB,
        cloudB as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      )).toMatchObject({ differingEntityCount: 0 });
      expect(clientA.syncRealGoals).not.toHaveBeenCalled();
      expect(clientA.syncRealWeights).not.toHaveBeenCalled();
      expect(clientB.syncRealGoals).not.toHaveBeenCalled();
      expect(clientB.syncRealWeights).not.toHaveBeenCalled();
    } finally {
      controllerA.dispose();
      controllerB.dispose();
      resetGoalStateRuntimeForTests();
      const databases = [localA, localB, cloudA, cloudB];
      const names = databases.map((database) => database.name);
      databases.forEach((database) => database.close());
      await Promise.all(names.map((name) => Dexie.delete(name)));
    }
  });

  it('compte legacy divergent : reste fail-closed sans bootstrap causal prouvable', async () => {
    const legacyLocal = new AppDatabase(
      `sportpilot-goals-gate-legacy-${crypto.randomUUID()}`,
    );
    const legacyCloud = new TestCloudDatabase('legacy');

    await Promise.all([
      legacyLocal.open(),
      legacyCloud.open(),
    ]);

    const localLegacyGoal = goal(
      'goal-legacy',
      110_000,
      '2026-08-17T09:00:00.000Z',
    );
    const cloudLegacyGoal = goal(
      'goal-legacy',
      125_000,
      '2026-08-17T10:00:00.000Z',
    );

    await legacyLocal.goals.add(localLegacyGoal);
    await legacyCloud.realGoals.add({
      ...cloudLegacyGoal,
      id: '#goal-legacy',
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'legacy-cloud',
    });

    const client = createDeviceClient(
      legacyLocal,
      legacyCloud,
    );

    const controller = new AutomaticSyncController({
      client,
      settingsRepository: createSettingsRepository(),
      eventTarget: window,
      isVisible: () => true,
      isOnline: () => true,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });

    try {
      await controller.initialize();

      await vi.waitFor(() => {
        expect(client.syncRealGoals).toHaveBeenCalled();
      });

      expect(await previewRealGoalSync(
        legacyLocal,
        legacyCloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      )).toMatchObject({
        differingEntityCount: 1,
        changeOrigin: 'unknown',
      });

      expect(await legacyLocal.goals.get('goal-legacy')).toMatchObject({
        targetValue: 110_000,
        updatedAt: '2026-08-17T09:00:00.000Z',
      });
      expect(await legacyCloud.realGoals.get('#goal-legacy')).toMatchObject({
        targetValue: 125_000,
        updatedAt: '2026-08-17T10:00:00.000Z',
      });
      expect(await legacyCloud.realSyncBaselines.get(
        `${ACCOUNT_USER_ID}:goals:goals`,
      )).toBeUndefined();
    } finally {
      controller.dispose();
      resetGoalStateRuntimeForTests();

      const names = [
        legacyLocal.name,
        legacyCloud.name,
      ];

      legacyLocal.close();
      legacyCloud.close();

      await Promise.all(
        names.map((name) => Dexie.delete(name)),
      );
    }
  });
});
