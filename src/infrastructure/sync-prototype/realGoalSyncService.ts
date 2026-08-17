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
  readDatabaseLogicalSyncChangeOrigin,
  resolveDatabaseLogicalSyncState,
  resolveLogicalSyncState,
  resolveSyncActorId,
  stripLogicalSyncFields,
  upsertLogicalCloudValue,
  type LogicalSyncBaseline,
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
  readonly changeOrigin?: 'local' | 'cloud' | 'both' | 'unknown';
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

interface GoalDomainState {
  readonly localGoals: readonly Goal[];
  readonly localMarkers: readonly DeletionRecord[];
  readonly cloudGoals: readonly Goal[];
  readonly cloudMarkers: readonly DeletionRecord[];
  readonly cloudGoalRows: readonly CloudOwned<CloudGoal>[];
  readonly cloudMarkerRows: readonly CloudOwned<CloudDeletionRecord>[];
}

interface GoalLogicalState {
  readonly goals: readonly Goal[];
  readonly markers: readonly DeletionRecord[];
}

interface RealGoalSyncExecutionOptions extends CloudSyncExecutionOptions {
  readonly requireChangeOrigin?: 'cloud' | 'local';
  readonly persistDomainBaseline?: boolean;
  readonly requireCloudStateMatch?: boolean;
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

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

async function readLocalState(localDatabase: AppDatabase) {
  const [localGoals, localMarkers] = await Promise.all([
    localDatabase.goals.toArray(),
    localDatabase.deletionRecords
      .where('entityType')
      .equals('goal')
      .toArray(),
  ]);
  return { localGoals, localMarkers };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<GoalDomainState> {
  const [local, cloudGoalRows, cloudMarkerRows] = await Promise.all([
    readLocalState(localDatabase),
    cloudDatabase.realGoals.toArray(),
    cloudDatabase.realGoalDeletionRecords.toArray(),
  ]);

  const ownedCloudGoalRows = cloudGoalRows
    .filter((goal) => belongsToCurrentUser(goal, currentUserId));
  const ownedCloudMarkerRows = cloudMarkerRows
    .filter(
      (marker) =>
        marker.entityType === 'goal' &&
        belongsToCurrentUser(marker, currentUserId),
    );
  const cloudGoals = ownedCloudGoalRows
    .map(fromCloudGoal)
    .filter((goal): goal is Goal => goal !== undefined);
  const cloudMarkers = ownedCloudMarkerRows
    .map(fromCloudMarker)
    .filter((marker): marker is DeletionRecord => marker !== undefined);

  return {
    ...local,
    cloudGoals,
    cloudMarkers,
    cloudGoalRows: ownedCloudGoalRows,
    cloudMarkerRows: ownedCloudMarkerRows,
  };
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

function resolveGoalLogicalState(
  localGoals: readonly Goal[],
  localMarkers: readonly DeletionRecord[],
  cloudGoals: readonly Goal[],
  cloudMarkers: readonly DeletionRecord[],
): GoalLogicalState {
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
  const goals: Goal[] = [];
  const markers: DeletionRecord[] = [];

  for (const id of ids) {
    const markerId = deletionRecordId('goal', id);
    const resolved = resolveState(
      {
        ...(localGoalById.get(id) ? { goal: localGoalById.get(id)! } : {}),
        ...(localMarkerById.get(markerId)
          ? { marker: localMarkerById.get(markerId)! }
          : {}),
      },
      {
        ...(cloudGoalById.get(id) ? { goal: cloudGoalById.get(id)! } : {}),
        ...(cloudMarkerById.get(markerId)
          ? { marker: cloudMarkerById.get(markerId)! }
          : {}),
      },
    );
    if (resolved.goal) goals.push(resolved.goal);
    if (resolved.marker) markers.push(resolved.marker);
  }

  return { goals: sortById(goals), markers: sortById(markers) };
}

function buildGoalLogicalStates(state: GoalDomainState) {
  return {
    local: resolveGoalLogicalState(
      state.localGoals,
      state.localMarkers,
      [],
      [],
    ),
    cloud: resolveGoalLogicalState(
      [],
      [],
      state.cloudGoals,
      state.cloudMarkers,
    ),
  };
}

function maximumGoalCloudStamp(state: GoalDomainState) {
  return maximumLogicalSyncStamp([
    ...state.cloudGoalRows,
    ...state.cloudMarkerRows,
  ]);
}

async function bootstrapEqualGoalBaseline(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
  logical: ReturnType<typeof buildGoalLogicalStates>,
): Promise<void> {
  if (!sameEntity(logical.local, logical.cloud)) return;
  const actorId = await resolveSyncActorId(localDatabase);
  const resolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'goals',
    entityId: 'goals',
    actorId,
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumGoalCloudStamp(state),
    legacyResolve: () => logical.local,
  });
  if (resolution.source !== 'legacy') return;
  await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
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

function emptyResult(preview: RealGoalSyncPreview): RealGoalSyncResult {
  return {
    ...preview,
    uploadedGoals: 0,
    downloadedGoals: 0,
    removedLocalGoals: 0,
    removedCloudGoals: 0,
    uploadedDeletionRecords: 0,
    downloadedDeletionRecords: 0,
    completedAt: new Date().toISOString(),
  };
}

function directionalEntityResolutions(
  currentUserId: string,
  actorId: string,
  state: GoalDomainState,
  final: GoalLogicalState,
): {
  readonly stamps: ReadonlyMap<string, ReturnType<typeof maximumLogicalSyncStamp>>;
  readonly baselines: readonly LogicalSyncBaseline[];
} {
  const localGoalById = mapById(state.localGoals);
  const cloudGoalById = mapById(state.cloudGoals);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const finalGoalById = mapById(final.goals);
  const finalMarkerById = mapById(final.markers);
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
  const ids = new Set([
    ...localGoalById.keys(),
    ...cloudGoalById.keys(),
    ...state.localMarkers.map((marker) => marker.entityId),
    ...state.cloudMarkers.map((marker) => marker.entityId),
    ...finalGoalById.keys(),
    ...final.markers.map((marker) => marker.entityId),
  ]);
  const stamps = new Map<string, ReturnType<typeof maximumLogicalSyncStamp>>();
  const baselines: LogicalSyncBaseline[] = [];

  for (const id of ids) {
    const markerId = deletionRecordId('goal', id);
    const localState: GoalState = {
      ...(localGoalById.get(id) ? { goal: localGoalById.get(id)! } : {}),
      ...(localMarkerById.get(markerId)
        ? { marker: localMarkerById.get(markerId)! }
        : {}),
    };
    const cloudState: GoalState = {
      ...(cloudGoalById.get(id) ? { goal: cloudGoalById.get(id)! } : {}),
      ...(cloudMarkerById.get(markerId)
        ? { marker: cloudMarkerById.get(markerId)! }
        : {}),
    };
    const finalState: GoalState = {
      ...(finalGoalById.get(id) ? { goal: finalGoalById.get(id)! } : {}),
      ...(finalMarkerById.get(markerId)
        ? { marker: finalMarkerById.get(markerId)! }
        : {}),
    };
    const cloudStamp = maximumLogicalSyncStamp([
      cloudGoalRowById.get(id),
      cloudMarkerRowByEntityId.get(id),
    ]);
    const resolution = resolveLogicalSyncState({
      accountUserId: currentUserId,
      domainId: 'goals',
      entityId: id,
      actorId,
      localValue: localState,
      cloudValue: cloudState,
      cloudStamp,
      legacyResolve: () => finalState,
    });
    stamps.set(id, resolution.stamp);
    baselines.push(resolution.baseline);
  }

  return { stamps, baselines };
}

async function synchronizeRealGoalsDirectional(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
  preview: RealGoalSyncPreview,
  options: RealGoalSyncExecutionOptions,
): Promise<RealGoalSyncResult> {
  const requiredOrigin = options.requireChangeOrigin;
  if (!requiredOrigin) return emptyResult(preview);

  const logical = buildGoalLogicalStates(state);
  const changeOrigin = await readDatabaseLogicalSyncChangeOrigin({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'goals',
    entityId: 'goals',
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumGoalCloudStamp(state),
  });
  if (changeOrigin !== requiredOrigin) return emptyResult(preview);

  const actorId = await resolveSyncActorId(localDatabase);
  const domainResolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'goals',
    entityId: 'goals',
    actorId,
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumGoalCloudStamp(state),
    legacyResolve: (localValue, cloudValue) =>
      resolveGoalLogicalState(
        localValue.goals,
        localValue.markers,
        cloudValue.goals,
        cloudValue.markers,
      ),
  });
  const final = requiredOrigin === 'cloud' ? logical.cloud : logical.local;
  if (!sameEntity(domainResolution.value, final)) return emptyResult(preview);

