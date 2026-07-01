import Dexie, { type Table } from 'dexie';
import type { Activity } from '@/domain/models/activity';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealActivitySync,
  synchronizeRealActivities,
} from '@/infrastructure/sync-prototype/realActivitySyncService';

type CloudMetadata = {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};
type CloudActivity = Activity & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realActivities: Table<CloudActivity, string>;
  declare realActivityDeletionRecords: Table<CloudMarker, string>;

  constructor() {
    super(`sportpilot-b1-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realActivities: 'id, date, type, [date+type], updatedAt',
      realActivityDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

function runningActivity(
  id: string,
  updatedAt: string,
  distanceKm = 10,
): Activity {
  return {
    id,
    type: 'running',
    date: '2026-07-01',
    time: '08:00',
    sessionType: 'easy',
    durationMinutes: 60,
    intensity: 'moderate',
    distanceKm,
    averageCadenceSpm: 170,
    terrainType: 'road',
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 700,
      coefficientUsed: 1,
      calculationVersion: 1,
    },
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt,
  };
}

describe('synchronisation B1 des activités réelles', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-b1-local-${crypto.randomUUID()}`);
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

  it('envoie une activité locale une seule fois sans doublon', async () => {
    const activity = runningActivity(
      'activity-running-1',
      '2026-07-01T09:00:00.000Z',
    );
    await local.activities.add(activity);

    const first = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedActivities).toBe(1);
    expect(second.uploadedActivities).toBe(0);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realActivities.count()).toBe(1);
    expect(await cloud.realActivities.get('#activity-running-1')).toMatchObject({
      distanceKm: 10,
    });
  });

  it('ignore les métadonnées techniques Dexie Cloud dans la comparaison', async () => {
    const activity = runningActivity(
      'activity-cloud-metadata',
      '2026-07-01T09:00:00.000Z',
    );
    await local.activities.add(activity);
    await cloud.realActivities.add({
      ...activity,
      id: `#${activity.id}`,
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 1_751_360_400_000,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const result = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
    expect(result.uploadedActivities).toBe(0);
    expect(result.downloadedActivities).toBe(0);
  });

  it('télécharge une activité distante plus récente dans la base active', async () => {
    await local.activities.add(
      runningActivity('activity-running-2', '2026-07-01T09:00:00.000Z', 8),
    );
    await cloud.realActivities.add({
      ...runningActivity(
        '#activity-running-2',
        '2026-07-01T10:00:00.000Z',
        12,
      ),
      owner: 'user-1',
      realmId: 'rlm-private',
    });

    const result = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedActivities).toBe(1);
    expect(await local.activities.get('activity-running-2')).toMatchObject({
      distanceKm: 12,
      updatedAt: '2026-07-01T10:00:00.000Z',
    });
  });

  it('ignore strictement les lignes appartenant à un autre compte', async () => {
    await cloud.realActivities.add({
      ...runningActivity(
        '#activity-other-account',
        '2026-07-01T10:00:00.000Z',
      ),
      owner: 'user-2',
      realmId: 'rlm-other',
    });

    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const result = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.cloudActivityCount).toBe(0);
    expect(result.downloadedActivities).toBe(0);
    expect(await local.activities.count()).toBe(0);
    expect(await cloud.realActivities.count()).toBe(1);
  });

  it('propage une suppression plus récente sans résurrection', async () => {
    const activity = runningActivity(
      'activity-running-3',
      '2026-07-01T09:00:00.000Z',
    );
    await cloud.realActivities.add({
      ...activity,
      id: `#${activity.id}`,
      owner: 'user-1',
    });
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'activity', entityId: activity.id },
        '2026-07-01T11:00:00.000Z',
      ),
    );

    const result = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.removedCloudActivities).toBe(1);
    expect(await cloud.realActivities.get(`#${activity.id}`)).toBeUndefined();
    expect(
      await cloud.realActivityDeletionRecords.get(
        `#deletion:activity:${activity.id}`,
      ),
    ).toMatchObject({ status: 'deleted' });
  });

  it('restaure une activité modifiée après un ancien marqueur de suppression', async () => {
    const activity = runningActivity(
      'activity-running-4',
      '2026-07-01T12:00:00.000Z',
    );
    await local.activities.add(activity);
    await cloud.realActivityDeletionRecords.add({
      ...createDeletedDeletionRecord(
        { entityType: 'activity', entityId: activity.id },
        '2026-07-01T10:00:00.000Z',
      ),
      id: `#deletion:activity:${activity.id}`,
      owner: 'user-1',
    });

    const result = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.uploadedActivities).toBe(1);
    expect(
      await local.deletionRecords.get(`deletion:activity:${activity.id}`),
    ).toMatchObject({ status: 'restored' });
    expect(
      await cloud.realActivityDeletionRecords.get(
        `#deletion:activity:${activity.id}`,
      ),
    ).toMatchObject({ status: 'restored' });
  });

  it('analyse les écarts sans modifier les bases', async () => {
    await local.activities.add(
      runningActivity('activity-running-5', '2026-07-01T09:00:00.000Z'),
    );

    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview).toMatchObject({
      localActivityCount: 1,
      cloudActivityCount: 0,
      differingEntityCount: 1,
    });
    expect(await cloud.realActivities.count()).toBe(0);
  });
});
