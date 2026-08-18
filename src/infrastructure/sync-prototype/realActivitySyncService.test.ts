import Dexie, { type Table } from 'dexie';
import type { Activity } from '@/domain/models/activity';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealActivitySync,
  synchronizeRealActivities,
  synchronizeRealActivitiesFromCloud,
  synchronizeRealActivitiesToCloud,
} from '@/infrastructure/sync-prototype/realActivitySyncService';

const USER_ID = 'user-activities-safe';

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};
type CloudActivity = Activity & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;
type CloudEndurancePlanningSession = PlannedEnduranceSession & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realActivities: Table<CloudActivity, string>;
  declare realEndurancePlanningSessions: Table<CloudEndurancePlanningSession, string>;
  declare realActivityDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor() {
    super(`sportpilot-activities-safe-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realActivities: 'id, date, type, [date+type], updatedAt',
      realEndurancePlanningSessions: 'id, date, activityType, status, updatedAt',
      realActivityDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId, updatedAt',
    });
  }
}

function runningActivity(
  id: string,
  updatedAt: string,
  distanceKm = 10,
  plannedId?: string,
): Activity {
  return {
    id,
    type: 'running',
    date: '2026-08-18',
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
    ...(plannedId
      ? {
          plannedActivity: {
            source: 'endurancePlanning' as const,
            sourceId: plannedId,
          },
        }
      : {}),
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt,
  };
}

function plannedSession(
  id: string,
  updatedAt: string,
  title = 'Sortie facile',
  completedActivityId?: string,
): PlannedEnduranceSession {
  return {
    id,
    title,
    activityType: 'running',
    date: '2026-08-19',
    intensity: 'low',
    targetDurationMinutes: 45,
    status: 'planned',
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt,
    ...(completedActivityId ? { completedActivityId } : {}),
  };
}

async function putCloudActivity(
  cloud: TestCloudDatabase,
  value: Activity,
  revision = 0,
  owner = USER_ID,
): Promise<void> {
  await cloud.realActivities.put({
    ...value,
    id: `#${value.id}`,
    owner,
    realmId: owner,
    ...(revision > 0
      ? { syncRevision: revision, syncActorId: 'cloud-device' }
      : {}),
  });
}

async function putCloudPlanning(
  cloud: TestCloudDatabase,
  value: PlannedEnduranceSession,
  revision = 0,
  owner = USER_ID,
): Promise<void> {
  await cloud.realEndurancePlanningSessions.put({
    ...value,
    id: `#${value.id}`,
    owner,
    realmId: owner,
    ...(revision > 0
      ? { syncRevision: revision, syncActorId: 'cloud-device' }
      : {}),
  });
}

async function putCloudMarker(
  cloud: TestCloudDatabase,
  marker: DeletionRecord,
  revision = 0,
  owner = USER_ID,
): Promise<void> {
  await cloud.realActivityDeletionRecords.put({
    ...marker,
    id: `#${marker.id}`,
    owner,
    realmId: owner,
    ...(revision > 0
      ? { syncRevision: revision, syncActorId: 'cloud-device' }
      : {}),
  });
}

async function bootstrapEqual(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  options: {
    activity?: Activity;
    planning?: PlannedEnduranceSession;
    markers?: readonly DeletionRecord[];
  } = {},
): Promise<void> {
  if (options.activity) {
    await local.activities.put(options.activity);
    await putCloudActivity(cloud, options.activity);
  }
  if (options.planning) {
    await local.endurancePlanningSessions.put(options.planning);
    await putCloudPlanning(cloud, options.planning);
  }
  if (options.markers?.length) {
    await local.deletionRecords.bulkPut([...options.markers]);
    for (const marker of options.markers) await putCloudMarker(cloud, marker);
  }

  expect(await previewRealActivitySync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    USER_ID,
  )).toMatchObject({ differingEntityCount: 0 });
  expect(await cloud.realSyncBaselines.toArray()).toEqual([
    expect.objectContaining({
      accountUserId: USER_ID,
      domainId: 'activities',
      entityId: 'activities',
    }),
  ]);
}

async function businessState(local: AppDatabase, cloud: TestCloudDatabase) {
  return Promise.all([
    local.activities.toArray(),
    local.endurancePlanningSessions.toArray(),
    local.deletionRecords
      .filter(
        (marker) =>
          marker.entityType === 'activity'
          || marker.entityType === 'endurancePlanningSession',
      )
      .toArray(),
    cloud.realActivities.toArray(),
    cloud.realEndurancePlanningSessions.toArray(),
    cloud.realActivityDeletionRecords.toArray(),
  ]);
}

