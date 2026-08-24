import type { Table } from 'dexie';
import type { Activity } from '@/domain/models/activity';
import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import {
  flushEndurancePlanningPersistence,
  type PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stripCloudFields,
  type CloudOwned,
  type CloudSyncExecutionOptions,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import {
  maximumLogicalSyncStamp,
  persistLogicalSyncBaseline,
  readDatabaseLogicalSyncChangeOrigin,
  resolveDatabaseLogicalSyncState,
  resolveSyncActorId,
  stripLogicalSyncFields,
  upsertLogicalCloudValue,
  type LogicalSyncFields,
  type LogicalSyncStamp,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import { reloadUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

type CloudActivity = Omit<Activity, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;
type CloudEndurancePlanningSession = Omit<PlannedEnduranceSession, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

export interface RealActivitySyncPreview {
  readonly localActivityCount: number;
  readonly cloudActivityCount: number;
  readonly localEndurancePlanningCount?: number;
  readonly cloudEndurancePlanningCount?: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
  readonly changeOrigin?: 'local' | 'cloud' | 'both' | 'unknown';
}

export interface RealActivitySyncResult extends RealActivitySyncPreview {
  readonly uploadedActivities: number;
  readonly downloadedActivities: number;
  readonly uploadedEndurancePlanningSessions?: number;
  readonly downloadedEndurancePlanningSessions?: number;
  readonly removedLocalEndurancePlanningSessions?: number;
  readonly removedCloudEndurancePlanningSessions?: number;
  readonly removedLocalActivities: number;
  readonly removedCloudActivities: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly completedAt: string;
}

interface ActivityEntityState {
  readonly activity?: Activity;
  readonly marker?: DeletionRecord;
}

interface EndurancePlanningEntityState {
  readonly session?: PlannedEnduranceSession;
  readonly marker?: DeletionRecord;
}

interface ActivityLocalState {
  readonly localActivities: readonly Activity[];
  readonly localMarkers: readonly DeletionRecord[];
  readonly localEndurancePlanningSessions: readonly PlannedEnduranceSession[];
}

interface ActivityDomainState extends ActivityLocalState {
  readonly cloudActivities: readonly Activity[];
  readonly cloudEndurancePlanningSessions: readonly PlannedEnduranceSession[];
  readonly cloudMarkers: readonly DeletionRecord[];
  readonly cloudActivityRows: readonly CloudOwned<CloudActivity>[];
  readonly cloudEndurancePlanningRows: readonly CloudOwned<CloudEndurancePlanningSession>[];
  readonly cloudMarkerRows: readonly CloudOwned<CloudDeletionRecord>[];
}

interface ActivityLogicalState {
  readonly activities: readonly Activity[];
  readonly endurancePlanningSessions: readonly PlannedEnduranceSession[];
  readonly markers: readonly DeletionRecord[];
}

interface RealActivitySyncExecutionOptions extends CloudSyncExecutionOptions {
  readonly requireChangeOrigin?: 'cloud' | 'local';
}

interface RegisteredActivitySyncContext {
  readonly localDatabase: AppDatabase;
  readonly cloudDatabase: SyncPrototypeDatabase;
}

const registeredActivitySyncContexts =
  new Map<string, RegisteredActivitySyncContext>();

function toCloudActivity(activity: Activity): CloudActivity {
  return { ...activity, id: cloudPrivateId(activity.id) };
}

function fromCloudActivity(
  activity: CloudOwned<CloudActivity>,
): Activity | undefined {
  const localId = localIdFromCloud(activity.id);
  if (!localId) return undefined;
  return {
    ...stripLogicalSyncFields(stripCloudFields(activity)),
    id: localId,
  } as Activity;
}

function toCloudEndurancePlanningSession(
  session: PlannedEnduranceSession,
): CloudEndurancePlanningSession {
  return { ...session, id: cloudPrivateId(session.id) };
}

function fromCloudEndurancePlanningSession(
  session: CloudOwned<CloudEndurancePlanningSession>,
): PlannedEnduranceSession | undefined {
  const localId = localIdFromCloud(session.id);
  if (!localId) return undefined;
  return {
    ...stripLogicalSyncFields(stripCloudFields(session)),
    id: localId,
  };
}

function toCloudMarker(marker: DeletionRecord): CloudDeletionRecord {
  return { ...marker, id: cloudPrivateId(marker.id) };
}

function fromCloudMarker(
  marker: CloudOwned<CloudDeletionRecord>,
): DeletionRecord | undefined {
  const localId = localIdFromCloud(marker.id);
  if (!localId) return undefined;
  return {
    ...stripLogicalSyncFields(stripCloudFields(marker)),
    id: localId,
  };
}

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function activityMarker(
  markers: ReadonlyMap<string, DeletionRecord>,
  id: string,
): DeletionRecord | undefined {
  return markers.get(deletionRecordId('activity', id));
}

function planningMarker(
  markers: ReadonlyMap<string, DeletionRecord>,
  id: string,
): DeletionRecord | undefined {
  return markers.get(deletionRecordId('endurancePlanningSession', id));
}

function effectiveActivityState(
  activity: Activity | undefined,
  marker: DeletionRecord | undefined,
): ActivityEntityState {
  let effectiveMarker = marker;
  if (
    activity
    && effectiveMarker?.status === 'deleted'
    && activity.updatedAt > effectiveMarker.updatedAt
  ) {
    effectiveMarker = createRestoredDeletionRecord(
      { entityType: 'activity', entityId: activity.id },
      activity.updatedAt,
      effectiveMarker.deletedAt,
      effectiveMarker,
    );
  }

  const deletionWins =
    effectiveMarker?.status === 'deleted'
    && (!activity || effectiveMarker.updatedAt >= activity.updatedAt);

  return {
    ...(deletionWins ? {} : activity ? { activity } : {}),
    ...(effectiveMarker ? { marker: effectiveMarker } : {}),
  };
}

function effectivePlanningState(
  session: PlannedEnduranceSession | undefined,
  marker: DeletionRecord | undefined,
): EndurancePlanningEntityState {
  let effectiveMarker = marker;
  if (
    session
    && effectiveMarker?.status === 'deleted'
    && session.updatedAt > effectiveMarker.updatedAt
  ) {
    effectiveMarker = createRestoredDeletionRecord(
      {
        entityType: 'endurancePlanningSession',
        entityId: session.id,
      },
      session.updatedAt,
      effectiveMarker.deletedAt,
      effectiveMarker,
    );
  }

  const deletionWins =
    effectiveMarker?.status === 'deleted'
    && (!session || effectiveMarker.updatedAt >= session.updatedAt);

  return {
    ...(deletionWins ? {} : session ? { session } : {}),
    ...(effectiveMarker ? { marker: effectiveMarker } : {}),
  };
}

function resolveSingleSideLogicalState(
  activities: readonly Activity[],
  endurancePlanningSessions: readonly PlannedEnduranceSession[],
  markers: readonly DeletionRecord[],
): ActivityLogicalState {
  const activityById = mapById(activities);
  const planningById = mapById(endurancePlanningSessions);
  const markerById = mapById(markers);
  const activityIds = new Set([
    ...activityById.keys(),
    ...markers
      .filter((marker) => marker.entityType === 'activity')
      .map((marker) => marker.entityId),
  ]);
  const planningIds = new Set([
    ...planningById.keys(),
    ...markers
      .filter((marker) => marker.entityType === 'endurancePlanningSession')
      .map((marker) => marker.entityId),
  ]);
  const effectiveActivities: Activity[] = [];
  const effectivePlanningSessions: PlannedEnduranceSession[] = [];
  const effectiveMarkers: DeletionRecord[] = [];

  for (const id of activityIds) {
    const resolved = effectiveActivityState(
      activityById.get(id),
      activityMarker(markerById, id),
    );
    if (resolved.activity) effectiveActivities.push(resolved.activity);
    if (resolved.marker) effectiveMarkers.push(resolved.marker);
  }
  for (const id of planningIds) {
    const resolved = effectivePlanningState(
      planningById.get(id),
      planningMarker(markerById, id),
    );
    if (resolved.session) effectivePlanningSessions.push(resolved.session);
    if (resolved.marker) effectiveMarkers.push(resolved.marker);
  }

  return {
    activities: sortById(effectiveActivities),
    endurancePlanningSessions: sortById(effectivePlanningSessions),
    markers: sortById(effectiveMarkers),
  };
}

function buildLogicalStates(state: ActivityDomainState) {
  return {
    local: resolveSingleSideLogicalState(
      state.localActivities,
      state.localEndurancePlanningSessions,
      state.localMarkers,
    ),
    cloud: resolveSingleSideLogicalState(
      state.cloudActivities,
      state.cloudEndurancePlanningSessions,
      state.cloudMarkers,
    ),
  };
}

async function readLocalState(localDatabase: AppDatabase): Promise<ActivityLocalState> {
  const [localActivities, localMarkers, localEndurancePlanningSessions] =
    await Promise.all([
      localDatabase.activities.toArray(),
      localDatabase.deletionRecords
        .filter(
          (marker) =>
            marker.entityType === 'activity'
            || marker.entityType === 'endurancePlanningSession',
        )
        .toArray(),
      localDatabase.endurancePlanningSessions.toArray(),
    ]);
  return {
    localActivities,
    localMarkers,
    localEndurancePlanningSessions,
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<ActivityDomainState> {
  await flushEndurancePlanningPersistence();
  const [local, cloudActivityRows, cloudEndurancePlanningRows, cloudMarkerRows] =
    await Promise.all([
      readLocalState(localDatabase),
      cloudDatabase.realActivities.toArray(),
      cloudDatabase.realEndurancePlanningSessions.toArray(),
      cloudDatabase.realActivityDeletionRecords.toArray(),
    ]);

  const ownedCloudActivityRows = cloudActivityRows.filter((activity) =>
    belongsToCurrentUser(activity, currentUserId));
  const ownedCloudEndurancePlanningRows = cloudEndurancePlanningRows.filter(
    (session) => belongsToCurrentUser(session, currentUserId),
  );
  const ownedCloudMarkerRows = cloudMarkerRows.filter(
    (marker) =>
      (marker.entityType === 'activity'
        || marker.entityType === 'endurancePlanningSession')
      && belongsToCurrentUser(marker, currentUserId),
  );

  return {
    ...local,
    cloudActivities: ownedCloudActivityRows
      .map(fromCloudActivity)
      .filter((activity): activity is Activity => activity !== undefined),
    cloudEndurancePlanningSessions: ownedCloudEndurancePlanningRows
      .map(fromCloudEndurancePlanningSession)
      .filter(
        (session): session is PlannedEnduranceSession => session !== undefined,
      ),
    cloudMarkers: ownedCloudMarkerRows
      .map(fromCloudMarker)
      .filter((marker): marker is DeletionRecord => marker !== undefined),
    cloudActivityRows: ownedCloudActivityRows,
    cloudEndurancePlanningRows: ownedCloudEndurancePlanningRows,
    cloudMarkerRows: ownedCloudMarkerRows,
  };
}

function buildPreview(state: ActivityDomainState): RealActivitySyncPreview {
  const localActivityById = mapById(state.localActivities);
  const cloudActivityById = mapById(state.cloudActivities);
  const localPlanningById = mapById(state.localEndurancePlanningSessions);
  const cloudPlanningById = mapById(state.cloudEndurancePlanningSessions);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const activityIds = new Set([
    ...localActivityById.keys(),
    ...cloudActivityById.keys(),
    ...state.localMarkers
      .filter((marker) => marker.entityType === 'activity')
      .map((marker) => marker.entityId),
    ...state.cloudMarkers
      .filter((marker) => marker.entityType === 'activity')
      .map((marker) => marker.entityId),
  ]);
  const planningIds = new Set([
    ...localPlanningById.keys(),
    ...cloudPlanningById.keys(),
    ...state.localMarkers
      .filter((marker) => marker.entityType === 'endurancePlanningSession')
      .map((marker) => marker.entityId),
    ...state.cloudMarkers
      .filter((marker) => marker.entityType === 'endurancePlanningSession')
      .map((marker) => marker.entityId),
  ]);

  let differingEntityCount = 0;
  for (const id of activityIds) {
    const local = effectiveActivityState(
      localActivityById.get(id),
      activityMarker(localMarkerById, id),
    );
    const cloud = effectiveActivityState(
      cloudActivityById.get(id),
      activityMarker(cloudMarkerById, id),
    );
    if (!sameEntity(local, cloud)) differingEntityCount += 1;
  }
  for (const id of planningIds) {
    const local = effectivePlanningState(
      localPlanningById.get(id),
      planningMarker(localMarkerById, id),
    );
    const cloud = effectivePlanningState(
      cloudPlanningById.get(id),
      planningMarker(cloudMarkerById, id),
    );
    if (!sameEntity(local, cloud)) differingEntityCount += 1;
  }

  return {
    localActivityCount: state.localActivities.length,
    cloudActivityCount: state.cloudActivities.length,
    localEndurancePlanningCount: state.localEndurancePlanningSessions.length,
    cloudEndurancePlanningCount: state.cloudEndurancePlanningSessions.length,
    localDeletionCount: state.localMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    cloudDeletionCount: state.cloudMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    differingEntityCount,
  };
}

function maximumActivityCloudStamp(state: ActivityDomainState): LogicalSyncStamp {
  return maximumLogicalSyncStamp([
    ...state.cloudActivityRows,
    ...state.cloudEndurancePlanningRows,
    ...state.cloudMarkerRows,
  ]);
}

async function readOrigin(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: ActivityDomainState,
) {
  const logical = buildLogicalStates(state);
  return readDatabaseLogicalSyncChangeOrigin({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'activities',
    entityId: 'activities',
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumActivityCloudStamp(state),
  });
}

async function persistEqualActivityBaseline(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: ActivityDomainState,
): Promise<void> {
  const logical = buildLogicalStates(state);
  if (!sameEntity(logical.local, logical.cloud)) return;

  const actorId = await resolveSyncActorId(localDatabase);
  const resolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'activities',
    entityId: 'activities',
    actorId,
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumActivityCloudStamp(state),
    legacyResolve: () => logical.local,
  });
  await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
}

function emptyResult(preview: RealActivitySyncPreview): RealActivitySyncResult {
  return {
    ...preview,
    uploadedActivities: 0,
    downloadedActivities: 0,
    uploadedEndurancePlanningSessions: 0,
    downloadedEndurancePlanningSessions: 0,
    removedLocalEndurancePlanningSessions: 0,
    removedCloudEndurancePlanningSessions: 0,
    removedLocalActivities: 0,
    removedCloudActivities: 0,
    uploadedDeletionRecords: 0,
    downloadedDeletionRecords: 0,
    completedAt: new Date().toISOString(),
  };
}

function countChanged<T extends { id: string }>(
  current: readonly T[],
  target: readonly T[],
): number {
  const currentById = mapById(current);
  return target.filter((value) => !sameEntity(currentById.get(value.id), value)).length;
}

function countRemoved<T extends { id: string }>(
  current: readonly T[],
  target: readonly T[],
): number {
  const targetIds = new Set(target.map((value) => value.id));
  return current.filter((value) => !targetIds.has(value.id)).length;
}

function resultForTarget(
  preview: RealActivitySyncPreview,
  state: ActivityDomainState,
  target: ActivityLogicalState,
  direction: 'local-to-cloud' | 'cloud-to-local',
): RealActivitySyncResult {
  return {
    ...preview,
    uploadedActivities:
      direction === 'local-to-cloud'
        ? countChanged(state.cloudActivities, target.activities)
        : 0,
    downloadedActivities:
      direction === 'cloud-to-local'
        ? countChanged(state.localActivities, target.activities)
        : 0,
    uploadedEndurancePlanningSessions:
      direction === 'local-to-cloud'
        ? countChanged(
            state.cloudEndurancePlanningSessions,
            target.endurancePlanningSessions,
          )
        : 0,
    downloadedEndurancePlanningSessions:
      direction === 'cloud-to-local'
        ? countChanged(
            state.localEndurancePlanningSessions,
            target.endurancePlanningSessions,
          )
        : 0,
    removedLocalEndurancePlanningSessions:
      direction === 'cloud-to-local'
        ? countRemoved(
            state.localEndurancePlanningSessions,
            target.endurancePlanningSessions,
          )
        : 0,
    removedCloudEndurancePlanningSessions:
      direction === 'local-to-cloud'
        ? countRemoved(
            state.cloudEndurancePlanningSessions,
            target.endurancePlanningSessions,
          )
        : 0,
    removedLocalActivities:
      direction === 'cloud-to-local'
        ? countRemoved(state.localActivities, target.activities)
        : 0,
    removedCloudActivities:
      direction === 'local-to-cloud'
        ? countRemoved(state.cloudActivities, target.activities)
        : 0,
    uploadedDeletionRecords:
      direction === 'local-to-cloud'
        ? countChanged(state.cloudMarkers, target.markers)
        : 0,
    downloadedDeletionRecords:
      direction === 'cloud-to-local'
        ? countChanged(state.localMarkers, target.markers)
        : 0,
    completedAt: new Date().toISOString(),
  };
}

function sameCloudOwnedCollection<T extends { id: string }>(
  current: readonly CloudOwned<T>[],
  expected: readonly CloudOwned<T>[],
): boolean {
  const normalize = (values: readonly CloudOwned<T>[]) => values
    .map((value) => stripCloudFields(value))
    .sort((left, right) => left.id.localeCompare(right.id));
  return sameEntity(normalize(current), normalize(expected));
}

function sameLocalState(
  current: ActivityLocalState,
  expected: ActivityLocalState,
): boolean {
  return (
    sameEntity(
      sortById(current.localActivities),
      sortById(expected.localActivities),
    )
    && sameEntity(
      sortById(current.localEndurancePlanningSessions),
      sortById(expected.localEndurancePlanningSessions),
    )
    && sameEntity(
      sortById(current.localMarkers),
      sortById(expected.localMarkers),
    )
  );
}

async function cloudStateMatchesExpected(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  expected: ActivityDomainState,
): Promise<boolean> {
  const [activities, planning, markers] = await Promise.all([
    cloudDatabase.realActivities.toArray(),
    cloudDatabase.realEndurancePlanningSessions.toArray(),
    cloudDatabase.realActivityDeletionRecords.toArray(),
  ]);
  const ownedActivities = activities.filter((value) =>
    belongsToCurrentUser(value, currentUserId));
  const ownedPlanning = planning.filter((value) =>
    belongsToCurrentUser(value, currentUserId));
  const ownedMarkers = markers.filter(
    (value) =>
      (value.entityType === 'activity'
        || value.entityType === 'endurancePlanningSession')
      && belongsToCurrentUser(value, currentUserId),
  );
  return (
    sameCloudOwnedCollection(ownedActivities, expected.cloudActivityRows)
    && sameCloudOwnedCollection(
      ownedPlanning,
      expected.cloudEndurancePlanningRows,
    )
    && sameCloudOwnedCollection(ownedMarkers, expected.cloudMarkerRows)
  );
}

async function applyLocalTargetIfUnchanged(
  localDatabase: AppDatabase,
  expected: ActivityDomainState,
  target: ActivityLogicalState,
): Promise<boolean> {
  let applied = false;
  await localDatabase.transaction(
    'rw',
    [
      localDatabase.activities,
      localDatabase.endurancePlanningSessions,
      localDatabase.deletionRecords,
    ],
    async () => {
      const current = await readLocalState(localDatabase);
      if (!sameLocalState(current, expected)) return;

      const targetActivityIds = new Set(target.activities.map((value) => value.id));
      const targetPlanningIds = new Set(
        target.endurancePlanningSessions.map((value) => value.id),
      );
      const targetMarkerIds = new Set(target.markers.map((value) => value.id));

      await localDatabase.activities.bulkDelete(
        expected.localActivities
          .filter((value) => !targetActivityIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.endurancePlanningSessions.bulkDelete(
        expected.localEndurancePlanningSessions
          .filter((value) => !targetPlanningIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.deletionRecords.bulkDelete(
        expected.localMarkers
          .filter((value) => !targetMarkerIds.has(value.id))
          .map((value) => value.id),
      );

      if (target.activities.length > 0) {
        await localDatabase.activities.bulkPut([...target.activities]);
      }
      if (target.endurancePlanningSessions.length > 0) {
        await localDatabase.endurancePlanningSessions.bulkPut([
          ...target.endurancePlanningSessions,
        ]);
      }
      if (target.markers.length > 0) {
        await localDatabase.deletionRecords.bulkPut([...target.markers]);
      }
      applied = true;
    },
  );
  return applied;
}

async function applyCloudTargetIfUnchanged(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  expected: ActivityDomainState,
  target: ActivityLogicalState,
  stamp: LogicalSyncStamp,
): Promise<boolean> {
  const currentActivityById = mapById(expected.cloudActivities);
  const currentPlanningById = mapById(expected.cloudEndurancePlanningSessions);
  const currentMarkerById = mapById(expected.cloudMarkers);
  const activityRowById = new Map(
    expected.cloudActivityRows.flatMap((row) => {
      const id = localIdFromCloud(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const planningRowById = new Map(
    expected.cloudEndurancePlanningRows.flatMap((row) => {
      const id = localIdFromCloud(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const markerRowById = new Map(
    expected.cloudMarkerRows.flatMap((row) => {
      const marker = fromCloudMarker(row);
      return marker ? [[marker.id, row] as const] : [];
    }),
  );

  let applied = false;
  await cloudDatabase.transaction(
    'rw',
    [
      cloudDatabase.realActivities,
      cloudDatabase.realEndurancePlanningSessions,
      cloudDatabase.realActivityDeletionRecords,
    ],
    async () => {
      if (!await cloudStateMatchesExpected(cloudDatabase, currentUserId, expected)) {
        return;
      }

      const targetActivityIds = new Set(target.activities.map((value) => value.id));
      const targetPlanningIds = new Set(
        target.endurancePlanningSessions.map((value) => value.id),
      );
      const targetMarkerIds = new Set(target.markers.map((value) => value.id));

      for (const value of expected.cloudActivities) {
        if (!targetActivityIds.has(value.id)) {
          await cloudDatabase.realActivities.delete(cloudPrivateId(value.id));
        }
      }
      for (const value of expected.cloudEndurancePlanningSessions) {
        if (!targetPlanningIds.has(value.id)) {
          await cloudDatabase.realEndurancePlanningSessions.delete(
            cloudPrivateId(value.id),
          );
        }
      }
      for (const value of expected.cloudMarkers) {
        if (!targetMarkerIds.has(value.id)) {
          await cloudDatabase.realActivityDeletionRecords.delete(
            cloudPrivateId(value.id),
          );
        }
      }

      for (const value of target.activities) {
        await upsertLogicalCloudValue(
          cloudDatabase.realActivities as Table<Activity, string>,
          currentActivityById.get(value.id),
          activityRowById.get(value.id),
          value,
          stamp,
          (candidate) => toCloudActivity(candidate) as Activity,
        );
      }
      for (const value of target.endurancePlanningSessions) {
        await upsertLogicalCloudValue(
          cloudDatabase.realEndurancePlanningSessions as Table<
            PlannedEnduranceSession,
            string
          >,
          currentPlanningById.get(value.id),
          planningRowById.get(value.id),
          value,
          stamp,
          (candidate) =>
            toCloudEndurancePlanningSession(candidate) as PlannedEnduranceSession,
        );
      }
      for (const value of target.markers) {
        await upsertLogicalCloudValue(
          cloudDatabase.realActivityDeletionRecords as Table<
            DeletionRecord,
            string
          >,
          currentMarkerById.get(value.id),
          markerRowById.get(value.id),
          value,
          stamp,
          (candidate) => toCloudMarker(candidate) as DeletionRecord,
        );
      }
      applied = true;
    },
  );
  return applied;
}

async function restoreRealActivitiesFromCloudIntoEmptyLocal(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: ActivityDomainState,
  preview: RealActivitySyncPreview,
): Promise<RealActivitySyncResult> {
  if (
    state.localActivities.length > 0
    || state.localEndurancePlanningSessions.length > 0
    || state.localMarkers.length > 0
  ) {
    const origin = await readOrigin(cloudDatabase, currentUserId, state);
    return emptyResult({
      ...preview,
      changeOrigin: origin === 'equal' ? 'unknown' : origin,
    });
  }

  const logical = buildLogicalStates(state);
  if (
    logical.cloud.activities.length === 0
    && logical.cloud.endurancePlanningSessions.length === 0
    && logical.cloud.markers.length === 0
  ) {
    return emptyResult(preview);
  }
  if (!await cloudStateMatchesExpected(cloudDatabase, currentUserId, state)) {
    return emptyResult({ ...preview, changeOrigin: 'both' });
  }

  const result = resultForTarget(preview, state, logical.cloud, 'cloud-to-local');
  const applied = await applyLocalTargetIfUnchanged(
    localDatabase,
    state,
    logical.cloud,
  );
  if (!applied) return emptyResult({ ...preview, changeOrigin: 'both' });
  await reloadUserStateRuntime(localDatabase);
  return result;
}

async function synchronizeRealActivitiesDirectional(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: ActivityDomainState,
  preview: RealActivitySyncPreview,
  requiredOrigin: 'local' | 'cloud',
): Promise<RealActivitySyncResult> {
  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (origin !== requiredOrigin) {
    return emptyResult({
      ...preview,
      changeOrigin: origin === 'equal' ? 'unknown' : origin,
    });
  }

  const logical = buildLogicalStates(state);
  const target = requiredOrigin === 'local' ? logical.local : logical.cloud;
  const actorId = await resolveSyncActorId(localDatabase);
  const resolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'activities',
    entityId: 'activities',
    actorId,
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumActivityCloudStamp(state),
    legacyResolve: () => target,
  });
  if (!sameEntity(resolution.value, target)) {
    return emptyResult({ ...preview, changeOrigin: requiredOrigin });
  }

  const result = resultForTarget(
    { ...preview, changeOrigin: requiredOrigin },
    state,
    target,
    requiredOrigin === 'local' ? 'local-to-cloud' : 'cloud-to-local',
  );

  if (requiredOrigin === 'local') {
    const currentLocal = await readLocalState(localDatabase);
    if (!sameLocalState(currentLocal, state)) {
      return emptyResult({ ...preview, changeOrigin: 'both' });
    }
    const applied = await applyCloudTargetIfUnchanged(
      cloudDatabase,
      currentUserId,
      state,
      target,
      resolution.stamp,
    );
    if (!applied) return emptyResult({ ...preview, changeOrigin: 'both' });
  } else {
    if (!await cloudStateMatchesExpected(cloudDatabase, currentUserId, state)) {
      return emptyResult({ ...preview, changeOrigin: 'both' });
    }
    const applied = await applyLocalTargetIfUnchanged(
      localDatabase,
      state,
      target,
    );
    if (!applied) return emptyResult({ ...preview, changeOrigin: 'both' });
    await reloadUserStateRuntime(localDatabase);
  }

  const converged = await readState(localDatabase, cloudDatabase, currentUserId);
  const convergedLogical = buildLogicalStates(converged);
  if (!sameEntity(convergedLogical.local, convergedLogical.cloud)) {
    return emptyResult({ ...preview, changeOrigin: 'both' });
  }
  await persistEqualActivityBaseline(
    localDatabase,
    cloudDatabase,
    currentUserId,
    converged,
  );
  return result;
}

export async function previewRealActivitySync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealActivitySyncPreview> {
  registeredActivitySyncContexts.set(currentUserId, {
    localDatabase,
    cloudDatabase,
  });
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  if (preview.differingEntityCount <= 0) {
    await persistEqualActivityBaseline(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
    );
    return preview;
  }

  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  return {
    ...preview,
    changeOrigin: origin === 'equal' ? 'unknown' : origin,
  };
}

export async function synchronizeRealActivities(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: RealActivitySyncExecutionOptions = {},
): Promise<RealActivitySyncResult> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  const writeCloud = options.writeCloud !== false;

  if (!writeCloud && !options.requireChangeOrigin) {
    return restoreRealActivitiesFromCloudIntoEmptyLocal(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
    );
  }

  if (preview.differingEntityCount <= 0) {
    await persistEqualActivityBaseline(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
    );
    return emptyResult(preview);
  }

  if (options.requireChangeOrigin) {
    return synchronizeRealActivitiesDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      options.requireChangeOrigin,
    );
  }

  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (origin === 'local') {
    return synchronizeRealActivitiesDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      'local',
    );
  }
  if (origin === 'cloud') {
    return synchronizeRealActivitiesDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      'cloud',
    );
  }

  return emptyResult({
    ...preview,
    changeOrigin: origin === 'equal' ? 'unknown' : origin,
  });
}

export async function synchronizeRealActivitiesFromCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealActivitySyncResult> {
  return synchronizeRealActivities(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: false,
    requireChangeOrigin: 'cloud',
  });
}

export async function synchronizeRealActivitiesToCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealActivitySyncResult> {
  return synchronizeRealActivities(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: true,
    requireChangeOrigin: 'local',
  });
}

function registeredActivitySyncContext(
  currentUserId: string,
): RegisteredActivitySyncContext {
  const context = registeredActivitySyncContexts.get(currentUserId);
  if (!context) {
    throw new Error(
      'Le contexte Activities doit être analysé avant une opération de continuité.',
    );
  }
  return context;
}

export async function synchronizeRegisteredRealActivitiesFromCloud(
  currentUserId: string,
): Promise<RealActivitySyncResult> {
  const context = registeredActivitySyncContext(currentUserId);
  return synchronizeRealActivitiesFromCloud(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}

export async function synchronizeRegisteredRealActivitiesToCloud(
  currentUserId: string,
): Promise<RealActivitySyncResult> {
  const context = registeredActivitySyncContext(currentUserId);
  return synchronizeRealActivitiesToCloud(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}
