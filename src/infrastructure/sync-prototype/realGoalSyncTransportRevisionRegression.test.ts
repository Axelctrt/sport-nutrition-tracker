import Dexie, { type Table } from 'dexie';
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
} from '@/infrastructure/sync-prototype/realGoalSyncService';

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

describe('Goals — transport revision must not override business LWW', () => {
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

  it('refuse qu’un ancien 8000 avec une révision transport plus haute écrase un 10000 métier plus récent', async () => {
    const baseline = goal(10_000, '2026-08-20T08:40:00.000Z');
    await local.goals.put(baseline);
    await putCloudGoal(cloud, baseline, 24, 'device-b');

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });

    /*
     * B produit ensuite une vraie mutation plus récente. On simule le replica
     * optimiste devenu égal avant confirmation serveur : la baseline locale
     * est donc avancée sur 10000@08:50 avec la révision 25.
     */
    const newerB = goal(10_000, '2026-08-20T08:50:00.000Z');
    await local.goals.put(newerB);
    await putCloudGoal(cloud, newerB, 25, 'device-b');

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });

    /*
     * Le round-trip transport confirme ensuite une mutation A plus ancienne
     * mais munie d’une révision transport supérieure. C’est la forme exacte
     * observée sur la Preview physique : updatedAt métier ancien, révision
     * Dexie récente.
     */
    const olderA = goal(8_000, '2026-08-20T08:47:18.269Z');
    await putCloudGoal(cloud, olderA, 26, 'device-a');

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({
      differingEntityCount: 1,
      changeOrigin: 'cloud',
    });

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(result.downloadedGoals).toBe(0);
    expect(await local.goals.get(GOAL_ID)).toMatchObject({
      targetValue: 10_000,
      updatedAt: '2026-08-20T08:50:00.000Z',
    });
    expect(await cloud.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 10_000,
      updatedAt: '2026-08-20T08:50:00.000Z',
      syncRevision: 27,
    });
  });
});
