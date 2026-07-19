import type { Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
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

type CloudGoal = Omit<Goal, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

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

function toCloudGoal(goal: Goal): CloudGoal {
  return { ...goal, id: cloudPrivateId(goal.id) };
}

function fromCloudGoal(
  goal: CloudOwned<CloudGoal>,
): Goal | undefined {
  const localId = localIdFromCloud(goal.id);
  if (!localId) return undefined;
  return {
    ...stripLogicalSyncFields(stripCloudFields(goal)),
    id: localId,
  } as Goal;
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
    cloudGoalRows,
    cloudMarkerRows,
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
  options: CloudSyncExecutionOptions = {},
): Promise<RealGoalSyncResult> {
  const writeCloud = options.writeCloud !== false;
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
  const cloudGoalRowById = new Map(
    state.cloudGoalRows.flatMap((row) => {
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
    const resolution = await resolveDatabaseLogicalSyncState({
      cloudDatabase,
      accountUserId: currentUserId,
      domainId: 'goals',
      entityId: id,
      actorId,
      localValue: localState,
      cloudValue: cloudState,
      cloudStamp: maximumLogicalSyncStamp([
        cloudGoalRowById.get(id),
        cloudMarkerRowByEntityId.get(id),
      ]),
      legacyResolve: resolveState,
    });
    const resolved = resolution.value;
    let localStateUnchanged = true;

    if (resolved.goal) {
      if (!sameEntity(localState.goal, resolved.goal)) {
        const applied = await putLocalIfUnchanged(
          localDatabase,
          localDatabase.goals,
          id,
          localState.goal,
          resolved.goal,
        );
        if (applied) downloadedGoals += 1;
        else localStateUnchanged = false;
      }
    } else {
      if (localState.goal) {
        const applied = await deleteLocalIfUnchanged(
          localDatabase,
          localDatabase.goals,
          id,
          localState.goal,
        );
        if (applied) removedLocalGoals += 1;
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

    if (resolved.goal) {
      if (
        await upsertLogicalCloudValue(
          cloudDatabase.realGoals as Table<Goal, string>,
          cloudState.goal,
          cloudGoalRowById.get(id),
          resolved.goal,
          resolution.stamp,
          (value) => toCloudGoal(value) as Goal,
        )
      ) {
        uploadedGoals += 1;
      }
    } else if (cloudState.goal) {
      await cloudDatabase.realGoals.delete(cloudPrivateId(id));
      removedCloudGoals += 1;
    }

    if (
      resolved.marker
      && await upsertLogicalCloudValue(
        cloudDatabase.realGoalDeletionRecords as Table<
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
    uploadedGoals,
    downloadedGoals,
    removedLocalGoals,
    removedCloudGoals,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}