describe('continuité sûre Activities', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-activities-safe-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('bootstrappe une seule baseline de domaine uniquement lorsque activités, planning et suppressions sont égaux', async () => {
    const activity = runningActivity('activity-equal', '2026-08-18T09:00:00.000Z');
    const planning = plannedSession('plan-equal', '2026-08-18T09:00:00.000Z');
    await local.activities.put(activity);
    await local.endurancePlanningSessions.put(planning);
    await putCloudActivity(cloud, activity);
    await putCloudPlanning(cloud, planning);
    const before = await businessState(local, cloud);

    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(preview).toMatchObject({
      differingEntityCount: 0,
      localActivityCount: 1,
      cloudActivityCount: 1,
      localEndurancePlanningCount: 1,
      cloudEndurancePlanningCount: 1,
    });
    expect(await businessState(local, cloud)).toEqual(before);
    expect(await cloud.realSyncBaselines.count()).toBe(1);
  });

  it('reste fail-closed unknown sans baseline pour le générique et les deux directionnels', async () => {
    await local.activities.put(
      runningActivity('activity-unknown', '2026-08-18T09:00:00.000Z'),
    );
    await local.endurancePlanningSessions.put(
      plannedSession('plan-unknown', '2026-08-18T09:00:00.000Z'),
    );
    const before = await businessState(local, cloud);

    expect(await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ differingEntityCount: 2, changeOrigin: 'unknown' });

    for (const execute of [
      synchronizeRealActivities,
      synchronizeRealActivitiesToCloud,
      synchronizeRealActivitiesFromCloud,
    ]) {
      const result = await execute(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      );
      expect(result).toMatchObject({
        changeOrigin: 'unknown',
        uploadedActivities: 0,
        downloadedActivities: 0,
        uploadedEndurancePlanningSessions: 0,
        downloadedEndurancePlanningSessions: 0,
        uploadedDeletionRecords: 0,
        downloadedDeletionRecords: 0,
      });
    }
    expect(await businessState(local, cloud)).toEqual(before);
    expect(await cloud.realSyncBaselines.count()).toBe(0);
  });

  it('envoie seulement la provenance locale pour une activité et reste idempotent après convergence', async () => {
    const initial = runningActivity('activity-local', '2026-08-18T09:00:00.000Z', 10);
    await bootstrapEqual(local, cloud, { activity: initial });
    await local.activities.put(
      runningActivity('activity-local', '2026-08-18T10:00:00.000Z', 14),
    );

    expect(await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'local' });

    const first = await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    const second = await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(first.uploadedActivities).toBe(1);
    expect(await cloud.realActivities.get('#activity-local')).toMatchObject({
      distanceKm: 14,
    });
    expect(second.uploadedActivities).toBe(0);
    expect(second.differingEntityCount).toBe(0);
  });

  it('télécharge seulement la provenance cloud pour une activité', async () => {
    const initial = runningActivity('activity-cloud', '2026-08-18T09:00:00.000Z', 10);
    await bootstrapEqual(local, cloud, { activity: initial });
    await putCloudActivity(
      cloud,
      runningActivity('activity-cloud', '2026-08-18T11:00:00.000Z', 16),
      3,
    );

    expect(await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'cloud' });

    const result = await synchronizeRealActivitiesFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(result.downloadedActivities).toBe(1);
    expect(await local.activities.get('activity-cloud')).toMatchObject({
      distanceKm: 16,
    });
  });

  it('synchronise le planning endurance dans les deux directions avec sa provenance', async () => {
    const initial = plannedSession('plan-directional', '2026-08-18T09:00:00.000Z', 'Initiale');
    await bootstrapEqual(local, cloud, { planning: initial });

    const localChanged = plannedSession(
      'plan-directional',
      '2026-08-18T10:00:00.000Z',
      'Locale',
    );
    await local.endurancePlanningSessions.put(localChanged);
    expect(await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'local' });
    expect((await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).uploadedEndurancePlanningSessions).toBe(1);
    expect(await cloud.realEndurancePlanningSessions.get('#plan-directional'))
      .toMatchObject({ title: 'Locale' });

    const cloudChanged = plannedSession(
      'plan-directional',
      '2026-08-18T12:00:00.000Z',
      'Cloud',
    );
    await putCloudPlanning(cloud, cloudChanged, 5);
    expect(await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'cloud' });
    expect((await synchronizeRealActivitiesFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).downloadedEndurancePlanningSessions).toBe(1);
    expect(await local.endurancePlanningSessions.get('plan-directional'))
      .toMatchObject({ title: 'Cloud' });
  });

  it('reste fail-closed both même via le merge générique', async () => {
    const initial = runningActivity('activity-both', '2026-08-18T09:00:00.000Z', 10);
    await bootstrapEqual(local, cloud, { activity: initial });
    await local.activities.put(
      runningActivity('activity-both', '2026-08-18T10:00:00.000Z', 12),
    );
    await putCloudActivity(
      cloud,
      runningActivity('activity-both', '2026-08-18T11:00:00.000Z', 15),
      4,
    );
    const before = await businessState(local, cloud);

    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(preview.changeOrigin).toBe('both');

    for (const execute of [
      synchronizeRealActivities,
      synchronizeRealActivitiesToCloud,
      synchronizeRealActivitiesFromCloud,
    ]) {
      const result = await execute(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      );
      expect(result).toMatchObject({
        changeOrigin: 'both',
        uploadedActivities: 0,
        downloadedActivities: 0,
      });
    }
    expect(await businessState(local, cloud)).toEqual(before);
  });

  it('propage une suppression puis une restauration d’activité sans résurrection silencieuse', async () => {
    const initial = runningActivity('activity-delete', '2026-08-18T09:00:00.000Z');
    await bootstrapEqual(local, cloud, { activity: initial });
    const deleted = createDeletedDeletionRecord(
      { entityType: 'activity', entityId: initial.id },
      '2026-08-18T10:00:00.000Z',
    );
    await local.activities.delete(initial.id);
    await local.deletionRecords.put(deleted);

    expect((await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).removedCloudActivities).toBe(1);
    expect(await cloud.realActivities.get('#activity-delete')).toBeUndefined();
    expect(await cloud.realActivityDeletionRecords.get(`#${deleted.id}`))
      .toMatchObject({ status: 'deleted' });

    const restoredActivity = runningActivity(
      'activity-delete',
      '2026-08-18T11:00:00.000Z',
      11,
    );
    const restored = createRestoredDeletionRecord(
      { entityType: 'activity', entityId: initial.id },
      restoredActivity.updatedAt,
      deleted.deletedAt,
      deleted,
    );
    await local.activities.put(restoredActivity);
    await local.deletionRecords.put(restored);

    expect(await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    )).toMatchObject({ changeOrigin: 'local' });
    await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(await cloud.realActivities.get('#activity-delete')).toMatchObject({
      distanceKm: 11,
    });
    expect(await cloud.realActivityDeletionRecords.get(`#${deleted.id}`))
      .toMatchObject({ status: 'restored' });
  });

  it('propage suppression et restauration du planning endurance', async () => {
    const initial = plannedSession('plan-delete', '2026-08-18T09:00:00.000Z');
    await bootstrapEqual(local, cloud, { planning: initial });
    const deleted = createDeletedDeletionRecord(
      { entityType: 'endurancePlanningSession', entityId: initial.id },
      '2026-08-18T10:00:00.000Z',
    );
    await local.endurancePlanningSessions.delete(initial.id);
    await local.deletionRecords.put(deleted);
    await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(await cloud.realEndurancePlanningSessions.get('#plan-delete')).toBeUndefined();

    const restoredPlanning = plannedSession(
      'plan-delete',
      '2026-08-18T11:00:00.000Z',
      'Restaurée',
    );
    const restored = createRestoredDeletionRecord(
      { entityType: 'endurancePlanningSession', entityId: initial.id },
      restoredPlanning.updatedAt,
      deleted.deletedAt,
      deleted,
    );
    await local.endurancePlanningSessions.put(restoredPlanning);
    await local.deletionRecords.put(restored);
    await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    expect(await cloud.realEndurancePlanningSessions.get('#plan-delete'))
      .toMatchObject({ title: 'Restaurée' });
  });

  it('préserve le lien bidirectionnel activité réalisée ↔ planning endurance', async () => {
    const activity = runningActivity(
      'activity-linked',
      '2026-08-18T10:00:00.000Z',
      10,
      'plan-linked',
    );
    const planning = plannedSession(
      'plan-linked',
      '2026-08-18T10:00:00.000Z',
      'Séance liée',
      activity.id,
    );
    await bootstrapEqual(local, cloud);
    await local.activities.put(activity);
    await local.endurancePlanningSessions.put(planning);

    await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(await cloud.realActivities.get('#activity-linked')).toMatchObject({
      plannedActivity: { source: 'endurancePlanning', sourceId: 'plan-linked' },
    });
    expect(await cloud.realEndurancePlanningSessions.get('#plan-linked')).toMatchObject({
      completedActivityId: 'activity-linked',
    });
  });

  it('ignore strictement les données d’un autre compte', async () => {
    await putCloudActivity(
      cloud,
      runningActivity('activity-other', '2026-08-18T10:00:00.000Z'),
      2,
      'user-other',
    );
    await putCloudPlanning(
      cloud,
      plannedSession('plan-other', '2026-08-18T10:00:00.000Z'),
      2,
      'user-other',
    );

    const preview = await previewRealActivitySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );

    expect(preview).toMatchObject({
      cloudActivityCount: 0,
      cloudEndurancePlanningCount: 0,
      differingEntityCount: 0,
    });
    expect(await local.activities.count()).toBe(0);
    expect(await cloud.realActivities.count()).toBe(1);
  });

  it('restaure un compte cloud vers un local réellement vide sans écrire dans le cloud', async () => {
    const activity = runningActivity('activity-restore', '2026-08-18T10:00:00.000Z');
    const planning = plannedSession('plan-restore', '2026-08-18T10:00:00.000Z');
    await putCloudActivity(cloud, activity, 2);
    await putCloudPlanning(cloud, planning, 2);
    const cloudBefore = await Promise.all([
      cloud.realActivities.toArray(),
      cloud.realEndurancePlanningSessions.toArray(),
      cloud.realActivityDeletionRecords.toArray(),
    ]);

    const result = await synchronizeRealActivities(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(result).toMatchObject({
      downloadedActivities: 1,
      downloadedEndurancePlanningSessions: 1,
      uploadedActivities: 0,
      uploadedEndurancePlanningSessions: 0,
    });
    expect(await local.activities.get(activity.id)).toBeDefined();
    expect(await local.endurancePlanningSessions.get(planning.id)).toBeDefined();
    expect(await Promise.all([
      cloud.realActivities.toArray(),
      cloud.realEndurancePlanningSessions.toArray(),
      cloud.realActivityDeletionRecords.toArray(),
    ])).toEqual(cloudBefore);
  });

  it('annule le local→cloud si le cloud change juste avant le CAS', async () => {
    const initial = runningActivity('activity-cloud-race', '2026-08-18T09:00:00.000Z', 10);
    await bootstrapEqual(local, cloud, { activity: initial });
    await local.activities.put(
      runningActivity('activity-cloud-race', '2026-08-18T10:00:00.000Z', 12),
    );

    const originalToArray = cloud.realActivities.toArray.bind(cloud.realActivities);
    let calls = 0;
    const spy = vi.spyOn(cloud.realActivities, 'toArray').mockImplementation(() =>
      Dexie.waitFor(async () => {
        calls += 1;
        if (calls === 2) {
          await putCloudActivity(
            cloud,
            runningActivity('activity-cloud-race', '2026-08-18T11:00:00.000Z', 99),
            9,
          );
        }
        return originalToArray();
      }));

    const result = await synchronizeRealActivitiesToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    spy.mockRestore();

    expect(result.uploadedActivities).toBe(0);
    expect(result.changeOrigin).toBe('both');
    expect(await cloud.realActivities.get('#activity-cloud-race')).toMatchObject({
      distanceKm: 99,
    });
  });

  it('annule le cloud→local si le local change juste avant le CAS', async () => {
    const initial = runningActivity('activity-local-race', '2026-08-18T09:00:00.000Z', 10);
    await bootstrapEqual(local, cloud, { activity: initial });
    await putCloudActivity(
      cloud,
      runningActivity('activity-local-race', '2026-08-18T11:00:00.000Z', 15),
      4,
    );

    const originalToArray = local.activities.toArray.bind(local.activities);
    let calls = 0;
    const spy = vi.spyOn(local.activities, 'toArray').mockImplementation(() =>
      Dexie.waitFor(async () => {
        calls += 1;
        if (calls === 2) {
          await local.activities.put(
            runningActivity('activity-local-race', '2026-08-18T12:00:00.000Z', 88),
          );
        }
        return originalToArray();
      }));

    const result = await synchronizeRealActivitiesFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    spy.mockRestore();

    expect(result.downloadedActivities).toBe(0);
    expect(result.changeOrigin).toBe('both');
    expect(await local.activities.get('activity-local-race')).toMatchObject({
      distanceKm: 88,
    });
  });
});
