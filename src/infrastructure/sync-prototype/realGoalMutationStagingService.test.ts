import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  logicalSyncBaselineId,
  type LogicalSyncBaseline,
  type LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  stageRealGoalsMutationInLocalCloudReplica,
  synchronizeRealGoalsToCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

const USER_ID = 'goal-staging-user';
const FOREIGN_USER_ID = 'foreign-goal-staging-user';
const GOAL_ID = 'goal-staging-runtime';

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
  override readonly cloud = {
    sync: vi.fn(async () => undefined),
  } as unknown as Dexie['cloud'];

  constructor() {
    super(`sportpilot-goal-staging-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realSyncBaselines:
        'id, accountUserId, domainId, entityId, updatedAt',
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

describe('staging réel des mutations Goals dans le replica Dexie local', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(
      `sportpilot-goal-staging-local-${crypto.randomUUID()}`,
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

  it('inscrit la mutation AppDB même si la provenance logique précédente est ambiguë', async () => {
    const localMutation = goal(10_000, '2026-08-20T13:30:00.000Z');
    const unchangedGoal = {
      ...goal(20_000, '2026-08-20T13:18:00.000Z'),
      id: 'goal-staging-unchanged',
    };
    const unchangedCloudGoal = {
      ...unchangedGoal,
      id: `#${unchangedGoal.id}`,
      owner: USER_ID,
      syncRevision: 35,
      syncActorId: 'device-b',
    };
    await local.goals.bulkPut([localMutation, unchangedGoal]);
    await cloud.realGoals.bulkPut([
      {
        ...goal(8_000, '2026-08-20T13:21:58.760Z'),
        id: `#${GOAL_ID}`,
        owner: USER_ID,
        syncRevision: 36,
        syncActorId: 'device-a',
      },
      unchangedCloudGoal,
    ]);
    await cloud.realSyncBaselines.put({
      id: logicalSyncBaselineId(USER_ID, 'goals', 'goals'),
      accountUserId: USER_ID,
      domainId: 'goals',
      entityId: 'goals',
      localDigest: 'ancienne-valeur-locale',
      cloudDigest: 'ancienne-valeur-cloud',
      revision: 35,
      actorId: 'device-b',
      updatedAt: '2026-08-20T13:19:45.582Z',
    });

    const reconciliationAttempt = await synchronizeRealGoalsToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(reconciliationAttempt).toMatchObject({
      uploadedGoals: 0,
      changeOrigin: 'both',
    });
    expect(await cloud.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 8_000,
      syncRevision: 36,
    });

    await stageRealGoalsMutationInLocalCloudReplica(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      [GOAL_ID],
    );

    expect(await cloud.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 10_000,
      updatedAt: '2026-08-20T13:30:00.000Z',
      syncRevision: 37,
    });
    expect(await cloud.realSyncBaselines.get(
      logicalSyncBaselineId(USER_ID, 'goals', 'goals'),
    )).toMatchObject({
      revision: 37,
    });
    expect(await cloud.realGoals.get(`#${unchangedGoal.id}`))
      .toEqual(unchangedCloudGoal);
    expect(cloud.cloud.sync).not.toHaveBeenCalled();
  });

  it('ne touche jamais aux lignes Goals appartenant à un autre compte', async () => {
    const foreignGoal = {
      ...goal(77_000, '2026-08-20T13:25:00.000Z'),
      id: '#foreign-goal',
      owner: FOREIGN_USER_ID,
      syncRevision: 12,
      syncActorId: 'foreign-device',
    };
    await cloud.realGoals.bulkPut([
      {
        ...goal(8_000, '2026-08-20T13:21:58.760Z'),
        id: `#${GOAL_ID}`,
        owner: USER_ID,
        syncRevision: 36,
        syncActorId: 'device-a',
      },
      foreignGoal,
    ]);
    await local.deletionRecords.put({
      id: `deletion:goal:${GOAL_ID}`,
      entityType: 'goal',
      entityId: GOAL_ID,
      status: 'deleted',
      deletedAt: '2026-08-20T13:31:00.000Z',
      createdAt: '2026-08-20T13:31:00.000Z',
      updatedAt: '2026-08-20T13:31:00.000Z',
    });

    await stageRealGoalsMutationInLocalCloudReplica(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      [GOAL_ID],
    );

    expect(await cloud.realGoals.get(`#${GOAL_ID}`)).toBeUndefined();
    expect(await cloud.realGoalDeletionRecords.get(
      `#deletion:goal:${GOAL_ID}`,
    )).toMatchObject({
      status: 'deleted',
      syncRevision: 37,
    });
    expect(await cloud.realGoals.get('#foreign-goal')).toEqual(foreignGoal);
  });
});
