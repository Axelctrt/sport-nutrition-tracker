import type { Table } from 'dexie';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import type { WeightEntry } from '@/domain/models/weight';
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

function toCloudWeight(entry: WeightEntry): CloudWeightEntry {
  return { ...entry, id: cloudPrivateId(entry.id) };
}

function fromCloudWeight(
  entry: CloudOwned<CloudWeightEntry>,
): WeightEntry | undefined {
  const localId = localIdFromCloud(entry.id);
  if (!localId) return undefined;
  return {
    ...stripLogicalSyncFields(stripCloudFields(entry)),
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

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
) {
  const [localWeights, localMarkers, cloudWeightRows, cloudMarkerRows] =
    await Promise.all([
      localDatabase.weights.toArray(),
      localDatabase.deletionRecords
        .where('entityType')
        .equals('weight')
        .toArray(),
      cloudDatabase.realWeights.toArray(),
      cloudDatabase.realWeightDeletionRecords.toArray(),
    ]);

  const cloudWeights = cloudWeightRows
    .filter((entry) => belongsToCurrentUser(entry, currentUserId))
    .map(fromCloudWeight)
    .filter((entry): entry is WeightEntry => entry !== undefined);
  const cloudMarkers = cloudMarkerRows
    .filter(
      (marker) =>
        marker.entityType === 'weight' &&
        belongsToCurrentUser(marker, currentUserId),
    )
    .map(fromCloudMarker)
    .filter((marker): marker is DeletionRecord => marker !== undefined);

  return {
    localWeights,
    localMarkers,
    cloudWeights,
    cloudMarkers,
    cloudWeightRows,
    cloudMarkerRows,
  };
}

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
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

export async function previewRealWeightSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealWeightSyncPreview> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  return buildPreview(
    state.localWeights,
    state.localMarkers,
    state.cloudWeights,
    state.cloudMarkers,
  );
}

export async function synchronizeRealWeights(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealWeightSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(
    state.localWeights,
    state.localMarkers,
    state.cloudWeights,
    state.cloudMarkers,
  );
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
    } else {
      if (localState.weight) {
        const applied = await deleteLocalIfUnchanged(
          localDatabase,
          localDatabase.weights,
          id,
          localState.weight,
        );
        if (applied) removedLocalWeights += 1;
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
      resolved.marker
      && await upsertLogicalCloudValue(
        cloudDatabase.realWeightDeletionRecords as Table<DeletionRecord, string>,
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
