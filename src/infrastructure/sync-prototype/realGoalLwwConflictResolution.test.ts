import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { stableValue } from '@/infrastructure/sync-prototype/cloudSyncValue';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealGoalSync,
  synchronizeRealGoals,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

const USER_ID = 'user-goal-lww-edges';

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
    super(`sportpilot-goal-lww-edges-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, updatedAt',
      realGoalDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function goal(
  targetValue: number,
  updatedAt: string,
): Goal {
  return {
    id: 'goal-lww-edge',
    title: 'Objectif LWW',
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

async function putCloudMarker(
  cloud: TestCloudDatabase,
  marker: DeletionRecord,
  revision = 0,
): Promise<void> {
  await cloud.realGoalDeletionRecords.put({
    ...marker,
    id: `#${marker.id}`,
    owner: USER_ID,
    realmId: USER_ID,
    ...(revision > 0
      ? { syncRevision: revision, syncActorId: 'cloud-device' }
      : {}),
  });
}

async function bootstrapEqual(
  local: AppDatabase,
  cloud: TestCloudDatabase,
): Promise<void> {
  const initial = goal(10_000, '2026-08-19T08:00:00.000Z');
  await local.goals.put(initial);
  await putCloudGoal(cloud, initial);
  expect(await previewRealGoalSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    USER_ID,
  )).toMatchObject({ differingEntityCount: 0 });
}

describe('Goals LWW — suppressions, restaurations et égalités', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-goal-lww-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
    await bootstrapEqual(local, cloud);
  });

  afterEach(async () => {
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('fait gagner une suppression plus récente contre une mise à jour cloud', async () => {
    const deleted = createDeletedDeletionRecord(
      { entityType: 'goal', entityId: 'goal-lww-edge' },
      '2026-08-19T12:00:00.000Z',
    );
    await local.goals.delete('goal-lww-edge');
    await local.deletionRecords.put(deleted);
    await putCloudGoal(
      cloud,
      goal(55_000, '2026-08-19T11:00:00.000Z'),
      3,
    );

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'both', differingEntityCount: 1 });

    await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(await local.goals.get('goal-lww-edge')).toBeUndefined();
    expect(await cloud.realGoals.get('#goal-lww-edge')).toBeUndefined();
    expect(await local.deletionRecords.get(
      deletionRecordId('goal', 'goal-lww-edge'),
    )).toMatchObject({ status: 'deleted', updatedAt: '2026-08-19T12:00:00.000Z' });
    expect(await cloud.realGoalDeletionRecords.get(
      '#deletion:goal:goal-lww-edge',
    )).toMatchObject({ status: 'deleted', updatedAt: '2026-08-19T12:00:00.000Z' });
  });

  it('fait gagner une restauration plus récente contre une suppression cloud', async () => {
    const cloudDeleted = createDeletedDeletionRecord(
      { entityType: 'goal', entityId: 'goal-lww-edge' },
      '2026-08-19T11:00:00.000Z',
    );
    await cloud.realGoals.delete('#goal-lww-edge');
    await putCloudMarker(cloud, cloudDeleted, 4);

    const restoredGoal = goal(60_000, '2026-08-19T12:00:00.000Z');
    const localRestored = createRestoredDeletionRecord(
      { entityType: 'goal', entityId: 'goal-lww-edge' },
      '2026-08-19T12:00:00.000Z',
      cloudDeleted.deletedAt,
      cloudDeleted,
    );
    await local.goals.put(restoredGoal);
    await local.deletionRecords.put(localRestored);

    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'both', differingEntityCount: 1 });

    await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(await local.goals.get('goal-lww-edge')).toMatchObject({
      targetValue: 60_000,
      updatedAt: '2026-08-19T12:00:00.000Z',
    });
    expect(await cloud.realGoals.get('#goal-lww-edge')).toMatchObject({
      targetValue: 60_000,
      updatedAt: '2026-08-19T12:00:00.000Z',
    });
    expect(await cloud.realGoalDeletionRecords.get(
      '#deletion:goal:goal-lww-edge',
    )).toMatchObject({ status: 'restored', updatedAt: '2026-08-19T12:00:00.000Z' });
  });

  it('utilise un tie-break stable lorsque updatedAt est strictement identique', async () => {
    const timestamp = '2026-08-19T13:00:00.000Z';
    const localValue = goal(70_000, timestamp);
    const cloudValue = goal(80_000, timestamp);
    await local.goals.put(localValue);
    await putCloudGoal(cloud, cloudValue, 5);

    const expected = stableValue({ goal: localValue }) >= stableValue({ goal: cloudValue })
      ? localValue
      : cloudValue;

    await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(await local.goals.get('goal-lww-edge')).toMatchObject({
      targetValue: expected.targetValue,
      updatedAt: timestamp,
    });
    expect(await cloud.realGoals.get('#goal-lww-edge')).toMatchObject({
      targetValue: expected.targetValue,
      updatedAt: timestamp,
    });
    expect(await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 0 });
  });
});
