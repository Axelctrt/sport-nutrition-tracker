import type { Table } from 'dexie';
import type { Activity } from '@/domain/models/activity';
import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  deleteLocalIfUnchanged,
  putLocalIfUnchanged,
} from '@/infrastructure/sync-prototype/localSyncCompareAndSwap';
import {
  belongsToCurrentUser,
  chooseLatest,
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
  resolveDatabaseLogicalSyncState,
  resolveSyncActorId,
  stripLogicalSyncFields,
  upsertLogicalCloudValue,
  type LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';

type CloudActivity = Omit<Activity, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

export interface RealActivitySyncPreview {
  readonly localActivityCount: number;
  readonly cloudActivityCount: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
}

export interface RealActivitySyncResult extends RealActivitySyncPreview {
  readonly uploadedActivities: number;
  readonly downloadedActivities: number;
  readonly removedLocalActivities: number;
  readonly removedCloudActivities: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly completedAt: string;
}

interface ActivityState {
  activity?: Activity;
  marker?: DeletionRecord;
}

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

function resolveState(
  local: ActivityState,
  cloud: ActivityState,
): ActivityState {
  const activity = chooseLatest(local.activity, cloud.activity);
  let marker = chooseLatest(local.marker, cloud.marker);

  if (
    activity &&
    marker?.status === 'deleted' &&
    activity.updatedAt > marker.updatedAt
  ) {
    marker = createRestoredDeletionRecord(
      { entityType: 'activity', entityId: activity.id },
      activity.updatedAt,
      marker.deletedAt,
      marker,
    );
  }

  const deletionWins =
    marker?.status === 'deleted' &&
    (!activity || marker.updatedAt >= activity.updatedAt);

  return {
    ...(deletionWins ? {} : activity ? { activity } : {}),
    ...(marker ? { marker } : {}),
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
) {
  const [
    localActivities,
    localMarkers,
    cloudActivityRows,
    cloudMarkerRows,
  ] = await Promise.all([
    localDatabase.activities.toArray(),
    localDatabase.deletionRecords
      .where('entityType')
      .equals('activity')
      .toArray(),
    cloudDatabase.realActivities.toArray(),
    cloudDatabase.realActivityDeletionRecords.toArray(),
  ]);

  const cloudActivities = cloudActivityRows
    .filter((activity) => belongsToCurrentUser(activity, currentUserId))
    .map(fromCloudActivity)
    .filter((activity): activity is Activity => activity !== undefined);
  const cloudMarkers = cloudMarkerRows
    .filter(
      (marker) =>
        marker.entityType === 'activity' &&
        belongsToCurrentUser(marker, currentUserId),
    )
    .map(fromCloudMarker)
    .filter((marker): marker is DeletionRecord => marker !== undefined);

  return {
    localActivities,
    localMarkers,
    cloudActivities,
    cloudMarkers,
    cloudActivityRows,
    cloudMarkerRows,
  };
}

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function buildPreview(
  localActivities: readonly Activity[],
  localMarkers: readonly DeletionRecord[],
  cloudActivities: readonly Activity[],
  cloudMarkers: readonly DeletionRecord[],
): RealActivitySyncPreview {
  const localActivityById = mapById(localActivities);
  const cloudActivityById = mapById(cloudActivities);
  const localMarkerById = mapById(localMarkers);
  const cloudMarkerById = mapById(cloudMarkers);
  const ids = new Set([
    ...localActivityById.keys(),
    ...cloudActivityById.keys(),
    ...localMarkers.map((marker) => marker.entityId),
    ...cloudMarkers.map((marker) => marker.entityId),
  ]);

  let differingEntityCount = 0;
  for (const id of ids) {
    const markerId = deletionRecordId('activity', id);
    if (
      !sameEntity(localActivityById.get(id), cloudActivityById.get(id)) ||
      !sameEntity(localMarkerById.get(markerId), cloudMarkerById.get(markerId))
    ) {
      differingEntityCount += 1;
    }
  }

  return {
    localActivityCount: localActivities.length,
    cloudActivityCount: cloudActivities.length,
    localDeletionCount: localMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    cloudDeletionCount: cloudMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    differingEntityCount,
  };
}

export async function previewRealActivitySync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealActivitySyncPreview> {
  const state = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  return buildPreview(
    state.localActivities,
    state.localMarkers,
    state.cloudActivities,
    state.cloudMarkers,
  );
}

export async function synchronizeRealActivities(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealActivitySyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  const preview = buildPreview(
    state.localActivities,
    state.localMarkers,
    state.cloudActivities,
    state.cloudMarkers,
  );
  const localActivityById = mapById(state.localActivities);
  const cloudActivityById = mapById(state.cloudActivities);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const cloudActivityRowById = new Map(
    state.cloudActivityRows.flatMap((row) => {
      const id = localIdFromCloud(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const cloudMarkerRowByEntityId = new Map(
    state.cloudMarkerRows.flatMap((row) => {
      const marker = fromCloudMarker(row);
      return marker ? [[marker.entityId, row] as const] : [];
    }),
  );
  const actorId = await resolveSyncActorId(localDatabase);
  const ids = new Set([
    ...localActivityById.keys(),
    ...cloudActivityById.keys(),
    ...state.localMarkers.map((marker) => marker.entityId),
    ...state.cloudMarkers.map((marker) => marker.entityId),
  ]);

  let uploadedActivities = 0;
  let downloadedActivities = 0;
  let removedLocalActivities = 0;
  let removedCloudActivities = 0;
  let uploadedDeletionRecords = 0;
  let downloadedDeletionRecords = 0;

  for (const id of ids) {
    const markerId = deletionRecordId('activity', id);
    const localActivity = localActivityById.get(id);
    const localMarker = localMarkerById.get(markerId);
    const cloudActivity = cloudActivityById.get(id);
    const cloudMarker = cloudMarkerById.get(markerId);
    const localState: ActivityState = {
      ...(localActivity ? { activity: localActivity } : {}),
      ...(localMarker ? { marker: localMarker } : {}),
    };
    const cloudState: ActivityState = {
      ...(cloudActivity ? { activity: cloudActivity } : {}),
      ...(cloudMarker ? { marker: cloudMarker } : {}),
    };
    const resolution = await resolveDatabaseLogicalSyncState({
      cloudDatabase,
      accountUserId: currentUserId,
      domainId: 'activities',
      entityId: id,
      actorId,
      localValue: localState,
      cloudValue: cloudState,
      cloudStamp: maximumLogicalSyncStamp([
        cloudActivityRowById.get(id),
        cloudMarkerRowByEntityId.get(id),
      ]),
      legacyResolve: resolveState,
    });
    const resolved = resolution.value;
    let localStateUnchanged = true;

    if (resolved.activity) {
      if (!sameEntity(localState.activity, resolved.activity)) {
        const applied = await putLocalIfUnchanged(
          localDatabase,
          localDatabase.activities,
          id,
          localState.activity,
          resolved.activity,
        );
        if (applied) downloadedActivities += 1;
        else localStateUnchanged = false;
      }
    } else {
      if (localState.activity) {
        const applied = await deleteLocalIfUnchanged(
          localDatabase,
          localDatabase.activities,
          id,
          localState.activity,
        );
        if (applied) removedLocalActivities += 1;
        else localStateUnchanged = false;
      }
    }

    if (resolved.marker) {
      if (!sameEntity(localState.marker, resolved.marker)) {
        const applied = await putLocalIfUnchanged(
          localDatabase,
          localDatabase.deletionRecords,
          markerId,
          localState.marker,
          resolved.marker,
        );
        if (applied) downloadedDeletionRecords += 1;
        else localStateUnchanged = false;
      }
    }

    if (!localStateUnchanged || !writeCloud) continue;

    if (resolved.activity) {
      if (
        await upsertLogicalCloudValue(
          cloudDatabase.realActivities as Table<Activity, string>,
          cloudState.activity,
          cloudActivityRowById.get(id),
          resolved.activity,
          resolution.stamp,
          (value) => toCloudActivity(value) as Activity,
        )
      ) {
        uploadedActivities += 1;
      }
    } else if (cloudState.activity) {
      await cloudDatabase.realActivities.delete(cloudPrivateId(id));
      removedCloudActivities += 1;
    }

    if (
      resolved.marker
      && await upsertLogicalCloudValue(
        cloudDatabase.realActivityDeletionRecords as Table<
          DeletionRecord,
          string
        >,
        cloudState.marker,
        cloudMarkerRowByEntityId.get(id),
        resolved.marker,
        resolution.stamp,
        (value) => toCloudMarker(value) as DeletionRecord,
      )
    ) {
      uploadedDeletionRecords += 1;
    }

    await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
  }

  return {
    ...preview,
    uploadedActivities,
    downloadedActivities,
    removedLocalActivities,
    removedCloudActivities,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}
