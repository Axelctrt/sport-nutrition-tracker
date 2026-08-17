import type { Table } from 'dexie';
import type { WeightEntry } from '@/domain/models/weight';
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

type CloudWeightEntry = Omit<WeightEntry, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

export interface RealWeightSyncPreview {
  readonly localWeightCount: number;
  readonly cloudWeightCount: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
  readonly changeOrigin?: 'local' | 'cloud' | 'both' | 'unknown';
}

export interface RealWeightSyncResult extends RealWeightSyncPreview {
  readonly uploadedWeights: number;
  readonly downloadedWeights: number;
  readonly removedLocalWeights: number;
  readonly removedCloudWeights: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly completedAt: string;
}

interface WeightState {
  weight?: WeightEntry;
  marker?: DeletionRecord;
}

interface WeightDomainState {
  readonly localWeights: readonly WeightEntry[];
  readonly localMarkers: readonly DeletionRecord[];
  readonly cloudWeights: readonly WeightEntry[];
  readonly cloudMarkers: readonly DeletionRecord[];
  readonly cloudWeightRows: readonly CloudOwned<CloudWeightEntry>[];
  readonly cloudMarkerRows: readonly CloudOwned<CloudDeletionRecord>[];
}

interface WeightLogicalState {
  readonly weights: readonly WeightEntry[];
  readonly markers: readonly DeletionRecord[];
}

interface RealWeightSyncExecutionOptions extends CloudSyncExecutionOptions {
  readonly requireChangeOrigin?: 'cloud' | 'local';
  readonly persistDomainBaseline?: boolean;
  readonly requireCloudStateMatch?: boolean;
}

function toCloudWeight(weight: WeightEntry): CloudWeightEntry {
  return { ...weight, id: cloudPrivateId(weight.id) };
}

