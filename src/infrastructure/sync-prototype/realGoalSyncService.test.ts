import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  applyInitialRealGoalReconciliation,
  prepareInitialRealGoalReconciliation,
  previewRealGoalSync,
  synchronizeRealGoals,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

const USER_ID = 'user-1';

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};
type CloudGoal = Goal & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realGoals: Table<CloudGoal, string>;
  declare realGoalDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor() {
    super(`sportpilot-b2-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function goal(
  id: string,
  updatedAt: string,
  targetValue = 100_000,
  title = 'Objectif test',
): Goal {
  return {
    id,
    title,
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-07-01',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt,
  };
}

async function putCloudGoal(
  cloud: TestCloudDatabase,
  value: Goal,
  owner = USER_ID,
  syncRevision?: number,
) {
  await cloud.realGoals.put({
    ...value,
    id: `#${value.id}`,
    owner,
    ...(syncRevision !== undefined
      ? { syncRevision, syncActorId: 'cloud-device' }
      : {}),
  });
}

async function bootstrapEqual(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  value: Goal,
) {
  await local.goals.put(value);
  await putCloudGoal(cloud, value);
  const preview = await previewRealGoalSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    USER_ID,
  );
  expect(preview.differingEntityCount).toBe(0);
  expect(await cloud.realSyncBaselines.count()).toBe(1);
}

