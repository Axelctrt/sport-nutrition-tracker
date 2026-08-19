import Dexie, { type Table } from 'dexie';
import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import {
  GOAL_STATE_PERSISTED_EVENT,
  flushGoalStatePersistence,
  resetGoalStateRuntimeForTests,
  writeGoalState,
  type Goal,
} from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { AppSettings } from '@/domain/models/settings';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  applyRealGoalConcurrentReconciliation,
  prepareRealGoalConcurrentReconciliation,
} from '@/infrastructure/sync-prototype/realGoalConcurrentResolutionService';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealGoalSync,
  synchronizeRealGoals,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { initializeUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

const USER_ID = 'user-goals-both-auto';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;
const GOAL_BASELINE_ID = `${USER_ID}:goals:goals`;

type CloudGoal = Goal & LogicalSyncFields & {
  owner?: string;
  realmId?: string;
};
type CloudMarker = DeletionRecord & LogicalSyncFields & {
  owner?: string;
  realmId?: string;
};

class TestCloudDatabase extends Dexie {
  declare realGoals: Table<CloudGoal, string>;
  declare realGoalDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor() {
    super(`sportpilot-goals-both-auto-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function goal(targetValue: number, updatedAt: string): Goal {
  return {
    id: 'goal-both-auto',
    title: 'Objectif conflit puis reprise',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-01',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt,
  };
}

async function putCloudGoal(
  cloud: TestCloudDatabase,
  value: Goal,
  revision = 0,
): Promise<void> {
  await cloud.realGoals.put({
    ...value,
    id: `#${value.id}`,
    owner: USER_ID,
    realmId: USER_ID,
    ...(revision > 0
      ? { syncRevision: revision, syncActorId: 'cloud-device' }
      : {}),
  });
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

function createGoalClient(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  onAnalysis: (origin: string | undefined) => void,
): SyncPrototypeClient {
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realGoals: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealGoals = vi.fn(async () => {
    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    onAnalysis(preview.changeOrigin);
    snapshot = {
      ...snapshot,
      realGoals: { enabled: true, status: 'ready', preview } as never,
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
    analyzeRealGoals,
    syncRealGoals: vi.fn(async () => synchronizeRealGoals(
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

describe('gate Goals both — reprise automatique après résolution', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    resetGoalStateRuntimeForTests();
    window.localStorage.clear();
    local = new AppDatabase(`sportpilot-goals-both-auto-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    resetGoalStateRuntimeForTests();
    window.localStorage.clear();
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('baseline → both → choix manuel → writeGoalState persisté → provenance local → upload automatique', async () => {
    const initial = goal(100_000, '2026-08-18T09:00:00.000Z');
    await local.goals.put(initial);
    await putCloudGoal(cloud, initial);
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await cloud.realSyncBaselines.get(GOAL_BASELINE_ID)).toBeDefined();

    await local.goals.put(goal(110_000, '2026-08-18T10:00:00.000Z'));
    await putCloudGoal(
      cloud,
      goal(120_000, '2026-08-18T11:00:00.000Z'),
      3,
    );
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'both' });

    const prepared = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const resolution = await applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    );
    expect(resolution).toMatchObject({ changeOrigin: 'both', uploadedGoals: 1 });
    expect(await local.goals.get('goal-both-auto')).toMatchObject({
      targetValue: 110_000,
    });
    expect(await cloud.realGoals.get('#goal-both-auto')).toMatchObject({
      targetValue: 110_000,
    });
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await cloud.realSyncBaselines.get(GOAL_BASELINE_ID)).toBeDefined();

    await initializeUserStateRuntime(local);
    const observedOrigins: Array<string | undefined> = [];
    const client = createGoalClient(
      local,
      cloud,
      (origin) => observedOrigins.push(origin),
    );
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: settingsRepository(),
      eventTarget: window,
      isVisible: () => true,
      isOnline: () => true,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });
    const persisted = vi.fn();
    window.addEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);

    try {
      await controller.initialize();
      const analysisOffset = observedOrigins.length;
      const next = goal(140_000, '2026-08-18T12:00:00.000Z');

      writeGoalState({ version: 1, goals: [next] });
      await flushGoalStatePersistence();

      expect(persisted).toHaveBeenCalledTimes(1);
      expect(await local.goals.get(next.id)).toEqual(next);
      await vi.waitFor(async () => {
        expect(await cloud.realGoals.get(`#${next.id}`)).toMatchObject({
          targetValue: 140_000,
        });
      });

      expect(observedOrigins.slice(analysisOffset)).toContain('local');
      expect(client.syncRealGoals).not.toHaveBeenCalled();
      expect(await previewRealGoalSync(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )).toMatchObject({ differingEntityCount: 0 });
      expect(await cloud.realSyncBaselines.get(GOAL_BASELINE_ID)).toBeDefined();
    } finally {
      window.removeEventListener(GOAL_STATE_PERSISTED_EVENT, persisted);
      controller.dispose();
    }
  });
  it('A hors ligne et B cloud divergent puis la reconnexion conserve both sans choisir automatiquement', async () => {
    const initial = goal(10_000, '2026-08-19T06:00:00.000Z');
    await local.goals.put(initial);
    await putCloudGoal(cloud, initial);

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await cloud.realSyncBaselines.get(GOAL_BASELINE_ID)).toBeDefined();

    let online = false;
    const observedOrigins: Array<string | undefined> = [];
    const testClient = createGoalClient(
      local,
      cloud,
      (origin) => observedOrigins.push(origin),
    );
    const eventTarget = new EventTarget();
    const controller = new AutomaticSyncController({
      client: testClient,
      settingsRepository: settingsRepository(),
      eventTarget,
      isOnline: () => online,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });

    try {
      await controller.initialize();

      // Appareil A modifié hors ligne.
      await local.goals.put(
        goal(8_000, '2026-08-19T06:10:00.000Z'),
      );

      // Appareil B / cloud modifié indépendamment pendant que A est hors ligne.
      await putCloudGoal(
        cloud,
        goal(55_000, '2026-08-19T06:20:00.000Z'),
        3,
      );

      online = true;
      eventTarget.dispatchEvent(new Event('online'));

      await vi.waitFor(() => {
        expect(observedOrigins).toContain('both');
      });

      // Aucun côté ne gagne automatiquement.
      expect(await local.goals.get('goal-both-auto')).toMatchObject({
        targetValue: 8_000,
      });
      expect(await cloud.realGoals.get('#goal-both-auto')).toMatchObject({
        targetValue: 55_000,
      });

      expect(await previewRealGoalSync(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )).toMatchObject({
        differingEntityCount: 1,
        changeOrigin: 'both',
      });
    } finally {
      controller.dispose();
    }
  });

});