function fromCloudWeight(
  weight: CloudOwned<CloudWeightEntry>,
): WeightEntry | undefined {
  const localId = localIdFromCloud(weight.id);
  if (!localId) return undefined;
  return {
    ...stripLogicalSyncFields(stripCloudFields(weight)),
    id: localId,
  } as WeightEntry;
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
  local: WeightState,
  cloud: WeightState,
): WeightState {
  const weight = chooseLatest(local.weight, cloud.weight);
  let marker = chooseLatest(local.marker, cloud.marker);

  if (
    weight &&
    marker?.status === 'deleted' &&
    weight.updatedAt > marker.updatedAt
  ) {
    marker = createRestoredDeletionRecord(
      { entityType: 'weight', entityId: weight.id },
      weight.updatedAt,
      marker.deletedAt,
      marker,
    );
  }

  const deletionWins =
    marker?.status === 'deleted' &&
    (!weight || marker.updatedAt >= weight.updatedAt);

  return {
    ...(deletionWins ? {} : weight ? { weight } : {}),
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
  const [localWeights, localMarkers] = await Promise.all([
    localDatabase.weights.toArray(),
    localDatabase.deletionRecords
      .where('entityType')
      .equals('weight')
      .toArray(),
  ]);
  return { localWeights, localMarkers };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<WeightDomainState> {
  const [local, cloudWeightRows, cloudMarkerRows] = await Promise.all([
    readLocalState(localDatabase),
    cloudDatabase.realWeights.toArray(),
    cloudDatabase.realWeightDeletionRecords.toArray(),
  ]);

  const ownedCloudWeightRows = cloudWeightRows
    .filter((weight) => belongsToCurrentUser(weight, currentUserId));
  const ownedCloudMarkerRows = cloudMarkerRows
    .filter(
      (marker) =>
        marker.entityType === 'weight' &&
        belongsToCurrentUser(marker, currentUserId),
    );
  const cloudWeights = ownedCloudWeightRows
    .map(fromCloudWeight)
    .filter((weight): weight is WeightEntry => weight !== undefined);
  const cloudMarkers = ownedCloudMarkerRows
    .map(fromCloudMarker)
    .filter((marker): marker is DeletionRecord => marker !== undefined);

  return {
    ...local,
    cloudWeights,
    cloudMarkers,
    cloudWeightRows: ownedCloudWeightRows,
    cloudMarkerRows: ownedCloudMarkerRows,
  };
}

function buildPreview(
  localWeights: readonly WeightEntry[],
  localMarkers: readonly DeletionRecord[],
  cloudWeights: readonly WeightEntry[],
  cloudMarkers: readonly DeletionRecord[],
): RealWeightSyncPreview {
  const localWeightById = mapById(localWeights);
  const cloudWeightById = mapById(cloudWeights);
  const localMarkerById = mapById(localMarkers);
  const cloudMarkerById = mapById(cloudMarkers);
  const ids = new Set([
    ...localWeightById.keys(),
    ...cloudWeightById.keys(),
    ...localMarkers.map((marker) => marker.entityId),
    ...cloudMarkers.map((marker) => marker.entityId),
  ]);

  let differingEntityCount = 0;
  for (const id of ids) {
    const markerId = deletionRecordId('weight', id);
    if (
      !sameEntity(localWeightById.get(id), cloudWeightById.get(id)) ||
      !sameEntity(localMarkerById.get(markerId), cloudMarkerById.get(markerId))
    ) {
      differingEntityCount += 1;
    }
  }

  return {
    localWeightCount: localWeights.length,
    cloudWeightCount: cloudWeights.length,
    localDeletionCount: localMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    cloudDeletionCount: cloudMarkers.filter(
      (marker) => marker.status === 'deleted',
    ).length,
    differingEntityCount,
  };
}

function resolveWeightLogicalState(
  localWeights: readonly WeightEntry[],
  localMarkers: readonly DeletionRecord[],
  cloudWeights: readonly WeightEntry[],
  cloudMarkers: readonly DeletionRecord[],
): WeightLogicalState {
  const localWeightById = mapById(localWeights);
  const cloudWeightById = mapById(cloudWeights);
  const localMarkerById = mapById(localMarkers);
  const cloudMarkerById = mapById(cloudMarkers);
  const ids = new Set([
    ...localWeightById.keys(),
    ...cloudWeightById.keys(),
    ...localMarkers.map((marker) => marker.entityId),
    ...cloudMarkers.map((marker) => marker.entityId),
  ]);
  const weights: WeightEntry[] = [];
  const markers: DeletionRecord[] = [];

  for (const id of ids) {
    const markerId = deletionRecordId('weight', id);
    const resolved = resolveState(
      {
        ...(localWeightById.get(id) ? { weight: localWeightById.get(id)! } : {}),
        ...(localMarkerById.get(markerId)
          ? { marker: localMarkerById.get(markerId)! }
          : {}),
      },
      {
        ...(cloudWeightById.get(id) ? { weight: cloudWeightById.get(id)! } : {}),
        ...(cloudMarkerById.get(markerId)
          ? { marker: cloudMarkerById.get(markerId)! }
          : {}),
      },
    );
    if (resolved.weight) weights.push(resolved.weight);
    if (resolved.marker) markers.push(resolved.marker);
  }

  return { weights: sortById(weights), markers: sortById(markers) };
}

function buildWeightLogicalStates(state: WeightDomainState) {
  return {
    local: resolveWeightLogicalState(
      state.localWeights,
      state.localMarkers,
      [],
      [],
    ),
    cloud: resolveWeightLogicalState(
      [],
      [],
      state.cloudWeights,
      state.cloudMarkers,
    ),
  };
}

function maximumWeightCloudStamp(state: WeightDomainState) {
  return maximumLogicalSyncStamp([
    ...state.cloudWeightRows,
    ...state.cloudMarkerRows,
  ]);
}

async function bootstrapEqualWeightBaseline(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: WeightDomainState,
  logical: ReturnType<typeof buildWeightLogicalStates>,
): Promise<void> {
  if (!sameEntity(logical.local, logical.cloud)) return;
  const actorId = await resolveSyncActorId(localDatabase);
  const resolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'weights',
    entityId: 'weights',
    actorId,
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumWeightCloudStamp(state),
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

function emptyResult(preview: RealWeightSyncPreview): RealWeightSyncResult {
  return {
    ...preview,
    uploadedWeights: 0,
    downloadedWeights: 0,
    removedLocalWeights: 0,
    removedCloudWeights: 0,
    uploadedDeletionRecords: 0,
    downloadedDeletionRecords: 0,
    completedAt: new Date().toISOString(),
  };
}

function directionalEntityResolutions(
  currentUserId: string,
  actorId: string,
  state: WeightDomainState,
  final: WeightLogicalState,
): {
  readonly stamps: ReadonlyMap<string, ReturnType<typeof maximumLogicalSyncStamp>>;
  readonly baselines: readonly LogicalSyncBaseline[];
} {
  const localWeightById = mapById(state.localWeights);
  const cloudWeightById = mapById(state.cloudWeights);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const finalWeightById = mapById(final.weights);
  const finalMarkerById = mapById(final.markers);
  const cloudWeightRowById = new Map(
    state.cloudWeightRows.flatMap((row) => {
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
    ...localWeightById.keys(),
    ...cloudWeightById.keys(),
    ...state.localMarkers.map((marker) => marker.entityId),
    ...state.cloudMarkers.map((marker) => marker.entityId),
    ...finalWeightById.keys(),
    ...final.markers.map((marker) => marker.entityId),
  ]);
  const stamps = new Map<string, ReturnType<typeof maximumLogicalSyncStamp>>();
  const baselines: LogicalSyncBaseline[] = [];

  for (const id of ids) {
    const markerId = deletionRecordId('weight', id);
    const localState: WeightState = {
      ...(localWeightById.get(id) ? { weight: localWeightById.get(id)! } : {}),
      ...(localMarkerById.get(markerId)
        ? { marker: localMarkerById.get(markerId)! }
        : {}),
    };
    const cloudState: WeightState = {
      ...(cloudWeightById.get(id) ? { weight: cloudWeightById.get(id)! } : {}),
      ...(cloudMarkerById.get(markerId)
        ? { marker: cloudMarkerById.get(markerId)! }
        : {}),
    };
    const finalState: WeightState = {
      ...(finalWeightById.get(id) ? { weight: finalWeightById.get(id)! } : {}),
      ...(finalMarkerById.get(markerId)
        ? { marker: finalMarkerById.get(markerId)! }
        : {}),
    };
    const cloudStamp = maximumLogicalSyncStamp([
      cloudWeightRowById.get(id),
      cloudMarkerRowByEntityId.get(id),
    ]);
    const resolution = resolveLogicalSyncState({
      accountUserId: currentUserId,
      domainId: 'weights',
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

async function synchronizeRealWeightsDirectional(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  state: WeightDomainState,
  preview: RealWeightSyncPreview,
  options: RealWeightSyncExecutionOptions,
): Promise<RealWeightSyncResult> {
  const requiredOrigin = options.requireChangeOrigin;
  if (!requiredOrigin) return emptyResult(preview);

  const logical = buildWeightLogicalStates(state);
  const changeOrigin = await readDatabaseLogicalSyncChangeOrigin({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'weights',
    entityId: 'weights',
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumWeightCloudStamp(state),
  });
  if (changeOrigin !== requiredOrigin) return emptyResult(preview);

  const actorId = await resolveSyncActorId(localDatabase);
  const domainResolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'weights',
    entityId: 'weights',
    actorId,
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumWeightCloudStamp(state),
    legacyResolve: (localValue, cloudValue) =>
      resolveWeightLogicalState(
        localValue.weights,
        localValue.markers,
        cloudValue.weights,
        cloudValue.markers,
      ),
  });
  const final = requiredOrigin === 'cloud' ? logical.cloud : logical.local;
  if (!sameEntity(domainResolution.value, final)) return emptyResult(preview);

  const localWeightById = mapById(state.localWeights);
  const cloudWeightById = mapById(state.cloudWeights);
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

  const downloadedWeights = countChanged(localWeightById, final.weights);
  const removedLocalWeights = countRemoved(localWeightById, final.weights);
  const downloadedDeletionRecords = countChanged(localMarkerById, final.markers);
  const uploadedWeights = options.writeCloud !== false
    ? countChanged(cloudWeightById, final.weights)
    : 0;
  const removedCloudWeights = options.writeCloud !== false
    ? countRemoved(cloudWeightById, final.weights)
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
    [localDatabase.weights, localDatabase.deletionRecords],
    async () => {
      const current = await readLocalState(localDatabase);
      if (
        !sameEntity(sortById(current.localWeights), sortById(state.localWeights)) ||
        !sameEntity(sortById(current.localMarkers), sortById(state.localMarkers))
      ) {
        return;
      }

      const finalWeightIds = new Set(final.weights.map((weight) => weight.id));
      const finalMarkerIds = new Set(final.markers.map((marker) => marker.id));
      await localDatabase.weights.bulkDelete(
        state.localWeights
          .filter((weight) => !finalWeightIds.has(weight.id))
          .map((weight) => weight.id),
      );
      await localDatabase.deletionRecords.bulkDelete(
        state.localMarkers
          .filter((marker) => !finalMarkerIds.has(marker.id))
          .map((marker) => marker.id),
      );
      if (final.weights.length > 0) {
        await localDatabase.weights.bulkPut([...final.weights]);
      }
      if (final.markers.length > 0) {
        await localDatabase.deletionRecords.bulkPut([...final.markers]);
      }
      localStateApplied = true;
    },
  );

  let cloudStateApplied = false;
  if (options.writeCloud !== false && localStateApplied) {
    const cloudWeightRowById = new Map(
      state.cloudWeightRows.flatMap((row) => {
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
      [cloudDatabase.realWeights, cloudDatabase.realWeightDeletionRecords],
      async () => {
        if (options.requireCloudStateMatch === true) {
          const [currentWeightRows, currentMarkerRows] = await Promise.all([
            cloudDatabase.realWeights.toArray(),
            cloudDatabase.realWeightDeletionRecords.toArray(),
          ]);
          const currentOwnedWeights = currentWeightRows
            .filter((weight) => belongsToCurrentUser(weight, currentUserId));
          const currentOwnedMarkers = currentMarkerRows
            .filter(
              (marker) =>
                marker.entityType === 'weight' &&
                belongsToCurrentUser(marker, currentUserId),
            );
          if (
            !sameCloudOwnedCollection(currentOwnedWeights, state.cloudWeightRows) ||
            !sameCloudOwnedCollection(currentOwnedMarkers, state.cloudMarkerRows)
          ) {
            return;
          }
        }

        cloudStateApplied = true;
        const finalWeightIds = new Set(final.weights.map((weight) => weight.id));
        const finalMarkerIds = new Set(final.markers.map((marker) => marker.id));
        for (const value of state.cloudWeights) {
          if (!finalWeightIds.has(value.id)) {
            await cloudDatabase.realWeights.delete(cloudPrivateId(value.id));
          }
        }
        for (const value of state.cloudMarkers) {
          if (!finalMarkerIds.has(value.id)) {
            await cloudDatabase.realWeightDeletionRecords.delete(cloudPrivateId(value.id));
          }
        }
        for (const value of final.weights) {
          await upsertLogicalCloudValue(
            cloudDatabase.realWeights as Table<WeightEntry, string>,
            cloudWeightById.get(value.id),
            cloudWeightRowById.get(value.id),
            value,
            entityResolutions.stamps.get(value.id) ?? domainResolution.stamp,
            (target) => toCloudWeight(target) as WeightEntry,
          );
        }
        for (const value of final.markers) {
          await upsertLogicalCloudValue(
            cloudDatabase.realWeightDeletionRecords as Table<DeletionRecord, string>,
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
    uploadedWeights: cloudStateApplied ? uploadedWeights : 0,
    downloadedWeights: localStateApplied ? downloadedWeights : 0,
    removedLocalWeights: localStateApplied ? removedLocalWeights : 0,
    removedCloudWeights: cloudStateApplied ? removedCloudWeights : 0,
    uploadedDeletionRecords: cloudStateApplied ? uploadedDeletionRecords : 0,
    downloadedDeletionRecords: localStateApplied ? downloadedDeletionRecords : 0,
    completedAt: new Date().toISOString(),
  };
}

export async function previewRealWeightSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealWeightSyncPreview> {
  const state = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  const preview = buildPreview(
    state.localWeights,
    state.localMarkers,
    state.cloudWeights,
    state.cloudMarkers,
  );
  const logical = buildWeightLogicalStates(state);
  if (preview.differingEntityCount <= 0) {
    await bootstrapEqualWeightBaseline(
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
    domainId: 'weights',
    entityId: 'weights',
    localValue: logical.local,
    cloudValue: logical.cloud,
    cloudStamp: maximumWeightCloudStamp(state),
  });
  return {
    ...preview,
    changeOrigin: changeOrigin === 'equal' ? 'unknown' : changeOrigin,
  };
}

export async function synchronizeRealWeights(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: RealWeightSyncExecutionOptions = {},
): Promise<RealWeightSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(
    localDatabase,
    cloudDatabase,
    currentUserId,
  );
  const preview = buildPreview(
    state.localWeights,
    state.localMarkers,
    state.cloudWeights,
    state.cloudMarkers,
  );

  if (options.requireChangeOrigin) {
    return synchronizeRealWeightsDirectional(
      localDatabase,
      cloudDatabase,
      currentUserId,
      state,
      preview,
      options,
    );
  }

  const localWeightById = mapById(state.localWeights);
  const cloudWeightById = mapById(state.cloudWeights);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const cloudWeightRowById = new Map(
    state.cloudWeightRows.flatMap((row) => {
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
    ...localWeightById.keys(),
    ...cloudWeightById.keys(),
    ...state.localMarkers.map((marker) => marker.entityId),
    ...state.cloudMarkers.map((marker) => marker.entityId),
  ]);

  let uploadedWeights = 0;
  let downloadedWeights = 0;
  let removedLocalWeights = 0;
  let removedCloudWeights = 0;
  let uploadedDeletionRecords = 0;
  let downloadedDeletionRecords = 0;

  for (const id of ids) {
    const markerId = deletionRecordId('weight', id);
    const localWeight = localWeightById.get(id);
    const localMarker = localMarkerById.get(markerId);
    const cloudWeight = cloudWeightById.get(id);
    const cloudMarker = cloudMarkerById.get(markerId);
    const localState: WeightState = {
      ...(localWeight ? { weight: localWeight } : {}),
      ...(localMarker ? { marker: localMarker } : {}),
    };
    const cloudState: WeightState = {
      ...(cloudWeight ? { weight: cloudWeight } : {}),
      ...(cloudMarker ? { marker: cloudMarker } : {}),
    };
    const resolution = await resolveDatabaseLogicalSyncState({
      cloudDatabase,
      accountUserId: currentUserId,
      domainId: 'weights',
      entityId: id,
      actorId,
      localValue: localState,
      cloudValue: cloudState,
      cloudStamp: maximumLogicalSyncStamp([
        cloudWeightRowById.get(id),
        cloudMarkerRowByEntityId.get(id),
      ]),
      legacyResolve: resolveState,
    });
    const resolved = resolution.value;
    let localStateUnchanged = true;

    if (resolved.weight) {
      if (!sameEntity(localState.weight, resolved.weight)) {
        const applied = await putLocalIfUnchanged(
          localDatabase,
          localDatabase.weights,
          id,
          localState.weight,
          resolved.weight,
        );
        if (applied) downloadedWeights += 1;
        else localStateUnchanged = false;
      }
    } else if (localState.weight) {
      const applied = await deleteLocalIfUnchanged(
        localDatabase,
        localDatabase.weights,
        id,
        localState.weight,
      );
      if (applied) removedLocalWeights += 1;
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

    if (resolved.weight) {
      if (
        await upsertLogicalCloudValue(
          cloudDatabase.realWeights as Table<WeightEntry, string>,
          cloudState.weight,
          cloudWeightRowById.get(id),
          resolved.weight,
          resolution.stamp,
          (value) => toCloudWeight(value) as WeightEntry,
        )
      ) {
        uploadedWeights += 1;
      }
    } else if (cloudState.weight) {
      await cloudDatabase.realWeights.delete(cloudPrivateId(id));
      removedCloudWeights += 1;
    }

    if (
      resolved.marker &&
      await upsertLogicalCloudValue(
        cloudDatabase.realWeightDeletionRecords as Table<
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
    uploadedWeights,
    downloadedWeights,
    removedLocalWeights,
    removedCloudWeights,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}

export async function synchronizeRealWeightsFromCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealWeightSyncResult> {
  return synchronizeRealWeights(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: false,
    requireChangeOrigin: 'cloud',
    persistDomainBaseline: true,
  });
}

export async function synchronizeRealWeightsToCloud(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealWeightSyncResult> {
  return synchronizeRealWeights(localDatabase, cloudDatabase, currentUserId, {
    writeCloud: true,
    requireChangeOrigin: 'local',
    requireCloudStateMatch: true,
  });
}
