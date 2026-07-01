import type { Table } from 'dexie';
import type { Activity } from '@/domain/models/activity';
import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

type CloudOwned<T> = T & {
  readonly owner?: string;
  readonly realmId?: string;
  readonly $ts?: unknown;
  readonly _hasBlobRefs?: 1;
};

type CloudActivity = Omit<Activity, 'id'> & { readonly id: string };
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
};

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

function belongsToCurrentUser(
  entity: CloudOwned<object>,
  currentUserId: string,
): boolean {
  return !entity.owner || entity.owner === currentUserId;
}

function stripCloudFields<T extends object>(entity: CloudOwned<T>): T {
  const {
    owner: _owner,
    realmId: _realmId,
    $ts: _cloudTimestamp,
    _hasBlobRefs: _hasBlobReferences,
    ...value
  } = entity;
  return value as T;
}

function cloudPrivateId(localId: string): string {
  return localId.startsWith('#') ? localId : `#${localId}`;
}

function localIdFromCloud(cloudId: string): string | undefined {
  return cloudId.startsWith('#') ? cloudId.slice(1) : undefined;
}

function toCloudActivity(activity: Activity): CloudActivity {
  return { ...activity, id: cloudPrivateId(activity.id) };
}

function fromCloudActivity(
  activity: CloudOwned<CloudActivity>,
): Activity | undefined {
  const localId = localIdFromCloud(activity.id);
  if (!localId) return undefined;
  return { ...stripCloudFields(activity), id: localId } as Activity;
}

function toCloudMarker(marker: DeletionRecord): CloudDeletionRecord {
  return { ...marker, id: cloudPrivateId(marker.id) };
}

function fromCloudMarker(
  marker: CloudOwned<CloudDeletionRecord>,
): DeletionRecord | undefined {
  const localId = localIdFromCloud(marker.id);
  if (!localId) return undefined;
  return { ...stripCloudFields(marker), id: localId };
}

function stableValue(value: unknown): string {
  const normalize = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(normalize);
    if (!candidate || typeof candidate !== 'object') return candidate;

    return Object.fromEntries(
      Object.entries(candidate)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)]),
    );
  };

  return JSON.stringify(normalize(value));
}

function chooseLatest<T extends { updatedAt: string }>(
  local: T | undefined,
  cloud: T | undefined,
): T | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  if (local.updatedAt > cloud.updatedAt) return local;
  if (cloud.updatedAt > local.updatedAt) return cloud;
  return stableValue(local) >= stableValue(cloud) ? local : cloud;
}

function sameEntity(left: unknown, right: unknown): boolean {
  return stableValue(left) === stableValue(right);
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

async function upsertCloud<T extends { id: string }>(
  table: Table<T, string>,
  current: T | undefined,
  target: T,
  toCloudValue: (value: T) => T,
): Promise<boolean> {
  if (current && sameEntity(current, target)) return false;
  await table.put(toCloudValue(target));
  return true;
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
): Promise<RealActivitySyncResult> {
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
    const resolved = resolveState(localState, cloudState);

    if (resolved.activity) {
      if (!sameEntity(localState.activity, resolved.activity)) {
        await localDatabase.activities.put(resolved.activity);
        downloadedActivities += 1;
      }
      if (
        await upsertCloud(
          cloudDatabase.realActivities as Table<Activity, string>,
          cloudState.activity,
          resolved.activity,
          (value) => toCloudActivity(value) as Activity,
        )
      ) {
        uploadedActivities += 1;
      }
    } else {
      if (localState.activity) {
        await localDatabase.activities.delete(id);
        removedLocalActivities += 1;
      }
      if (cloudState.activity) {
        await cloudDatabase.realActivities.delete(cloudPrivateId(id));
        removedCloudActivities += 1;
      }
    }

    if (resolved.marker) {
      if (!sameEntity(localState.marker, resolved.marker)) {
        await localDatabase.deletionRecords.put(resolved.marker);
        downloadedDeletionRecords += 1;
      }
      if (
        await upsertCloud(
          cloudDatabase.realActivityDeletionRecords as Table<
            DeletionRecord,
            string
          >,
          cloudState.marker,
          resolved.marker,
          (value) => toCloudMarker(value) as DeletionRecord,
        )
      ) {
        uploadedDeletionRecords += 1;
      }
    }
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