  const localGoalById = mapById(state.localGoals);
  const cloudGoalById = mapById(state.cloudGoals);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const countChanged = <T extends { id: string }>(
    current: ReadonlyMap<string, T>,
    target: readonly T[],
  ) => target.filter((value) => !sameEntity(current.get(value.id), value)).length;
  const countRemoved = <T extends { id: string }>(
    current: ReadonlyMap<string, T>,
    target: readonly T[],
  ) => {
    const targetIds = new Set(target.map((value) => value.id));
    return [...current.keys()].filter((id) => !targetIds.has(id)).length;
  };

  const downloadedGoals = countChanged(localGoalById, final.goals);
  const removedLocalGoals = countRemoved(localGoalById, final.goals);
  const downloadedDeletionRecords = countChanged(localMarkerById, final.markers);
  const uploadedGoals = options.writeCloud !== false
    ? countChanged(cloudGoalById, final.goals)
    : 0;
  const removedCloudGoals = options.writeCloud !== false
    ? countRemoved(cloudGoalById, final.goals)
    : 0;
  const uploadedDeletionRecords = options.writeCloud !== false
    ? countChanged(cloudMarkerById, final.markers)
    : 0;

  const entityResolutions = directionalEntityResolutions(
    currentUserId,
    actorId,
    state,
    final,
  );

