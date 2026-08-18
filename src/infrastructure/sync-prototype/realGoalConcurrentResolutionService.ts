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
  type LogicalSyncBaseline,
  type LogicalSyncFields,
  type LogicalSyncStamp,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import type {
  GoalReconciliationItem,
  GoalReconciliationSideStatus,
  RealGoalSyncPreview,
  RealGoalSyncResult,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import { reloadUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

type CloudGoal = Omit<Goal, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

interface GoalEntityState {
  readonly goal?: Goal;
  readonly marker?: DeletionRecord;
}

interface GoalLocalState {
  readonly localGoals: readonly Goal[];
  readonly localMarkers: readonly DeletionRecord[];
}

interface GoalDomainState extends GoalLocalState {
  readonly cloudGoals: readonly Goal[];
  readonly cloudMarkers: readonly DeletionRecord[];
  readonly cloudGoalRows: readonly CloudOwned<CloudGoal>[];
  readonly cloudMarkerRows: readonly CloudOwned<CloudDeletionRecord>[];
}

interface GoalLogicalState {
  readonly goals: readonly Goal[];
  readonly markers: readonly DeletionRecord[];
}

export type GoalConcurrentReconciliationChoice = 'keep-local' | 'use-cloud';

export interface PreparedRealGoalConcurrentReconciliation {
  readonly accountUserId: string;
  readonly preview: RealGoalSyncPreview & { readonly changeOrigin: 'both' };
  readonly localDigest: string;
  readonly cloudDigest: string;
  readonly cloudStamp: LogicalSyncStamp;
  readonly baselineDigest: string;
  readonly items: readonly GoalReconciliationItem[];
  readonly preparedAt: string;
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
): GoalEntityState {
  let effectiveMarker = marker;
  if (
    goal
    && effectiveMarker?.status === 'deleted'
    && goal.updatedAt > effectiveMarker.updatedAt
  ) {
    effectiveMarker = createRestoredDeletionRecord(
      { entityType: 'goal', entityId: goal.id },
      goal.updatedAt,
      effectiveMarker.deletedAt,
      effectiveMarker,
    );
  }

  const deletionWins =
    effectiveMarker?.status === 'deleted'
    && (!goal || effectiveMarker.updatedAt >= goal.updatedAt);

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
  const resolvedGoals: Goal[] = [];
  const resolvedMarkers: DeletionRecord[] = [];

  for (const id of ids) {
    const resolved = effectiveGoalState(
      goalById.get(id),
      markerById.get(deletionRecordId('goal', id)),
    );
    if (resolved.goal) resolvedGoals.push(resolved.goal);
    if (resolved.marker) resolvedMarkers.push(resolved.marker);
  }

  return {
    goals: sortById(resolvedGoals),
    markers: sortById(resolvedMarkers),
  };
}

function buildLogicalStates(state: GoalDomainState) {
  return {
    local: resolveSingleSideLogicalState(state.localGoals, state.localMarkers),
    cloud: resolveSingleSideLogicalState(state.cloudGoals, state.cloudMarkers),
  };
}

async function readLocalState(localDatabase: AppDatabase): Promise<GoalLocalState> {
  const [localGoals, localMarkers] = await Promise.all([
    localDatabase.goals.toArray(),
    localDatabase.deletionRecords.where('entityType').equals('goal').toArray(),
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
  const ownedCloudGoalRows = cloudGoalRows.filter((goal) =>
    belongsToCurrentUser(goal, currentUserId));
  const ownedCloudMarkerRows = cloudMarkerRows.filter(
    (marker) =>
      marker.entityType === 'goal'
      && belongsToCurrentUser(marker, currentUserId),
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
    const local = effectiveGoalState(
      localGoalById.get(id),
      localMarkerById.get(markerId),
    );
    const cloud = effectiveGoalState(
      cloudGoalById.get(id),
      cloudMarkerById.get(markerId),
    );
    if (!sameEntity(local, cloud)) differingEntityCount += 1;
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

async function readRequiredBaseline(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<LogicalSyncBaseline> {
  const table = logicalSyncBaselineTable(cloudDatabase);
  if (!table) {
    throw new Error(
      'La référence Goals est indisponible. Aucune résolution concurrente n’a été appliquée.',
    );
  }
  const baseline = await table.get(
    logicalSyncBaselineId(currentUserId, 'goals', 'goals'),
  );
  if (!baseline) {
    throw new Error(
      'Aucune référence Goals antérieure n’existe. Utilise le parcours de première réconciliation.',
    );
  }
  return baseline;
}

async function readOrigin(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
) {
  const logical = buildLogicalStates(state);
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

function sideStatus(
  own: GoalEntityState,
  other: GoalEntityState,
): GoalReconciliationSideStatus {
  if (own.marker?.status === 'deleted' && !own.goal) return 'deleted';
  if (!own.goal) return 'absent';
  if (other.goal && !sameEntity(own.goal, other.goal)) return 'modified';
  return 'present';
}

function keepLocalConsequence(local: GoalEntityState, cloud: GoalEntityState): string {
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

function useCloudConsequence(local: GoalEntityState, cloud: GoalEntityState): string {
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

function buildItems(state: GoalDomainState): GoalReconciliationItem[] {
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
      useCloudConsequence: useCloudConsequence(local, cloud),
    });
  }
  return items;
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

async function cloudStateMatchesExpected(
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  expected: GoalDomainState,
): Promise<boolean> {
  const [goals, markers] = await Promise.all([
    cloudDatabase.realGoals.toArray(),
    cloudDatabase.realGoalDeletionRecords.toArray(),
  ]);
  const ownedGoals = goals.filter((goal) =>
    belongsToCurrentUser(goal, currentUserId));
  const ownedMarkers = markers.filter(
    (marker) =>
      marker.entityType === 'goal'
      && belongsToCurrentUser(marker, currentUserId),
  );
  return (
    sameCloudOwnedCollection(ownedGoals, expected.cloudGoalRows)
    && sameCloudOwnedCollection(ownedMarkers, expected.cloudMarkerRows)
  );
}

function sameLocalState(current: GoalLocalState, expected: GoalLocalState): boolean {
  return (
    sameEntity(sortById(current.localGoals), sortById(expected.localGoals))
    && sameEntity(sortById(current.localMarkers), sortById(expected.localMarkers))
  );
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
      if (!sameLocalState(current, expected)) return;

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
      if (target.goals.length > 0) await localDatabase.goals.bulkPut([...target.goals]);
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
  const goalRowById = new Map(
    expected.cloudGoalRows.flatMap((row) => {
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
    [cloudDatabase.realGoals, cloudDatabase.realGoalDeletionRecords],
    async () => {
      if (!await cloudStateMatchesExpected(cloudDatabase, currentUserId, expected)) {
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
          goalRowById.get(value.id),
          value,
          stamp,
          (candidate) => toCloudGoal(candidate) as Goal,
        );
      }
      for (const value of target.markers) {
        await upsertLogicalCloudValue(
          cloudDatabase.realGoalDeletionRecords as Table<DeletionRecord, string>,
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

async function persistEqualBaseline(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: GoalDomainState,
): Promise<void> {
  const logical = buildLogicalStates(state);
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

export async function prepareRealGoalConcurrentReconciliation(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<PreparedRealGoalConcurrentReconciliation> {
  const baseline = await readRequiredBaseline(cloudDatabase, currentUserId);
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  if (preview.differingEntityCount <= 0) {
    throw new Error(
      'Les objectifs sont déjà cohérents. Aucune résolution concurrente n’est nécessaire.',
    );
  }
  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (origin !== 'both') {
    throw new Error(
      'Cette situation n’est plus un conflit Goals des deux côtés. Relance l’analyse.',
    );
  }

  return {
    accountUserId: currentUserId,
    preview: { ...preview, changeOrigin: 'both' },
    localDigest: localDigest(state),
    cloudDigest: cloudDigest(state),
    cloudStamp: maximumGoalCloudStamp(state),
    baselineDigest: stableValue(baseline),
    items: buildItems(state),
    preparedAt: new Date().toISOString(),
  };
}

export async function applyRealGoalConcurrentReconciliation(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  prepared: PreparedRealGoalConcurrentReconciliation,
  choice: GoalConcurrentReconciliationChoice,
): Promise<RealGoalSyncResult> {
  if (prepared.accountUserId !== currentUserId) {
    throw new Error(
      'Le compte actif a changé. Aucune résolution concurrente Goals n’a été appliquée.',
    );
  }

  const baseline = await readRequiredBaseline(cloudDatabase, currentUserId);
  if (stableValue(baseline) !== prepared.baselineDigest) {
    throw new Error(
      'La référence Goals a changé depuis l’aperçu. Aucune donnée n’a été remplacée ; relance l’analyse.',
    );
  }

  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const origin = await readOrigin(cloudDatabase, currentUserId, state);
  if (
    origin !== 'both'
    || localDigest(state) !== prepared.localDigest
    || cloudDigest(state) !== prepared.cloudDigest
    || !sameEntity(maximumGoalCloudStamp(state), prepared.cloudStamp)
  ) {
    throw new Error(
      'Les objectifs ont changé depuis l’aperçu. Aucune donnée n’a été remplacée ; relance l’analyse.',
    );
  }

  const logical = buildLogicalStates(state);
  const target = choice === 'keep-local' ? logical.local : logical.cloud;
  const preview = { ...buildPreview(state), changeOrigin: 'both' as const };
  const result = resultForTarget(
    preview,
    state,
    target,
    choice === 'keep-local' ? 'local-to-cloud' : 'cloud-to-local',
  );

  if (choice === 'keep-local') {
    const currentLocal = await readLocalState(localDatabase);
    if (!sameLocalState(currentLocal, state)) {
      throw new Error(
        'Les objectifs de cet appareil ont changé. Aucune donnée cloud n’a été remplacée.',
      );
    }
    const actorId = await resolveSyncActorId(localDatabase);
    const stamp = nextLogicalSyncStamp(
      actorId,
      { revision: baseline.revision, actorId: baseline.actorId },
      maximumGoalCloudStamp(state),
    );
    const applied = await applyCloudTargetIfUnchanged(
      cloudDatabase,
      currentUserId,
      state,
      target,
      stamp,
    );
    if (!applied) {
      throw new Error(
        'Les objectifs cloud ont changé. Aucune résolution concurrente n’a été validée.',
      );
    }
  } else {
    if (!await cloudStateMatchesExpected(cloudDatabase, currentUserId, state)) {
      throw new Error(
        'Les objectifs cloud ont changé. Aucune donnée locale n’a été remplacée.',
      );
    }
    const applied = await applyLocalTargetIfUnchanged(localDatabase, state, target);
    if (!applied) {
      throw new Error(
        'Les objectifs de cet appareil ont changé. Aucune résolution concurrente n’a été validée.',
      );
    }
    await reloadUserStateRuntime(localDatabase);
  }

  const converged = await readState(localDatabase, cloudDatabase, currentUserId);
  const convergedLogical = buildLogicalStates(converged);
  if (!sameEntity(convergedLogical.local, convergedLogical.cloud)) {
    throw new Error(
      'La convergence Goals n’a pas pu être confirmée. La référence précédente est conservée.',
    );
  }
  await persistEqualBaseline(
    localDatabase,
    cloudDatabase,
    currentUserId,
    converged,
  );
  return result;
}
