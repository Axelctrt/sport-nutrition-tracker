import type { Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
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

type CloudGoal = Omit<Goal, 'id'> & { readonly id: string };
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
};

export interface RealGoalSyncPreview {
  readonly localGoalCount: number;
  readonly cloudGoalCount: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
}

export interface RealGoalSyncResult extends RealGoalSyncPreview {
  readonly uploadedGoals: number;
  readonly downloadedGoals: number;
  readonly removedLocalGoals: number;
  readonly removedCloudGoals: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly completedAt: string;
}

interface GoalState {
  goal?: Goal;
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

function toCloudGoal(goal: Goal): CloudGoal {
  return { ...goal, id: cloudPrivateId(goal.id) };
}

function fromCloudGoal(
  goal: CloudOwned<CloudGoal>,
): Goal | undefined {
  const localId = localIdFromCloud(goal.id);
  if (!localId) return undefined;
  return { ...stripCloudFields(goal), id: localId } as Goal;
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
  local: GoalState,
  cloud: GoalState,
): GoalState {
  const goal = chooseLatest(local.goal, cloud.goal);
  let marker = chooseLatest(local.marker, cloud.marker);

  if (
    goal &&
    marker?.status === 'deleted' &&
    goal.updatedAt > marker.updatedAt
  ) {
    marker = createRestoredDeletionRecord(
      { entityType: 'goal', entityId: goal.id },
      goal.updatedAt,
      marker.deletedAt,
      marker,
    );
  }

  const deletionWins =
    marker?.status === 'deleted' &&
    (!goal || marker.updatedAt >= goal.updatedAt);

  return {
    ...(deletionWins ? {} : goal ? { goal } : {}),
    ...(marker ? { marker } : {}),
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
) {
  const [
    localGoals,
    localMarkers,
    cloudGoalRows,
    cloudMarkerRows,
  ] = await Promise.all([
    localDatabase.goals.toArray(),
    localDatabase.deletionRecords
      .where('entityType')
      .equals('goal')
      .toArray(),
    cloudDatabase.realGoals.toArray(),
    cloudDatabase.realGoalDeletionRecords.toArray(),
  ]);

  const cloudGoals = cloudGoalRows
    .filter((goal) => belongsToCurrentUser(goal, currentUserId))
    .map(fromCloudGoal)
    .filter((goal): goal is Goal => goal !== undefined);
  const cloudMarkers = cloudMarkerRows
    .filter(
      (marker) =>
        marker.entityType === 'goal' &&
        belongsToCurrentUser(marker, currentUserId),
    )
    .map(fromCloudMarker)
    .filter((marker): marker is DeletionRecord => marker !== undefined);

  return {
    localGoals,
    localMarkers,
    cloudGoals,
    cloudMarkers,
  };
}

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function buildPreview(
  localGoals: readonly Goal[],
  localMarkers: readonly DeletionRecord[],
  cloudGoals: readonly Goal[],
  cloudMarkers: readonly DeletionRecord[],
): RealGoalSyncPreview {
  const localGoalById = mapById(localGoals);
  const cloudGoalById = mapById(cloudGoals);
  const localMarkerById = mapById(localMarkers);
  const cloudMarkerById = mapById(cloudMarkers);
  const ids = new Set([
    ...localGoalById.keys(),
    ...cloudGoalById.keys(),
    ...localMarkers.map((marker) => marker.entityId),
    ...cloudMarkers.map((marker) => marker.entityId),
  ]);

  let differingEntityCount = 0;
  for (const id of ids) {
    const markerId = deletionRecordId('goal', id);
    if (
      !sameEntity(localGoalById.get(id), cloudGoalById.get(id)) ||
      !sameEntity(localMarkerById.get(markerId), cloudMarkerById.get(markerId))
    ) {
      differingEntityCount += 1;
    }
  }

  return {
    localGoalCount: localGoals.length,
    cloudGoalCount: cloudGoals.length,
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

export async function previewRealGoalSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealGoalSyncPreview> {
  const state = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  return buildPreview(
    state.localGoals,
    state.localMarkers,
    state.cloudGoals,
    state.cloudMarkers,
  );
}

export async function synchronizeRealGoals(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  const state = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  const preview = buildPreview(
    state.localGoals,
    state.localMarkers,
    state.cloudGoals,
    state.cloudMarkers,
  );
  const localGoalById = mapById(state.localGoals);
  const cloudGoalById = mapById(state.cloudGoals);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const ids = new Set([
    ...localGoalById.keys(),
    ...cloudGoalById.keys(),
    ...state.localMarkers.map((marker) => marker.entityId),
    ...state.cloudMarkers.map((marker) => marker.entityId),
  ]);

  let uploadedGoals = 0;
  let downloadedGoals = 0;
  let removedLocalGoals = 0;
  let removedCloudGoals = 0;
  let uploadedDeletionRecords = 0;
  let downloadedDeletionRecords = 0;

  for (const id of ids) {
    const markerId = deletionRecordId('goal', id);
    const localGoal = localGoalById.get(id);
    const localMarker = localMarkerById.get(markerId);
    const cloudGoal = cloudGoalById.get(id);
    const cloudMarker = cloudMarkerById.get(markerId);
    const localState: GoalState = {
      ...(localGoal ? { goal: localGoal } : {}),
      ...(localMarker ? { marker: localMarker } : {}),
    };
    const cloudState: GoalState = {
      ...(cloudGoal ? { goal: cloudGoal } : {}),
      ...(cloudMarker ? { marker: cloudMarker } : {}),
    };
    const resolved = resolveState(localState, cloudState);

    if (resolved.goal) {
      if (!sameEntity(localState.goal, resolved.goal)) {
        await localDatabase.goals.put(resolved.goal);
        downloadedGoals += 1;
      }
      if (
        await upsertCloud(
          cloudDatabase.realGoals as Table<Goal, string>,
          cloudState.goal,
          resolved.goal,
          (value) => toCloudGoal(value) as Goal,
        )
      ) {
        uploadedGoals += 1;
      }
    } else {
      if (localState.goal) {
        await localDatabase.goals.delete(id);
        removedLocalGoals += 1;
      }
      if (cloudState.goal) {
        await cloudDatabase.realGoals.delete(cloudPrivateId(id));
        removedCloudGoals += 1;
      }
    }

    if (resolved.marker) {
      if (!sameEntity(localState.marker, resolved.marker)) {
        await localDatabase.deletionRecords.put(resolved.marker);
        downloadedDeletionRecords += 1;
      }
      if (
        await upsertCloud(
          cloudDatabase.realGoalDeletionRecords as Table<
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
    uploadedGoals,
    downloadedGoals,
    removedLocalGoals,
    removedCloudGoals,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}