  let localStateApplied = false;
  await localDatabase.transaction(
    'rw',
    [localDatabase.goals, localDatabase.deletionRecords],
    async () => {
      const current = await readLocalState(localDatabase);
      if (
        !sameEntity(sortById(current.localGoals), sortById(state.localGoals)) ||
        !sameEntity(sortById(current.localMarkers), sortById(state.localMarkers))
      ) {
        return;
      }

      const finalGoalIds = new Set(final.goals.map((goal) => goal.id));
      const finalMarkerIds = new Set(final.markers.map((marker) => marker.id));
      await localDatabase.goals.bulkDelete(
        state.localGoals
          .filter((goal) => !finalGoalIds.has(goal.id))
          .map((goal) => goal.id),
      );
      await localDatabase.deletionRecords.bulkDelete(
        state.localMarkers
          .filter((marker) => !finalMarkerIds.has(marker.id))
          .map((marker) => marker.id),
      );
      if (final.goals.length > 0) await localDatabase.goals.bulkPut([...final.goals]);
      if (final.markers.length > 0) {
        await localDatabase.deletionRecords.bulkPut([...final.markers]);
      }
      localStateApplied = true;
    },
  );

  let cloudStateApplied = false;
  if (options.writeCloud !== false && localStateApplied) {
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

    await cloudDatabase.transaction(
      'rw',
      [cloudDatabase.realGoals, cloudDatabase.realGoalDeletionRecords],
      async () => {
        if (options.requireCloudStateMatch === true) {
          const [currentGoalRows, currentMarkerRows] = await Promise.all([
            cloudDatabase.realGoals.toArray(),
            cloudDatabase.realGoalDeletionRecords.toArray(),
          ]);
          const currentOwnedGoals = currentGoalRows
            .filter((goal) => belongsToCurrentUser(goal, currentUserId));
          const currentOwnedMarkers = currentMarkerRows
            .filter(
              (marker) =>
                marker.entityType === 'goal' &&
                belongsToCurrentUser(marker, currentUserId),
            );
          if (
            !sameCloudOwnedCollection(currentOwnedGoals, state.cloudGoalRows) ||
            !sameCloudOwnedCollection(currentOwnedMarkers, state.cloudMarkerRows)
          ) {
            return;
          }
        }

        cloudStateApplied = true;
        const finalGoalIds = new Set(final.goals.map((goal) => goal.id));
        const finalMarkerIds = new Set(final.markers.map((marker) => marker.id));
        for (const value of state.cloudGoals) {
          if (!finalGoalIds.has(value.id)) {
            await cloudDatabase.realGoals.delete(cloudPrivateId(value.id));
          }
        }
        for (const value of state.cloudMarkers) {
          if (!finalMarkerIds.has(value.id)) {
            await cloudDatabase.realGoalDeletionRecords.delete(cloudPrivateId(value.id));
          }
        }
        for (const value of final.goals) {
          await upsertLogicalCloudValue(
            cloudDatabase.realGoals as Table<Goal, string>,
            cloudGoalById.get(value.id),
            cloudGoalRowById.get(value.id),
            value,
            entityResolutions.stamps.get(value.id) ?? domainResolution.stamp,
            (target) => toCloudGoal(target) as Goal,
          );
        }
        for (const value of final.markers) {
          await upsertLogicalCloudValue(
            cloudDatabase.realGoalDeletionRecords as Table<DeletionRecord, string>,
            cloudMarkerById.get(value.id),
            cloudMarkerRowByEntityId.get(value.entityId),
            value,
            entityResolutions.stamps.get(value.entityId) ?? domainResolution.stamp,
            (target) => toCloudMarker(target) as DeletionRecord,
          );
        }
      },
    );
  }

