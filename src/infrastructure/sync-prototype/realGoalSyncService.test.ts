import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealGoalSync,
  synchronizeRealGoals,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

type CloudMetadata = {
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

  constructor() {
    super(`sportpilot-b2-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoals: 'id, metric, status, startDate, deadline, updatedAt',
      realGoalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

function goal(
  id: string,
  updatedAt: string,
  targetValue = 100_000,
): Goal {
  return {
    id,
    title: 'Objectif test',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-07-01',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt,
  };
}

describe('synchronisation B2 des objectifs réels', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-b2-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie un objectif local une seule fois sans doublon', async () => {
    const value = goal('goal-1', '2026-07-01T09:00:00.000Z');
    await local.goals.add(value);

    const first = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedGoals).toBe(1);
    expect(second.uploadedGoals).toBe(0);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realGoals.count()).toBe(1);
    expect(await cloud.realGoals.get('#goal-1')).toMatchObject({
      targetValue: 100_000,
    });
  });

  it('ignore les métadonnées techniques Dexie Cloud', async () => {
    const value = goal('goal-cloud-metadata', '2026-07-01T09:00:00.000Z');
    await local.goals.add(value);
    await cloud.realGoals.add({
      ...value,
      id: `#${value.id}`,
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 1_751_360_400_000,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
  });

  it('télécharge un objectif distant plus récent', async () => {
    await local.goals.add(goal('goal-2', '2026-07-01T09:00:00.000Z', 50_000));
    await cloud.realGoals.add({
      ...goal('#goal-2', '2026-07-01T10:00:00.000Z', 80_000),
      owner: 'user-1',
    });

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedGoals).toBe(1);
    expect(await local.goals.get('goal-2')).toMatchObject({
      targetValue: 80_000,
      updatedAt: '2026-07-01T10:00:00.000Z',
    });
  });

  it('ignore strictement les lignes appartenant à un autre compte', async () => {
    await cloud.realGoals.add({
      ...goal('#goal-other', '2026-07-01T10:00:00.000Z'),
      owner: 'user-2',
    });

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedGoals).toBe(0);
    expect(await local.goals.count()).toBe(0);
    expect(await cloud.realGoals.count()).toBe(1);
  });

  it('propage une suppression plus récente sans résurrection', async () => {
    const value = goal('goal-3', '2026-07-01T09:00:00.000Z');
    await cloud.realGoals.add({ ...value, id: `#${value.id}`, owner: 'user-1' });
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'goal', entityId: value.id },
        '2026-07-01T11:00:00.000Z',
      ),
    );

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.removedCloudGoals).toBe(1);
    expect(await cloud.realGoals.get(`#${value.id}`)).toBeUndefined();
    expect(
      await cloud.realGoalDeletionRecords.get(`#deletion:goal:${value.id}`),
    ).toMatchObject({ status: 'deleted' });
  });

  it('restaure un objectif plus récent qu’un ancien marqueur', async () => {
    const value = goal('goal-4', '2026-07-01T12:00:00.000Z');
    await local.goals.add(value);
    await cloud.realGoalDeletionRecords.add({
      ...createDeletedDeletionRecord(
        { entityType: 'goal', entityId: value.id },
        '2026-07-01T10:00:00.000Z',
      ),
      id: `#deletion:goal:${value.id}`,
      owner: 'user-1',
    });

    const result = await synchronizeRealGoals(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.uploadedGoals).toBe(1);
    expect(await local.deletionRecords.get(`deletion:goal:${value.id}`)).toMatchObject({
      status: 'restored',
    });
  });

  it('analyse les écarts sans modifier les bases', async () => {
    await local.goals.add(goal('goal-5', '2026-07-01T09:00:00.000Z'));

    const preview = await previewRealGoalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview).toMatchObject({
      localGoalCount: 1,
      cloudGoalCount: 0,
      differingEntityCount: 1,
    });
    expect(await cloud.realGoals.count()).toBe(0);
  });
});
