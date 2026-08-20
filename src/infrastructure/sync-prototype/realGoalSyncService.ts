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
  belongsToCurrentUser,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stableValue,
  stripCloudFields,
  type CloudOwned,
  type CloudSyncExecutionOptions,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import {
  logicalSyncBaselineId,
  logicalSyncBaselineTable,
  maximumLogicalSyncStamp,
  nextLogicalSyncStamp,
  persistLogicalSyncBaseline,
  readDatabaseLogicalSyncChangeOrigin,
  resolveDatabaseLogicalSyncState,
  resolveSyncActorId,
  stripLogicalSyncFields,
  upsertLogicalCloudValue,
  withLogicalSyncStamp,
  type LogicalSyncFields,
  type LogicalSyncStamp,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import { reloadUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

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

export type GoalInitialReconciliationChoice = 'keep-local' | 'use-cloud';
export type GoalReconciliationSideStatus =
  | 'present'
  | 'modified'
  | 'deleted'
  | 'absent';

export interface GoalReconciliationItem {
  readonly id: string;
  readonly title: string;
  readonly localStatus: GoalReconciliationSideStatus;
  readonly cloudStatus: GoalReconciliationSideStatus;
  readonly keepLocalConsequence: string;
  readonly useCloudConsequence: string;
}

export interface PreparedRealGoalReconciliation {
  readonly accountUserId: string;
  readonly preview: RealGoalSyncPreview & { readonly changeOrigin: 'unknown' };
  readonly localDigest: string;
  readonly cloudDigest: string;
  readonly cloudStamp: LogicalSyncStamp;
  readonly items: readonly GoalReconciliationItem[];
  readonly preparedAt: string;
}

interface GoalState {
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
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

export interface RegisteredGoalSyncContext {
  readonly localDatabase: AppDatabase;
  readonly cloudDatabase: SyncPrototypeDatabase;
}

const registeredGoalSyncContexts = new Map<string, RegisteredGoalSyncContext>();

interface RealGoalSyncExecutionOptions extends CloudSyncExecutionOptions {
  readonly requireChangeOrigin?: 'cloud' | 'local';
}

function toCloudGoal(goal: Goal): CloudGoal {
  return { ...goal, id: cloudPrivateId(goal.id) };
}

function fromCloudGoal(goal: CloudOwned<CloudGoal>): Goal | undefined {
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

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function effectiveGoalState(
  goal: Goal | undefined,
  marker: DeletionRecord | undefined,
): GoalState {
  let effectiveMarker = marker;
  if (
    goal &&
    effectiveMarker?.status === 'deleted' &&
    goal.updatedAt > effectiveMarker.updatedAt
  ) {
    effectiveMarker = createRestoredDeletionRecord(
      { entityType: 'goal', entityId: goal.id },
      goal.updatedAt,
      effectiveMarker.deletedAt,
      effectiveMarker,
    );
  }

  const deletionWins =
    effectiveMarker?.status === 'deleted' &&
    (!goal || effectiveMarker.updatedAt >= goal.updatedAt);

  return {
    ...(deletionWins ? {} : goal ? { goal } : {}),
    ...(effectiveMarker ? { marker: effectiveMarker } : {}),
  };
}

function resolveSingleSideLogicalState(
  goals: readonly Goal[],
  markers: readonly DeletionRecord[],
): GoalLogicalState {
  const goalById = mapById(goals);
  const markerById = mapById(markers);
  const ids = new Set([
    ...goalById.keys(),
    ...markers.map((marker) => marker.entityId),
  ]);
  const effectiveGoals: Goal[] = [];
  const effectiveMarkers: DeletionRecord[] = [];

  for (const id of ids) {
    const resolved = effectiveGoalState(
      goalById.get(id),
      markerById.get(deletionRecordId('goal', id)),
    );
    if (resolved.goal) effectiveGoals.push(resolved.goal);
    if (resolved.marker) effectiveMarkers.push(resolved.marker);
  }

  return {
    goals: sortById(effectiveGoals),
    markers: sortById(effectiveMarkers),
  };
}

function buildGoalLogicalStates(state: GoalDomainState) {
  return {
    local: resolveSingleSideLogicalState(state.localGoals, state.localMarkers),
    cloud: resolveSingleSideLogicalState(state.cloudGoals, state.cloudMarkers),
  };
}

function goalStateMutationTimestamp(state: GoalState): string {
  return [
    state.goal?.updatedAt,
    state.marker?.updatedAt,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? '';
}

function isEmptyGoalState(state: GoalState): boolean {
  return !state.goal && !state.marker;
}

function latestGoalState(
  local: GoalState,
  cloud: GoalState,
): {
  readonly winner: GoalState;
  readonly loser: GoalState;
} {
  if (isEmptyGoalState(local)) {
    return { winner: cloud, loser: local };
  }
  if (isEmptyGoalState(cloud)) {
    return { winner: local, loser: cloud };
  }

  const localTimestamp = goalStateMutationTimestamp(local);
  const cloudTimestamp = goalStateMutationTimestamp(cloud);

  if (localTimestamp > cloudTimestamp) {
    return { winner: local, loser: cloud };
  }
  if (cloudTimestamp > localTimestamp) {
    return { winner: cloud, loser: local };
  }

  /*
   * L'égalité d'horodatage doit être indépendante de l'ordre réseau.
   */
  return stableValue(local) >= stableValue(cloud)
    ? { winner: local, loser: cloud }
    : { winner: cloud, loser: local };
}

function preserveRestorationMarker(
  winner: GoalState,
  loser: GoalState,
): GoalState {
  if (!winner.goal || loser.marker?.status !== 'deleted') {
    return winner;
  }

  const restoredAt =
    goalStateMutationTimestamp(winner) || winner.goal.updatedAt;

  if (restoredAt < loser.marker.updatedAt) {
    return winner;
  }

  if (
    winner.marker?.status === 'restored'
    && winner.marker.updatedAt >= restoredAt
  ) {
    return winner;
  }

  return {
    goal: winner.goal,
    marker: createRestoredDeletionRecord(
      {
        entityType: 'goal',
        entityId: winner.goal.id,
      },
      restoredAt,
      loser.marker.deletedAt,
      winner.marker ?? loser.marker,
    ),
  };
}

function resolveMergedGoalLogicalState(
  state: GoalDomainState,
): GoalLogicalState {
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

  const goals: Goal[] = [];
  const markers: DeletionRecord[] = [];

  for (const id of [...ids].sort((left, right) => left.localeCompare(right))) {
    const markerId = deletionRecordId('goal', id);

    const local = effectiveGoalState(
      localGoalById.get(id),
      localMarkerById.get(markerId),
    );
    const cloud = effectiveGoalState(
      cloudGoalById.get(id),
      cloudMarkerById.get(markerId),
    );

    const { winner, loser } = latestGoalState(local, cloud);
    const resolved = preserveRestorationMarker(winner, loser);

    if (resolved.goal) goals.push(resolved.goal);
    if (resolved.marker) markers.push(resolved.marker);
  }

  return {
    goals: sortById(goals),
    markers: sortById(markers),
  };
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

  return {
    ...local,
    cloudGoals: ownedCloudGoalRows
      .map(fromCloudGoal)
      .filter((goal): goal is Goal => goal !== undefined),
    cloudMarkers: ownedCloudMarkerRows
      .map(fromCloudMarker)
      .filter((marker): marker is DeletionRecord => marker !== undefined),
    cloudGoalRows: ownedCloudGoalRows,
    cloudMarkerRows: ownedCloudMarkerRows,
  };
}

function buildPreview(state: GoalDomainState): RealGoalSyncPreview {
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
    localGoalCount: state.localGoals.length,
    cloudGoalCount: state.cloudGoals.length,
    localDeletionCount: state.localMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    cloudDeletionCount: state.cloudMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    differingEntityCount,
  };
}

function maximumGoalCloudStamp(state: GoalDomainState): LogicalSyncStamp {
  return maximumLogicalSyncStamp([
    ...state.cloudGoalRows,
    ...state.cloudMarkerRows,
  ]);
}

function localDigest(state: GoalDomainState): string {
  return stableValue({
    goals: sortById(state.localGoals),
    markers: sortById(state.localMarkers),
  });
}

function cloudDigest(state: GoalDomainState): string {
  return stableValue({
    goals: sortById(state.cloudGoals),
    markers: sortById(state.cloudMarkers),
  });
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

function sameCloudOwnedCollection<T extends { id: string }>(
  current: readonly CloudOwned<T>[],
  expected: readonly CloudOwned<T>[],
): boolean {
  const normalize = (values: readonly CloudOwned<T>[]) => values
    .map((value) => stripCloudFields(value))
    .sort((left, right) => left.id.localeCompare(right.id));
  return sameEntity(normalize(current), normalize(expected));
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
  preview: RealGoalSyncPreview,
  state: GoalDomainState,
  target: GoalLogicalState,
  direction: 'local-to-cloud' | 'cloud-to-local',
): RealGoalSyncResult {
  return {
    ...preview,
    uploadedGoals:
      direction === 'local-to-cloud'
        ? countChanged(state.cloudGoals, target.goals)
        : 0,
    downloadedGoals:
      direction === 'cloud-to-local'
        ? countChanged(state.localGoals, target.goals)
        : 0,
    removedLocalGoals:
      direction === 'cloud-to-local'
        ? countRemoved(state.localGoals, target.goals)
        : 0,
    removedCloudGoals:
      direction === 'local-to-cloud'
        ? countRemoved(state.cloudGoals, target.goals)
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

function resultForMergedTarget(
  preview: RealGoalSyncPreview,
  state: GoalDomainState,
  target: GoalLogicalState,
): RealGoalSyncResult {
  return {
    ...preview,
    uploadedGoals: countChanged(state.cloudGoals, target.goals),
    downloadedGoals: countChanged(state.localGoals, target.goals),
    removedLocalGoals: countRemoved(state.localGoals, target.goals),
    removedCloudGoals: countRemoved(state.cloudGoals, target.goals),
    uploadedDeletionRecords: countChanged(
      state.cloudMarkers,
      target.markers,
    ),
    downloadedDeletionRecords: countChanged(
      state.localMarkers,
      target.markers,
    ),
    completedAt: new Date().toISOString(),
  };
}

async function persistEqualGoalBaseline(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
): Promise<void> {
  const logical = buildGoalLogicalStates(state);
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
  await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
}

async function readOrigin(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
) {
  const logical = buildGoalLogicalStates(state);
  return readDatabaseLogicalSyncChangeOrigin({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'goals',
    entityId: 'goals',
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumGoalCloudStamp(state),
  });
}

async function ensureDomainBaselineMissing(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<void> {
  const table = logicalSyncBaselineTable(cloudDatabase);
  if (!table) {
    throw new Error(
      'La référence de synchronisation Goals est indisponible. Aucune réconciliation n’a été appliquée.',
    );
  }
  const baseline = await table.get(
    logicalSyncBaselineId(currentUserId, 'goals', 'goals'),
  );
  if (baseline) {
    throw new Error(
      'Une référence Goals existe déjà. Relance l’analyse avant toute autre action.',
    );
  }
}

async function applyLocalTargetIfUnchanged(
  localDatabase: AppDatabase,
  expected: GoalDomainState,
  target: GoalLogicalState,
): Promise<boolean> {
  let applied = false;
  await localDatabase.transaction(
    'rw',
    [localDatabase.goals, localDatabase.deletionRecords],
    async () => {
      const current = await readLocalState(localDatabase);
      if (
        !sameEntity(sortById(current.localGoals), sortById(expected.localGoals)) ||
        !sameEntity(sortById(current.localMarkers), sortById(expected.localMarkers))
      ) {
        return;
      }

      const targetGoalIds = new Set(target.goals.map((goal) => goal.id));
      const targetMarkerIds = new Set(target.markers.map((marker) => marker.id));
      await localDatabase.goals.bulkDelete(
        expected.localGoals
          .filter((goal) => !targetGoalIds.has(goal.id))
          .map((goal) => goal.id),
      );
      await localDatabase.deletionRecords.bulkDelete(
        expected.localMarkers
          .filter((marker) => !targetMarkerIds.has(marker.id))
          .map((marker) => marker.id),
      );
      if (target.goals.length > 0) {
        await localDatabase.goals.bulkPut([...target.goals]);
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
  expected: GoalDomainState,
  target: GoalLogicalState,
  stamp: LogicalSyncStamp,
): Promise<boolean> {
  const currentGoalById = mapById(expected.cloudGoals);
  const currentMarkerById = mapById(expected.cloudMarkers);
  const cloudGoalRowById = new Map(
    expected.cloudGoalRows.flatMap((row) => {
      const id = localIdFromCloud(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const cloudMarkerRowByEntityId = new Map(
    expected.cloudMarkerRows.flatMap((row) => {
      const marker = fromCloudMarker(row);
      return marker ? [[marker.entityId, row] as const] : [];
    }),
  );

  let applied = false;
  await cloudDatabase.transaction(
    'rw',
    [cloudDatabase.realGoals, cloudDatabase.realGoalDeletionRecords],
    async () => {
      const [goalRows, markerRows] = await Promise.all([
        cloudDatabase.realGoals.toArray(),
        cloudDatabase.realGoalDeletionRecords.toArray(),
      ]);
      const currentOwnedGoals = goalRows
        .filter((goal) => belongsToCurrentUser(goal, currentUserId));
      const currentOwnedMarkers = markerRows
        .filter(
          (marker) =>
            marker.entityType === 'goal' &&
            belongsToCurrentUser(marker, currentUserId),
        );
      if (
        !sameCloudOwnedCollection(currentOwnedGoals, expected.cloudGoalRows) ||
        !sameCloudOwnedCollection(currentOwnedMarkers, expected.cloudMarkerRows)
      ) {
        return;
      }

      const targetGoalIds = new Set(target.goals.map((goal) => goal.id));
      const targetMarkerIds = new Set(target.markers.map((marker) => marker.id));
      for (const value of expected.cloudGoals) {
        if (!targetGoalIds.has(value.id)) {
          await cloudDatabase.realGoals.delete(cloudPrivateId(value.id));
        }
      }
      for (const value of expected.cloudMarkers) {
        if (!targetMarkerIds.has(value.id)) {
          await cloudDatabase.realGoalDeletionRecords.delete(cloudPrivateId(value.id));
        }
      }
      for (const value of target.goals) {
        await upsertLogicalCloudValue(
          cloudDatabase.realGoals as Table<Goal, string>,
          currentGoalById.get(value.id),
          cloudGoalRowById.get(value.id),
          value,
          stamp,
          (candidate) => toCloudGoal(candidate) as Goal,
        );
      }
      for (const value of target.markers) {
        await upsertLogicalCloudValue(
          cloudDatabase.realGoalDeletionRecords as Table<DeletionRecord, string>,
          currentMarkerById.get(value.id),
          cloudMarkerRowByEntityId.get(value.entityId),
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

async function restoreRealGoalsFromCloudIntoEmptyLocal(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
  preview: RealGoalSyncPreview,
): Promise<RealGoalSyncResult> {
  if (state.localGoals.length > 0 || state.localMarkers.length > 0) {
    const origin = await readOrigin(cloudDatabase, currentUserId, state);
    return emptyResult({
      ...preview,
      changeOrigin: origin === 'equal' ? 'unknown' : origin,
    });
  }

  const logical = buildGoalLogicalStates(state);
  if (logical.cloud.goals.length === 0 && logical.cloud.markers.length === 0) {
    return emptyResult(preview);
  }

  const [goalRows, markerRows] = await Promise.all([
    cloudDatabase.realGoals.toArray(),
    cloudDatabase.realGoalDeletionRecords.toArray(),
  ]);
  const currentOwnedGoals = goalRows
    .filter((goal) => belongsToCurrentUser(goal, currentUserId));
  const currentOwnedMarkers = markerRows
    .filter(
      (marker) =>
        marker.entityType === 'goal' &&
        belongsToCurrentUser(marker, currentUserId),
    );
  if (
    !sameCloudOwnedCollection(currentOwnedGoals, state.cloudGoalRows) ||
    !sameCloudOwnedCollection(currentOwnedMarkers, state.cloudMarkerRows)
  ) {
    return emptyResult(preview);
  }

  const result = resultForTarget(
    preview,
    state,
    logical.cloud,
    'cloud-to-local',
  );
  const applied = await applyLocalTargetIfUnchanged(
    localDatabase,
    state,
    logical.cloud,
  );
  return applied ? result : emptyResult(preview);
}

async function synchronizeRealGoalsDirectional(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
  preview: RealGoalSyncPreview,
  requiredOrigin: 'local' | 'cloud',
): Promise<RealGoalSyncResult> {
  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (origin !== requiredOrigin) {
    return emptyResult({ ...preview, changeOrigin: origin === 'equal' ? 'unknown' : origin });
  }

  const logical = buildGoalLogicalStates(state);
  const target = requiredOrigin === 'local' ? logical.local : logical.cloud;
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
    if (
      !sameEntity(sortById(currentLocal.localGoals), sortById(state.localGoals)) ||
      !sameEntity(sortById(currentLocal.localMarkers), sortById(state.localMarkers))
    ) {
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
      return emptyResult({ ...preview, changeOrigin: 'both' });
    }
    const applied = await applyLocalTargetIfUnchanged(localDatabase, state, target);
    if (!applied) return emptyResult({ ...preview, changeOrigin: 'both' });
    await reloadUserStateRuntime(localDatabase);
  }

  const converged = await readState(localDatabase, cloudDatabase, currentUserId);
  const convergedLogical = buildGoalLogicalStates(converged);
  if (!sameEntity(convergedLogical.local, convergedLogical.cloud)) {
    return emptyResult({ ...preview, changeOrigin: 'both' });
  }
  await persistEqualGoalBaseline(
    localDatabase,
    cloudDatabase,
    currentUserId,
    converged,
  );
  return result;
}

async function synchronizeRealGoalsMerged(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
  preview: RealGoalSyncPreview,
  origin: 'both' | 'unknown',
): Promise<RealGoalSyncResult> {
  const logical = buildGoalLogicalStates(state);
  const target = resolveMergedGoalLogicalState(state);
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
    legacyResolve: () => target,
    concurrentResolve: () => target,
  });

  const contextualPreview = {
    ...preview,
    changeOrigin: origin,
  } as const;

  if (!sameEntity(resolution.value, target)) {
    return emptyResult(contextualPreview);
  }

  /*
   * Revalidation locale juste avant l'écriture cloud.
   * Si l'utilisateur vient de refaire une mutation, on n'écrase rien.
   */
  const currentLocal = await readLocalState(localDatabase);
  if (
    !sameEntity(
      sortById(currentLocal.localGoals),
      sortById(state.localGoals),
    )
    || !sameEntity(
      sortById(currentLocal.localMarkers),
      sortById(state.localMarkers),
    )
  ) {
    return emptyResult({
      ...contextualPreview,
      changeOrigin: 'both',
    });
  }

  const result = resultForMergedTarget(
    contextualPreview,
    state,
    target,
  );

  /*
   * Cloud d'abord : si le cloud a changé depuis l'analyse, le CAS échoue
   * et le local reste intact.
   */
  const cloudApplied = await applyCloudTargetIfUnchanged(
    cloudDatabase,
    currentUserId,
    state,
    target,
    resolution.stamp,
  );

  if (!cloudApplied) {
    return emptyResult({
      ...contextualPreview,
      changeOrigin: 'both',
    });
  }

  /*
   * Puis local avec CAS. Si une nouvelle mutation locale est intervenue
   * entre-temps, elle reste intacte et la prochaine analyse la verra.
   */
  const localApplied = await applyLocalTargetIfUnchanged(
    localDatabase,
    state,
    target,
  );

  if (!localApplied) {
    return {
      ...result,
      changeOrigin: 'both',
    };
  }

  await reloadUserStateRuntime(localDatabase);

  const converged = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  const convergedLogical = buildGoalLogicalStates(converged);

  if (!sameEntity(convergedLogical.local, convergedLogical.cloud)) {
    return {
      ...result,
      changeOrigin: 'both',
    };
  }

  /*
   * La baseline n'est persistée qu'après convergence observée.
   */
  await persistLogicalSyncBaseline(
    cloudDatabase,
    resolution.baseline,
  );

  return result;
}

function sideStatus(
  own: GoalState,
  other: GoalState,
): GoalReconciliationSideStatus {
  if (own.marker?.status === 'deleted' && !own.goal) return 'deleted';
  if (!own.goal) return 'absent';
  if (other.goal && !sameEntity(own.goal, other.goal)) return 'modified';
  return 'present';
}

function keepLocalConsequence(local: GoalState, cloud: GoalState): string {
  if (!local.goal) {
    return cloud.goal
      ? 'L’objectif sera retiré du cloud.'
      : 'La suppression de cet appareil sera conservée dans le cloud.';
  }
  if (!cloud.goal) return 'L’objectif de cet appareil sera ajouté au cloud.';
  if (!sameEntity(local.goal, cloud.goal)) {
    return 'La version de cet appareil remplacera la version cloud.';
  }
  return 'La version de cet appareil sera conservée.';
}

function cloudChoiceConsequence(local: GoalState, cloud: GoalState): string {
  if (!cloud.goal) {
    return local.goal
      ? 'L’objectif sera retiré de cet appareil.'
      : 'La suppression du cloud sera conservée sur cet appareil.';
  }
  if (!local.goal) return 'L’objectif du cloud sera ajouté sur cet appareil.';
  if (!sameEntity(local.goal, cloud.goal)) {
    return 'La version cloud remplacera la version de cet appareil.';
  }
  return 'La version cloud sera conservée.';
}

function buildReconciliationItems(state: GoalDomainState): GoalReconciliationItem[] {
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

  const items: GoalReconciliationItem[] = [];
  for (const id of [...ids].sort((left, right) => left.localeCompare(right))) {
    const markerId = deletionRecordId('goal', id);
    const local = effectiveGoalState(
      localGoalById.get(id),
      localMarkerById.get(markerId),
    );
    const cloud = effectiveGoalState(
      cloudGoalById.get(id),
      cloudMarkerById.get(markerId),
    );
    if (sameEntity(local, cloud)) continue;
    items.push({
      id,
      title: local.goal?.title ?? cloud.goal?.title ?? `Objectif ${id}`,
      localStatus: sideStatus(local, cloud),
      cloudStatus: sideStatus(cloud, local),
      keepLocalConsequence: keepLocalConsequence(local, cloud),
      useCloudConsequence: cloudChoiceConsequence(local, cloud),
    });
  }
  return items;
}

export async function previewRealGoalSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealGoalSyncPreview> {
  registeredGoalSyncContexts.set(currentUserId, { localDatabase, cloudDatabase });
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  if (preview.differingEntityCount <= 0) {
    await persistEqualGoalBaseline(
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

export async function synchronizeRealGoals(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: RealGoalSyncExecutionOptions = {},
): Promise<RealGoalSyncResult> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  const writeCloud = options.writeCloud !== false;

  if (!writeCloud && !options.requireChangeOrigin) {
    return restoreRealGoalsFromCloudIntoEmptyLocal(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
    );
  }

  if (preview.differingEntityCount <= 0) {
    await persistEqualGoalBaseline(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
    );
    return emptyResult(preview);
  }

  if (options.requireChangeOrigin) {
    return synchronizeRealGoalsDirectional(
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
    return synchronizeRealGoalsDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      'local',
    );
  }
  if (origin === 'cloud') {
    return synchronizeRealGoalsDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      'cloud',
    );
  }

  return synchronizeRealGoalsMerged(
    localDatabase,
    cloudDatabase,
    currentUserId,
    state,
    preview,
    origin === 'equal' ? 'unknown' : origin,
  );
}

export async function synchronizeRealGoalsFromCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  return synchronizeRealGoals(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: false,
    requireChangeOrigin: 'cloud',
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
  });
}

/**
 * Records the current AppDB Goals mutation in the local Dexie Cloud replica.
 *
 * This deliberately bypasses provenance classification and business conflict
 * resolution: the call represents a mutation that has already been committed
 * to AppDB and must become a real Dexie operation immediately. The transaction
 * never calls cloud.sync(); disableEagerSync therefore keeps transport under
 * the automatic controller's control.
 */
export async function stageRealGoalsMutationInLocalCloudReplica(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  goalIds?: readonly string[],
): Promise<void> {
  const local = await readLocalState(localDatabase);
  const localLogical = resolveSingleSideLogicalState(
    local.localGoals,
    local.localMarkers,
  );
  const requestedGoalIds = goalIds
    ? new Set(goalIds.filter((id) => id.trim().length > 0))
    : undefined;
  if (requestedGoalIds?.size === 0) return;
  const actorId = await resolveSyncActorId(localDatabase);
  const baselineTable = logicalSyncBaselineTable(cloudDatabase);
  if (!baselineTable) {
    throw new Error(
      'La référence locale Goals est indisponible. La mutation n’a pas été stagée.',
    );
  }

  await cloudDatabase.transaction(
    'rw',
    [
      cloudDatabase.realGoals,
      cloudDatabase.realGoalDeletionRecords,
      baselineTable,
    ],
    async () => {
      const [goalRows, markerRows, baseline] = await Promise.all([
        cloudDatabase.realGoals.toArray(),
        cloudDatabase.realGoalDeletionRecords.toArray(),
        baselineTable.get(
          logicalSyncBaselineId(currentUserId, 'goals', 'goals'),
        ),
      ]);
      const ownedGoalRows = goalRows.filter((goal) =>
        belongsToCurrentUser(goal, currentUserId));
      const ownedMarkerRows = markerRows.filter(
        (marker) =>
          marker.entityType === 'goal'
          && belongsToCurrentUser(marker, currentUserId),
      );
      const stagedGoalIds = requestedGoalIds ?? new Set([
        ...local.localGoals.map((goal) => goal.id),
        ...local.localMarkers.map((marker) => marker.entityId),
        ...ownedGoalRows.flatMap((row) => {
          const id = localIdFromCloud(row.id);
          return id ? [id] : [];
        }),
        ...ownedMarkerRows.flatMap((row) => {
          const marker = fromCloudMarker(row);
          return marker ? [marker.entityId] : [];
        }),
      ]);
      const cloudStamp = maximumLogicalSyncStamp([
        ...ownedGoalRows,
        ...ownedMarkerRows,
      ]);
      const baselineStamp: LogicalSyncStamp = baseline
        ? { revision: baseline.revision, actorId: baseline.actorId }
        : { revision: 0, actorId: '' };
      const stamp = nextLogicalSyncStamp(
        actorId,
        cloudStamp,
        baselineStamp,
      );
      const localGoalById = mapById(local.localGoals);
      const localMarkerById = mapById(local.localMarkers);

      for (const goalId of stagedGoalIds) {
        const cloudGoalId = cloudPrivateId(goalId);
        const markerId = deletionRecordId('goal', goalId);
        const cloudMarkerId = cloudPrivateId(markerId);
        const existingGoalRow = goalRows.find((row) =>
          row.id === cloudGoalId);
        const existingMarkerRow = markerRows.find((row) =>
          row.id === cloudMarkerId);
        if (
          (existingGoalRow
            && !belongsToCurrentUser(existingGoalRow, currentUserId))
          || (existingMarkerRow
            && !belongsToCurrentUser(existingMarkerRow, currentUserId))
        ) {
          throw new Error(
            'Une ligne Goals appartient à un autre compte. Le staging a été annulé.',
          );
        }

        const target = effectiveGoalState(
          localGoalById.get(goalId),
          localMarkerById.get(markerId),
        );
        if (target.goal) {
          await cloudDatabase.realGoals.put(
            withLogicalSyncStamp(toCloudGoal(target.goal), stamp),
          );
        } else if (existingGoalRow) {
          await cloudDatabase.realGoals.delete(cloudGoalId);
        }
        if (target.marker) {
          await cloudDatabase.realGoalDeletionRecords.put(
            withLogicalSyncStamp(toCloudMarker(target.marker), stamp),
          );
        } else if (existingMarkerRow) {
          await cloudDatabase.realGoalDeletionRecords.delete(cloudMarkerId);
        }
      }

      const [stagedGoalRows, stagedMarkerRows] = await Promise.all([
        cloudDatabase.realGoals.toArray(),
        cloudDatabase.realGoalDeletionRecords.toArray(),
      ]);
      const stagedCloudLogical = resolveSingleSideLogicalState(
        stagedGoalRows
          .filter((goal) => belongsToCurrentUser(goal, currentUserId))
          .map(fromCloudGoal)
          .filter((goal): goal is Goal => goal !== undefined),
        stagedMarkerRows
          .filter(
            (marker) =>
              marker.entityType === 'goal'
              && belongsToCurrentUser(marker, currentUserId),
          )
          .map(fromCloudMarker)
          .filter(
            (marker): marker is DeletionRecord => marker !== undefined,
          ),
      );
      await baselineTable.put({
        id: logicalSyncBaselineId(currentUserId, 'goals', 'goals'),
        accountUserId: currentUserId,
        domainId: 'goals',
        entityId: 'goals',
        localDigest: stableValue(localLogical),
        cloudDigest: stableValue(stagedCloudLogical),
        revision: stamp.revision,
        actorId: stamp.actorId,
        updatedAt: new Date().toISOString(),
      });
    },
  );
}

export async function prepareInitialRealGoalReconciliation(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<PreparedRealGoalReconciliation> {
  registeredGoalSyncContexts.set(currentUserId, { localDatabase, cloudDatabase });
  await ensureDomainBaselineMissing(cloudDatabase, currentUserId);
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  if (preview.differingEntityCount <= 0) {
    throw new Error(
      'Les objectifs sont déjà cohérents. Aucune première réconciliation n’est nécessaire.',
    );
  }
  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (origin !== 'unknown') {
    throw new Error(
      'Cette situation n’est plus une première réconciliation Goals. Relance l’analyse.',
    );
  }

  return {
    accountUserId: currentUserId,
    preview: { ...preview, changeOrigin: 'unknown' },
    localDigest: localDigest(state),
    cloudDigest: cloudDigest(state),
    cloudStamp: maximumGoalCloudStamp(state),
    items: buildReconciliationItems(state),
    preparedAt: new Date().toISOString(),
  };
}

export async function applyInitialRealGoalReconciliation(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  prepared: PreparedRealGoalReconciliation,
  choice: GoalInitialReconciliationChoice,
): Promise<RealGoalSyncResult> {
  if (prepared.accountUserId !== currentUserId) {
    throw new Error(
      'Le compte actif a changé. Aucune réconciliation Goals n’a été appliquée.',
    );
  }
  await ensureDomainBaselineMissing(cloudDatabase, currentUserId);

  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (
    origin !== 'unknown' ||
    localDigest(state) !== prepared.localDigest ||
    cloudDigest(state) !== prepared.cloudDigest ||
    !sameEntity(maximumGoalCloudStamp(state), prepared.cloudStamp)
  ) {
    throw new Error(
      'Les objectifs ont changé depuis l’aperçu. Aucune donnée n’a été remplacée ; relance l’analyse.',
    );
  }

  const logical = buildGoalLogicalStates(state);
  const target = choice === 'keep-local' ? logical.local : logical.cloud;
  const actorId = await resolveSyncActorId(localDatabase);
  const stamp = choice === 'keep-local'
    ? nextLogicalSyncStamp(actorId, maximumGoalCloudStamp(state))
    : maximumGoalCloudStamp(state);
  const preview = { ...buildPreview(state), changeOrigin: 'unknown' as const };
  const result = resultForTarget(
    preview,
    state,
    target,
    choice === 'keep-local' ? 'local-to-cloud' : 'cloud-to-local',
  );

  if (choice === 'keep-local') {
    const currentLocal = await readLocalState(localDatabase);
    if (
      stableValue({
        goals: sortById(currentLocal.localGoals),
        markers: sortById(currentLocal.localMarkers),
      }) !== prepared.localDigest
    ) {
      throw new Error(
        'Les objectifs de cet appareil ont changé. Aucune donnée cloud n’a été remplacée.',
      );
    }
    const applied = await applyCloudTargetIfUnchanged(
      cloudDatabase,
      currentUserId,
      state,
      target,
      stamp,
    );
    if (!applied) {
      throw new Error(
        'Les objectifs cloud ont changé. Aucune première réconciliation n’a été validée.',
      );
    }
  } else {
    const [goalRows, markerRows] = await Promise.all([
      cloudDatabase.realGoals.toArray(),
      cloudDatabase.realGoalDeletionRecords.toArray(),
    ]);
    const ownedGoals = goalRows.filter((goal) =>
      belongsToCurrentUser(goal, currentUserId));
    const ownedMarkers = markerRows.filter((marker) =>
      marker.entityType === 'goal' && belongsToCurrentUser(marker, currentUserId));
    if (
      !sameCloudOwnedCollection(ownedGoals, state.cloudGoalRows) ||
      !sameCloudOwnedCollection(ownedMarkers, state.cloudMarkerRows)
    ) {
      throw new Error(
        'Les objectifs cloud ont changé. Aucune donnée locale n’a été remplacée.',
      );
    }
    const applied = await applyLocalTargetIfUnchanged(localDatabase, state, target);
    if (!applied) {
      throw new Error(
        'Les objectifs de cet appareil ont changé. Aucune première réconciliation n’a été validée.',
      );
    }
    await reloadUserStateRuntime(localDatabase);
  }

  const converged = await readState(localDatabase, cloudDatabase, currentUserId);
  const convergedLogical = buildGoalLogicalStates(converged);
  if (!sameEntity(convergedLogical.local, convergedLogical.cloud)) {
    throw new Error(
      'La convergence Goals n’a pas pu être confirmée. Aucune baseline de réconciliation n’a été créée.',
    );
  }
  await persistEqualGoalBaseline(
    localDatabase,
    cloudDatabase,
    currentUserId,
    converged,
  );
  return result;
}

export function registeredGoalSyncContext(
  currentUserId: string,
): RegisteredGoalSyncContext {
  const context = registeredGoalSyncContexts.get(currentUserId);
  if (!context) {
    throw new Error(
      'Le contexte des objectifs doit être analysé avant une opération de continuité.',
    );
  }
  return context;
}

export async function prepareRegisteredRealGoalInitialReconciliation(
  currentUserId: string,
): Promise<PreparedRealGoalReconciliation> {
  const context = registeredGoalSyncContext(currentUserId);
  return prepareInitialRealGoalReconciliation(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}

export async function applyRegisteredRealGoalInitialReconciliation(
  currentUserId: string,
  prepared: PreparedRealGoalReconciliation,
  choice: GoalInitialReconciliationChoice,
): Promise<RealGoalSyncResult> {
  const context = registeredGoalSyncContext(currentUserId);
  return applyInitialRealGoalReconciliation(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
    prepared,
    choice,
  );
}

export async function synchronizeRegisteredRealGoalsFromCloud(
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  const context = registeredGoalSyncContext(currentUserId);
  return synchronizeRealGoalsFromCloud(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}

export async function synchronizeRegisteredRealGoalsToCloud(
  currentUserId: string,
): Promise<RealGoalSyncResult> {
  const context = registeredGoalSyncContext(currentUserId);
  return synchronizeRealGoalsToCloud(
    context.localDatabase,
    context.cloudDatabase,
    currentUserId,
  );
}