  const converged = localStateApplied && (
    (options.writeCloud !== false && cloudStateApplied) ||
    (options.writeCloud === false && options.persistDomainBaseline === true)
  );
  if (converged) {
    await Promise.all([
      ...entityResolutions.baselines.map((baseline) =>
        persistLogicalSyncBaseline(cloudDatabase, baseline)),
      persistLogicalSyncBaseline(cloudDatabase, domainResolution.baseline),
    ]);
  }

  return {
    ...preview,
    uploadedGoals: cloudStateApplied ? uploadedGoals : 0,
    downloadedGoals: localStateApplied ? downloadedGoals : 0,
    removedLocalGoals: localStateApplied ? removedLocalGoals : 0,
    removedCloudGoals: cloudStateApplied ? removedCloudGoals : 0,
    uploadedDeletionRecords: cloudStateApplied ? uploadedDeletionRecords : 0,
    downloadedDeletionRecords: localStateApplied ? downloadedDeletionRecords : 0,
    completedAt: new Date().toISOString(),
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
  const preview = buildPreview(
    state.localGoals,
    state.localMarkers,
    state.cloudGoals,
    state.cloudMarkers,
  );
  const logical = buildGoalLogicalStates(state);
  if (preview.differingEntityCount <= 0) {
    await bootstrapEqualGoalBaseline(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      logical,
    );
    return preview;
  }
  const changeOrigin = await readDatabaseLogicalSyncChangeOrigin({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'goals',
    entityId: 'goals',
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumGoalCloudStamp(state),
  });
  return {
    ...preview,
    changeOrigin: changeOrigin === 'equal' ? 'unknown' : changeOrigin,
  };
}

export async function synchronizeRealGoals(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: RealGoalSyncExecutionOptions = {},
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

  if (options.requireChangeOrigin) {
    return synchronizeRealGoalsDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      options,
    );
  }

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
    } else if (localState.goal) {
      const applied = await deleteLocalIfUnchanged(
        localDatabase,
        localDatabase.goals,
        id,
        localState.goal,
      );
      if (applied) removedLocalGoals += 1;
      else localStateUnchanged = false;
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
      resolved.marker &&
      await upsertLogicalCloudValue(
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

export async function synchronizeRealGoalsFromCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  return synchronizeRealGoals(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: false,
    requireChangeOrigin: 'cloud',
    persistDomainBaseline: true,
  });
}

export async function synchronizeRealGoalsToCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  return synchronizeRealGoals(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: true,
    requireChangeOrigin: 'local',
    requireCloudStateMatch: true,
  });
}
