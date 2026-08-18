import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import type { DeletionRecord } from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
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

const USER_ID = 'user-goals-both';

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
    super(`sportpilot-goals-both-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function goal(
  id: string,
  targetValue: number,
  updatedAt: string,
  title = 'Objectif conflit',
): Goal {
  return {
    id,
    title,
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
  owner = USER_ID,
): Promise<void> {
  await cloud.realGoals.put({
    ...value,
    id: `#${value.id}`,
    owner,
    realmId: owner,
    ...(revision > 0
      ? { syncRevision: revision, syncActorId: 'cloud-device' }
      : {}),
  });
}

async function createBoth(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  id = 'goal-both',
): Promise<void> {
  const initial = goal(id, 100_000, '2026-08-18T09:00:00.000Z');
  await local.goals.put(initial);
  await putCloudGoal(cloud, initial);

  expect(await previewRealGoalSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    USER_ID,
  )).toMatchObject({ differingEntityCount: 0 });
  expect(await cloud.realSyncBaselines.count()).toBe(1);

  await local.goals.put(goal(id, 110_000, '2026-08-18T10:00:00.000Z'));
  await putCloudGoal(
    cloud,
    goal(id, 120_000, '2026-08-18T11:00:00.000Z'),
    3,
  );

  expect(await previewRealGoalSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    USER_ID,
  )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'both' });
}

async function businessState(local: AppDatabase, cloud: TestCloudDatabase) {
  return Promise.all([
    local.goals.toArray(),
    local.deletionRecords.where('entityType').equals('goal').toArray(),
    cloud.realGoals.toArray(),
    cloud.realGoalDeletionRecords.toArray(),
  ]);
}

describe('résolution manuelle Goals both', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-goals-both-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('garde le merge générique fail-closed lorsque les deux côtés ont changé', async () => {
    await createBoth(local, cloud);
    const before = await businessState(local, cloud);

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(result).toMatchObject({
      changeOrigin: 'both',
      uploadedGoals: 0,
      downloadedGoals: 0,
      removedLocalGoals: 0,
      removedCloudGoals: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
    });
    expect(await businessState(local, cloud)).toEqual(before);
  });

  it('prépare le cas B réel avec un aperçu détaillé sans écrire', async () => {
    await createBoth(local, cloud);
    const before = await businessState(local, cloud);
    const baselineBefore = await cloud.realSyncBaselines.toArray();

    const prepared = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(prepared.preview.changeOrigin).toBe('both');
    expect(prepared.items).toEqual([
      expect.objectContaining({
        id: 'goal-both',
        title: 'Objectif conflit',
        localStatus: 'modified',
        cloudStatus: 'modified',
        keepLocalConsequence: expect.stringContaining('remplacera'),
        useCloudConsequence: expect.stringContaining('remplacera'),
      }),
    ]);
    expect(prepared.baselineDigest).toBeTruthy();
    expect(await businessState(local, cloud)).toEqual(before);
    expect(await cloud.realSyncBaselines.toArray()).toEqual(baselineBefore);
  });

  it('résout explicitement both en conservant cet appareil puis recrée la baseline après convergence', async () => {
    await createBoth(local, cloud);
    const prepared = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    const result = await applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    );

    expect(result).toMatchObject({ changeOrigin: 'both', uploadedGoals: 1 });
    expect(await local.goals.get('goal-both')).toMatchObject({ targetValue: 110_000 });
    expect(await cloud.realGoals.get('#goal-both')).toMatchObject({ targetValue: 110_000 });
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
    expect(await cloud.realSyncBaselines.count()).toBe(1);
  });

  it('résout explicitement both en utilisant le cloud puis recrée la baseline après convergence', async () => {
    await createBoth(local, cloud);
    const prepared = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    const result = await applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'use-cloud',
    );

    expect(result).toMatchObject({ changeOrigin: 'both', downloadedGoals: 1 });
    expect(await local.goals.get('goal-both')).toMatchObject({ targetValue: 120_000 });
    expect(await cloud.realGoals.get('#goal-both')).toMatchObject({ targetValue: 120_000 });
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
  });

  it('annule avant écriture si la baseline change depuis l’aperçu', async () => {
    await createBoth(local, cloud);
    const prepared = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const baseline = (await cloud.realSyncBaselines.toArray())[0]!;
    await cloud.realSyncBaselines.put({
      ...baseline,
      revision: baseline.revision + 1,
      updatedAt: '2026-08-18T12:00:00.000Z',
    });
    const before = await businessState(local, cloud);

    await expect(applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    )).rejects.toThrow(/référence Goals a changé/i);
    expect(await businessState(local, cloud)).toEqual(before);
  });

  it('annule avant écriture si le local ou le cloud change depuis l’aperçu', async () => {
    await createBoth(local, cloud);
    const preparedLocalRace = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    await local.goals.put(goal('goal-both', 130_000, '2026-08-18T12:00:00.000Z'));
    const cloudBeforeLocalRace = await cloud.realGoals.toArray();

    await expect(applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      preparedLocalRace,
      'keep-local',
    )).rejects.toThrow(/changé depuis l’aperçu/i);
    expect(await cloud.realGoals.toArray()).toEqual(cloudBeforeLocalRace);

    await local.goals.put(goal('goal-both', 110_000, '2026-08-18T10:00:00.000Z'));
    const preparedCloudRace = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    await putCloudGoal(
      cloud,
      goal('goal-both', 140_000, '2026-08-18T13:00:00.000Z'),
      4,
    );
    const localBeforeCloudRace = await local.goals.toArray();

    await expect(applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      preparedCloudRace,
      'use-cloud',
    )).rejects.toThrow(/changé depuis l’aperçu/i);
    expect(await local.goals.toArray()).toEqual(localBeforeCloudRace);
  });

  it('refuse un prepared appartenant à un autre compte', async () => {
    await createBoth(local, cloud);
    const prepared = await prepareRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const before = await businessState(local, cloud);

    await expect(applyRealGoalConcurrentReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-other',
      prepared,
      'keep-local',
    )).rejects.toThrow(/compte actif a changé/i);
    expect(await businessState(local, cloud)).toEqual(before);
  });
});