describe('synchronisation sûre des objectifs réels', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-b2-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await Promise.all([local.delete(), cloud.delete()]);
  });

  it('bootstrappe une baseline sans écriture métier lorsque les deux côtés sont égaux', async () => {
    const value = goal('goal-equal', '2026-07-01T09:00:00.000Z');
    await local.goals.add(value);
    await putCloudGoal(cloud, value);
    const beforeLocal = await local.goals.toArray();
    const beforeCloud = await cloud.realGoals.toArray();

    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(preview.differingEntityCount).toBe(0);
    expect(await local.goals.toArray()).toEqual(beforeLocal);
    expect(await cloud.realGoals.toArray()).toEqual(beforeCloud);
    expect(await cloud.realSyncBaselines.count()).toBe(1);
  });

  it('refuse unknown sans baseline ni head causal', async () => {
    const localGoal = goal(
      'goal-unknown',
      '2026-07-01T09:00:00.000Z',
    );
    await local.goals.add(localGoal);

    await expect(synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).rejects.toThrow('réconciliation explicite');

    expect(await local.goals.get('goal-unknown')).toEqual(localGoal);
    expect(await cloud.realGoals.get('#goal-unknown')).toBeUndefined();
    expect(await cloud.realSyncBaselines.get(
      USER_ID + ':goals:goals',
    )).toBeUndefined();
  });

  it('refuse both sans head causal au lieu de comparer updatedAt', async () => {
    const initial = goal(
      'goal-both',
      '2026-07-01T09:00:00.000Z',
      100_000,
    );
    await bootstrapEqual(local, cloud, initial);

    await local.goals.put(
      goal(
        'goal-both',
        '2026-07-01T10:00:00.000Z',
        110_000,
      ),
    );
    await putCloudGoal(
      cloud,
      goal(
        'goal-both',
        '2026-07-01T11:00:00.000Z',
        120_000,
      ),
      USER_ID,
      3,
    );

    await expect(synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).rejects.toThrow('réconciliation explicite');

    expect(await local.goals.get('goal-both')).toMatchObject({
      targetValue: 110_000,
      updatedAt: '2026-07-01T10:00:00.000Z',
    });
    expect(await cloud.realGoals.get('#goal-both')).toMatchObject({
      targetValue: 120_000,
      updatedAt: '2026-07-01T11:00:00.000Z',
    });
  });

  it('applique local vers cloud uniquement après une baseline qui démontre la provenance locale', async () => {
    const initial = goal('goal-local', '2026-07-01T09:00:00.000Z', 100_000);
    await bootstrapEqual(local, cloud, initial);
    const changed = goal('goal-local', '2026-07-01T10:00:00.000Z', 130_000);
    await local.goals.put(changed);

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'local' });

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(result.uploadedGoals).toBe(1);
    expect(result.downloadedGoals).toBe(0);
    expect(await cloud.realGoals.get('#goal-local')).toMatchObject({ targetValue: 130_000 });
  });

  it('applique cloud vers local uniquement après une baseline qui démontre la provenance cloud', async () => {
    const initial = goal('goal-cloud', '2026-07-01T09:00:00.000Z', 100_000);
    await bootstrapEqual(local, cloud, initial);
    const changed = goal('goal-cloud', '2026-07-01T11:00:00.000Z', 140_000);
    await putCloudGoal(cloud, changed, USER_ID, 4);

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'cloud' });

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(result.downloadedGoals).toBe(1);
    expect(result.uploadedGoals).toBe(0);
    expect(await local.goals.get('goal-cloud')).toMatchObject({ targetValue: 140_000 });
  });

  it('prépare un aperçu compréhensible avant la première réconciliation', async () => {
    await local.goals.add(goal(
      'goal-preview',
      '2026-07-01T10:00:00.000Z',
      110_000,
      'Marcher davantage',
    ));
    await putCloudGoal(
      cloud,
      goal('goal-preview', '2026-07-01T11:00:00.000Z', 120_000, 'Marcher davantage'),
    );

    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(prepared.preview.changeOrigin).toBe('unknown');
    expect(prepared.items).toEqual([
      expect.objectContaining({
        id: 'goal-preview',
        title: 'Marcher davantage',
        localStatus: 'modified',
        cloudStatus: 'modified',
        keepLocalConsequence: expect.stringContaining('version de cet appareil'),
        useCloudConsequence: expect.stringContaining('version cloud'),
      }),
    ]);
    expect(JSON.stringify(prepared.items).toLowerCase()).not.toContain('tombstone');
  });

  it('réconcilie explicitement en conservant cet appareil puis établit une baseline', async () => {
    const localValue = goal('goal-reconcile-local', '2026-07-01T10:00:00.000Z', 125_000);
    const cloudValue = goal('goal-reconcile-local', '2026-07-01T11:00:00.000Z', 150_000);
    await local.goals.add(localValue);
    await putCloudGoal(cloud, cloudValue);
    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    const result = await applyInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    );

    expect(result.uploadedGoals).toBe(1);
    expect(await cloud.realGoals.get('#goal-reconcile-local')).toMatchObject({
      targetValue: 125_000,
    });
    expect(await cloud.realSyncBaselines.count()).toBe(1);
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
  });

  it('réconcilie explicitement en utilisant le cloud puis établit une baseline', async () => {
    await local.goals.add(goal('goal-reconcile-cloud', '2026-07-01T10:00:00.000Z', 125_000));
    await putCloudGoal(
      cloud,
      goal('goal-reconcile-cloud', '2026-07-01T11:00:00.000Z', 155_000),
    );
    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    const result = await applyInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'use-cloud',
    );

    expect(result.downloadedGoals).toBe(1);
    expect(await local.goals.get('goal-reconcile-cloud')).toMatchObject({
      targetValue: 155_000,
    });
    expect(await cloud.realSyncBaselines.count()).toBe(1);
  });

  it('annule sans écriture cloud si le local change entre prepare et apply', async () => {
    await local.goals.add(goal('goal-race-local', '2026-07-01T10:00:00.000Z', 100_000));
    await putCloudGoal(
      cloud,
      goal('goal-race-local', '2026-07-01T11:00:00.000Z', 120_000),
    );
    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    await local.goals.put(goal('goal-race-local', '2026-07-01T12:00:00.000Z', 130_000));
    const beforeCloud = await cloud.realGoals.toArray();

    await expect(applyInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    )).rejects.toThrow('ont changé');

    expect(await cloud.realGoals.toArray()).toEqual(beforeCloud);
    expect(await cloud.realSyncBaselines.count()).toBe(0);
  });

  it('annule sans écriture locale si le cloud change entre prepare et apply', async () => {
    await local.goals.add(goal('goal-race-cloud', '2026-07-01T10:00:00.000Z', 100_000));
    await putCloudGoal(
      cloud,
      goal('goal-race-cloud', '2026-07-01T11:00:00.000Z', 120_000),
    );
    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const beforeLocal = await local.goals.toArray();
    await putCloudGoal(
      cloud,
      goal('goal-race-cloud', '2026-07-01T12:00:00.000Z', 135_000),
      USER_ID,
      5,
    );

    await expect(applyInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'use-cloud',
    )).rejects.toThrow('ont changé');

    expect(await local.goals.toArray()).toEqual(beforeLocal);
    expect(await cloud.realSyncBaselines.count()).toBe(0);
  });

  it('préserve strictement les données Goals d’un autre compte pendant la réconciliation', async () => {
    await local.goals.add(goal('goal-own', '2026-07-01T10:00:00.000Z', 100_000));
    await putCloudGoal(
      cloud,
      goal('goal-own', '2026-07-01T11:00:00.000Z', 120_000),
    );
    await putCloudGoal(
      cloud,
      goal('goal-foreign', '2026-07-01T12:00:00.000Z', 999_000),
      'other-user',
      7,
    );
    const foreignBefore = await cloud.realGoals.get('#goal-foreign');
    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    await applyInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    );

    expect(await cloud.realGoals.get('#goal-foreign')).toEqual(foreignBefore);
  });

  it('préserve une suppression explicite lors du choix conserver cet appareil', async () => {
    const cloudValue = goal('goal-deleted', '2026-07-01T09:00:00.000Z');
    await putCloudGoal(cloud, cloudValue);
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'goal', entityId: cloudValue.id },
        '2026-07-01T12:00:00.000Z',
      ),
    );
    const prepared = await prepareInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(prepared.items[0]).toMatchObject({
      localStatus: 'deleted',
      cloudStatus: 'present',
    });

    await applyInitialRealGoalReconciliation(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      prepared,
      'keep-local',
    );

    expect(await cloud.realGoals.get('#goal-deleted')).toBeUndefined();
    expect(await cloud.realGoalDeletionRecords.get('#deletion:goal:goal-deleted'))
      .toMatchObject({ status: 'deleted' });
  });
});
