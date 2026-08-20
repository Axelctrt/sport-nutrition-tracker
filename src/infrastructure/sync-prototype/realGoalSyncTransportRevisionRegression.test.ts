import Dexie, { type Table } from 'dexie';
import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealGoalSync,
  synchronizeRealGoals,
  synchronizeRealGoalsToCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'user-goals-transport-revision';
const GOAL_ID = 'goal-transport-revision';

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
};
type CloudGoal = Goal & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realGoals: Table<CloudGoal, string>;
  declare realGoalDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor() {
    super(`sportpilot-goals-transport-revision-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function goal(targetValue: number, updatedAt: string): Goal {
  return {
    id: GOAL_ID,
    title: 'TEST PROD REEL MGL',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-18',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-08-18T11:51:21.266Z',
    updatedAt,
  };
}

async function putCloudGoal(
  cloud: TestCloudDatabase,
  value: Goal,
  syncRevision: number,
  syncActorId: string,
): Promise<void> {
  await cloud.realGoals.put({
    ...value,
    id: `#${value.id}`,
    owner: USER_ID,
    syncRevision,
    syncActorId,
  });
}

function clientFor(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  initialPreview: Awaited<ReturnType<typeof previewRealGoalSync>>,
): SyncPrototypeClient {
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realGoals: { enabled: true, status: 'ready', preview: initialPreview },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };

  const analyzeRealGoals = vi.fn(async () => {
    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realGoals: { enabled: true, status: 'ready', preview },
    };
    return preview;
  });

  const syncRealGoals = vi.fn(async () => {
    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realGoals: {
        enabled: true,
        status: 'ready',
        preview,
        lastResult: result,
      },
    };
    return result;
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    initialize: async () => undefined,
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({ differingEntityCount: 0 })),
    syncRealWeights: vi.fn(async () => ({})),
    analyzeRealGoals,
    syncRealGoals,
  } as unknown as SyncPrototypeClient;
}

function goalsAdapter(client: SyncPrototypeClient) {
  const adapter = createSyncOrchestratorDomains(client)
    .find((candidate) => candidate.id === 'goals');
  if (!adapter) throw new Error('Adapter Goals introuvable dans le test.');
  return adapter;
}

describe('Goals — Dexie native clock-skew reconciliation drives the bridge', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(
      `sportpilot-goals-transport-local-${crypto.randomUUID()}`,
    );
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('télécharge le gagnant Dexie cloud-only même si son updatedAt brut est plus ancien', async () => {
    const baseline = goal(10_000, '2026-08-20T10:40:00.000Z');
    await local.goals.put(baseline);
    await putCloudGoal(cloud, baseline, 32, 'device-b');

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });

    /*
     * A (téléphone à l'heure) produit 8000 hors ligne. Le staging local doit
     * écrire cette mutation dans le replica Dexie dès T1, avant reconnexion.
     */
    const olderRealWorldA = goal(
      8_000,
      '2026-08-20T11:48:53.250Z',
    );
    await local.goals.put(olderRealWorldA);
    await synchronizeRealGoalsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await cloud.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 8_000,
    });

    /*
     * B modifie réellement plus tard, mais son PC a une horloge murale en
     * retard. Après transport, Dexie Cloud a déjà compensé le skew et choisi
     * l'opération B. On simule ici ce résultat natif dans le replica : 55000
     * est le gagnant transport malgré un Goal.updatedAt brut inférieur à A.
     */
    const newerRealWorldBWithStaleClock = goal(
      55_000,
      '2026-08-20T10:49:49.636Z',
    );
    await putCloudGoal(
      cloud,
      newerRealWorldBWithStaleClock,
      34,
      'device-b',
    );

    const nativeDexieWinnerPreview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(nativeDexieWinnerPreview).toMatchObject({
      differingEntityCount: 1,
      changeOrigin: 'cloud',
    });

    const client = clientFor(local, cloud, nativeDexieWinnerPreview);
    const result = await goalsAdapter(client).synchronize('cloud-only');

    expect(result).toMatchObject({ downloadedGoals: 1 });
    expect(client.syncRealGoals).not.toHaveBeenCalled();
    expect(await local.goals.get(GOAL_ID)).toMatchObject({
      targetValue: 55_000,
      updatedAt: '2026-08-20T10:49:49.636Z',
    });
    expect(await cloud.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 55_000,
      updatedAt: '2026-08-20T10:49:49.636Z',
      syncRevision: 34,
    });
    expect(client.getSnapshot().realGoals?.preview).toMatchObject({
      differingEntityCount: 0,
    });
  });
});
