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
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stripCloudFields,
  type CloudOwned,
} from '@/infrastructure/sync-prototype/cloudSyncValue';

type CloudWeightEntry = Omit<WeightEntry, 'id'> & { readonly id: string };
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & { readonly id: string };

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
  return { ...stripCloudFields(entry), id: localId };
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

  return { localWeights, localMarkers, cloudWeights, cloudMarkers };
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
): Promise<RealWeightSyncResult> {
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
    const resolved = resolveState(localState, cloudState);

    if (resolved.weight) {
      if (!sameEntity(localState.weight, resolved.weight)) {
        await localDatabase.weights.put(resolved.weight);
        downloadedWeights += 1;
      }
      if (
        await upsertCloud(
          cloudDatabase.realWeights as Table<WeightEntry, string>,
          cloudState.weight,
          resolved.weight,
          (value) => toCloudWeight(value) as WeightEntry,
        )
      ) {
        uploadedWeights += 1;
      }
    } else {
      if (localState.weight) {
        await localDatabase.weights.delete(id);
        removedLocalWeights += 1;
      }
      if (cloudState.weight) {
        await cloudDatabase.realWeights.delete(cloudPrivateId(id));
        removedCloudWeights += 1;
      }
    }

    if (resolved.marker) {
      if (!sameEntity(localState.marker, resolved.marker)) {
        await localDatabase.deletionRecords.put(resolved.marker);
        downloadedDeletionRecords += 1;
      }
      if (
        await upsertCloud(
          cloudDatabase.realWeightDeletionRecords as Table<DeletionRecord, string>,
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
    uploadedWeights,
    downloadedWeights,
    removedLocalWeights,
    removedCloudWeights,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}
