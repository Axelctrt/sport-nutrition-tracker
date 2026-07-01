import type { Table } from 'dexie';
import type { EntityMetadata } from '@/domain/models/common';
import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createRestoredDeletionRecord,
} from '@/domain/models/deletion';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

type CloudOwned<T> = T & {
  readonly owner?: string;
  readonly realmId?: string;
  readonly $ts?: unknown;
  readonly _hasBlobRefs?: 1;
};

export interface StrengthExerciseAggregate {
  readonly id: string;
  readonly exercise: ExerciseDefinition;
  readonly updatedAt: string;
}

export interface WorkoutTemplateAggregate {
  readonly id: string;
  readonly template: WorkoutTemplate;
  readonly exercises: readonly WorkoutTemplateExercise[];
  readonly updatedAt: string;
}

export interface WorkoutSessionAggregate {
  readonly id: string;
  readonly session: WorkoutSession;
  readonly exercises: readonly WorkoutSessionExercise[];
  readonly sets: readonly StrengthSet[];
  readonly updatedAt: string;
}

export interface RealStrengthSyncPreview {
  readonly localCustomExerciseCount: number;
  readonly cloudCustomExerciseCount: number;
  readonly localTemplateCount: number;
  readonly cloudTemplateCount: number;
  readonly localSessionCount: number;
  readonly cloudSessionCount: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
}

export interface RealStrengthSyncResult extends RealStrengthSyncPreview {
  readonly uploadedExercises: number;
  readonly downloadedExercises: number;
  readonly uploadedTemplates: number;
  readonly downloadedTemplates: number;
  readonly uploadedSessions: number;
  readonly downloadedSessions: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly completedAt: string;
}

interface StrengthState {
  localExercises: StrengthExerciseAggregate[];
  cloudExercises: StrengthExerciseAggregate[];
  localTemplates: WorkoutTemplateAggregate[];
  cloudTemplates: WorkoutTemplateAggregate[];
  localSessions: WorkoutSessionAggregate[];
  cloudSessions: WorkoutSessionAggregate[];
  localMarkers: DeletionRecord[];
  cloudMarkers: DeletionRecord[];
}

const STRENGTH_DELETION_TYPES = new Set([
  'strengthSet',
  'workoutSessionExercise',
]);

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

function sameEntity(left: unknown, right: unknown): boolean {
  return stableValue(left) === stableValue(right);
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

function latestTimestamp(values: readonly EntityMetadata[]): string {
  return values
    .map((value) => value.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0] ??
    '1970-01-01T00:00:00.000Z';
}

function sortTemplateExercises(
  exercises: readonly WorkoutTemplateExercise[],
): WorkoutTemplateExercise[] {
  return [...exercises].sort((left, right) =>
    left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
  );
}

function sortSessionExercises(
  exercises: readonly WorkoutSessionExercise[],
): WorkoutSessionExercise[] {
  return [...exercises].sort((left, right) =>
    left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
  );
}

function sortSets(sets: readonly StrengthSet[]): StrengthSet[] {
  return [...sets].sort((left, right) =>
    left.sessionExerciseId.localeCompare(right.sessionExerciseId) ||
    left.setNumber - right.setNumber ||
    left.id.localeCompare(right.id),
  );
}

function exerciseAggregate(exercise: ExerciseDefinition): StrengthExerciseAggregate {
  return { id: exercise.id, exercise, updatedAt: exercise.updatedAt };
}

function templateAggregate(
  template: WorkoutTemplate,
  exercises: readonly WorkoutTemplateExercise[],
): WorkoutTemplateAggregate {
  const sortedExercises = sortTemplateExercises(exercises);
  return {
    id: template.id,
    template,
    exercises: sortedExercises,
    updatedAt: latestTimestamp([template, ...sortedExercises]),
  };
}

function sessionAggregate(
  session: WorkoutSession,
  exercises: readonly WorkoutSessionExercise[],
  sets: readonly StrengthSet[],
): WorkoutSessionAggregate {
  const sortedExercises = sortSessionExercises(exercises);
  const exerciseIds = new Set(sortedExercises.map((exercise) => exercise.id));
  const sortedSets = sortSets(
    sets.filter((set) =>
      set.sessionId === session.id && exerciseIds.has(set.sessionExerciseId),
    ),
  );
  return {
    id: session.id,
    session,
    exercises: sortedExercises,
    sets: sortedSets,
    updatedAt: latestTimestamp([session, ...sortedExercises, ...sortedSets]),
  };
}

function toCloudRow<T extends { id: string }>(value: T): T {
  return { ...value, id: cloudPrivateId(value.id) };
}

function fromCloudRow<T extends { id: string }>(
  value: CloudOwned<T>,
): T | undefined {
  const localId = localIdFromCloud(value.id);
  if (!localId) return undefined;
  return { ...stripCloudFields(value), id: localId } as T;
}

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function collectEntitiesById(
  sessions: readonly WorkoutSessionAggregate[],
): Map<string, WorkoutSessionExercise | StrengthSet> {
  const entities = new Map<string, WorkoutSessionExercise | StrengthSet>();
  for (const aggregate of sessions) {
    for (const exercise of aggregate.exercises) {
      const current = entities.get(exercise.id);
      entities.set(exercise.id, chooseLatest(current, exercise) ?? exercise);
    }
    for (const set of aggregate.sets) {
      const current = entities.get(set.id);
      entities.set(set.id, chooseLatest(current, set) ?? set);
    }
  }
  return entities;
}

function resolveMarkers(
  localMarkers: readonly DeletionRecord[],
  cloudMarkers: readonly DeletionRecord[],
  localSessions: readonly WorkoutSessionAggregate[],
  cloudSessions: readonly WorkoutSessionAggregate[],
): Map<string, DeletionRecord> {
  const localById = mapById(localMarkers);
  const cloudById = mapById(cloudMarkers);
  const entities = collectEntitiesById([...localSessions, ...cloudSessions]);
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  const resolved = new Map<string, DeletionRecord>();

  for (const id of ids) {
    let marker = chooseLatest(localById.get(id), cloudById.get(id));
    if (!marker) continue;
    const entity = entities.get(marker.entityId);
    if (
      entity &&
      marker.status === 'deleted' &&
      entity.updatedAt > marker.updatedAt
    ) {
      marker = createRestoredDeletionRecord(
        { entityType: marker.entityType, entityId: marker.entityId },
        entity.updatedAt,
        marker.deletedAt,
        marker,
      );
    }
    resolved.set(id, marker);
  }

  return resolved;
}

function applyMarkersToSession(
  aggregate: WorkoutSessionAggregate,
  markers: ReadonlyMap<string, DeletionRecord>,
): WorkoutSessionAggregate {
  const deletedExerciseIds = new Set<string>();
  const deletedSetIds = new Set<string>();
  let markerTimestamp = aggregate.updatedAt;

  for (const marker of markers.values()) {
    if (marker.status !== 'deleted') continue;
    if (marker.entityType === 'workoutSessionExercise') {
      if (aggregate.exercises.some((exercise) => exercise.id === marker.entityId)) {
        deletedExerciseIds.add(marker.entityId);
        markerTimestamp = marker.updatedAt > markerTimestamp
          ? marker.updatedAt
          : markerTimestamp;
      }
    } else if (marker.entityType === 'strengthSet') {
      if (aggregate.sets.some((set) => set.id === marker.entityId)) {
        deletedSetIds.add(marker.entityId);
        markerTimestamp = marker.updatedAt > markerTimestamp
          ? marker.updatedAt
          : markerTimestamp;
      }
    }
  }

  const exercises = aggregate.exercises.filter(
    (exercise) => !deletedExerciseIds.has(exercise.id),
  );
  const survivingExerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const sets = aggregate.sets.filter(
    (set) =>
      !deletedSetIds.has(set.id) &&
      survivingExerciseIds.has(set.sessionExerciseId),
  );

  return {
    ...aggregate,
    exercises: sortSessionExercises(exercises),
    sets: sortSets(sets),
    updatedAt: markerTimestamp,
  };
}

async function readLocalState(database: AppDatabase) {
  const [exerciseDefinitions, templates, templateExercises, sessions, sessionExercises, sets, markers] =
    await Promise.all([
      database.exerciseDefinitions.toArray(),
      database.workoutTemplates.toArray(),
      database.workoutTemplateExercises.toArray(),
      database.workoutSessions.toArray(),
      database.workoutSessionExercises.toArray(),
      database.strengthSets.toArray(),
      database.deletionRecords.toArray(),
    ]);

  const templateExercisesByTemplate = new Map<string, WorkoutTemplateExercise[]>();
  for (const exercise of templateExercises) {
    const values = templateExercisesByTemplate.get(exercise.templateId) ?? [];
    values.push(exercise);
    templateExercisesByTemplate.set(exercise.templateId, values);
  }

  const sessionExercisesBySession = new Map<string, WorkoutSessionExercise[]>();
  for (const exercise of sessionExercises) {
    const values = sessionExercisesBySession.get(exercise.sessionId) ?? [];
    values.push(exercise);
    sessionExercisesBySession.set(exercise.sessionId, values);
  }

  const setsBySession = new Map<string, StrengthSet[]>();
  for (const set of sets) {
    const values = setsBySession.get(set.sessionId) ?? [];
    values.push(set);
    setsBySession.set(set.sessionId, values);
  }

  return {
    exercises: exerciseDefinitions
      .filter((exercise) => exercise.source === 'user')
      .map(exerciseAggregate),
    templates: templates.map((template) =>
      templateAggregate(template, templateExercisesByTemplate.get(template.id) ?? []),
    ),
    sessions: sessions.map((session) =>
      sessionAggregate(
        session,
        sessionExercisesBySession.get(session.id) ?? [],
        setsBySession.get(session.id) ?? [],
      ),
    ),
    markers: markers.filter((marker) =>
      STRENGTH_DELETION_TYPES.has(marker.entityType),
    ),
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<StrengthState> {
  const local = await readLocalState(localDatabase);
  const [cloudExerciseRows, cloudTemplateRows, cloudSessionRows, cloudMarkerRows] =
    await Promise.all([
      cloudDatabase.realStrengthExercises.toArray(),
      cloudDatabase.realWorkoutTemplates.toArray(),
      cloudDatabase.realWorkoutSessions.toArray(),
      cloudDatabase.realStrengthDeletionRecords.toArray(),
    ]);

  const cloudExercises = cloudExerciseRows
    .filter((row) => belongsToCurrentUser(row, currentUserId))
    .map(fromCloudRow)
    .filter((row): row is StrengthExerciseAggregate => row !== undefined);
  const cloudTemplates = cloudTemplateRows
    .filter((row) => belongsToCurrentUser(row, currentUserId))
    .map(fromCloudRow)
    .filter((row): row is WorkoutTemplateAggregate => row !== undefined)
    .map((row) => templateAggregate(row.template, row.exercises));
  const cloudSessions = cloudSessionRows
    .filter((row) => belongsToCurrentUser(row, currentUserId))
    .map(fromCloudRow)
    .filter((row): row is WorkoutSessionAggregate => row !== undefined)
    .map((row) => sessionAggregate(row.session, row.exercises, row.sets));
  const cloudMarkers = cloudMarkerRows
    .filter(
      (row) =>
        belongsToCurrentUser(row, currentUserId) &&
        STRENGTH_DELETION_TYPES.has(row.entityType),
    )
    .map(fromCloudRow)
    .filter((row): row is DeletionRecord => row !== undefined);

  return {
    localExercises: local.exercises,
    cloudExercises,
    localTemplates: local.templates,
    cloudTemplates,
    localSessions: local.sessions,
    cloudSessions,
    localMarkers: local.markers,
    cloudMarkers,
  };
}

function buildPreview(state: StrengthState): RealStrengthSyncPreview {
  const localExercises = mapById(state.localExercises);
  const cloudExercises = mapById(state.cloudExercises);
  const localTemplates = mapById(state.localTemplates);
  const cloudTemplates = mapById(state.cloudTemplates);
  const localSessions = mapById(state.localSessions);
  const cloudSessions = mapById(state.cloudSessions);
  const localMarkers = mapById(state.localMarkers);
  const cloudMarkers = mapById(state.cloudMarkers);
  const markers = resolveMarkers(
    state.localMarkers,
    state.cloudMarkers,
    state.localSessions,
    state.cloudSessions,
  );
  let differingEntityCount = 0;
  const countDifferences = <T extends { id: string }>(
    local: ReadonlyMap<string, T>,
    cloud: ReadonlyMap<string, T>,
    normalize?: (value: T) => T,
  ) => {
    const aggregateIds = new Set([...local.keys(), ...cloud.keys()]);
    for (const id of aggregateIds) {
      const left = local.get(id);
      const right = cloud.get(id);
      const normalizedLeft = left && normalize ? normalize(left) : left;
      const normalizedRight = right && normalize ? normalize(right) : right;
      if (!sameEntity(normalizedLeft, normalizedRight)) differingEntityCount += 1;
    }
  };

  countDifferences(localExercises, cloudExercises);
  countDifferences(localTemplates, cloudTemplates);
  countDifferences(
    localSessions,
    cloudSessions,
    (value) => applyMarkersToSession(value, markers),
  );
  countDifferences(localMarkers, cloudMarkers);

  return {
    localCustomExerciseCount: state.localExercises.length,
    cloudCustomExerciseCount: state.cloudExercises.length,
    localTemplateCount: state.localTemplates.length,
    cloudTemplateCount: state.cloudTemplates.length,
    localSessionCount: state.localSessions.length,
    cloudSessionCount: state.cloudSessions.length,
    localDeletionCount: state.localMarkers.filter((marker) => marker.status === 'deleted').length,
    cloudDeletionCount: state.cloudMarkers.filter((marker) => marker.status === 'deleted').length,
    differingEntityCount,
  };
}

async function putCloud<T extends { id: string }>(
  table: Table<T, string>,
  current: T | undefined,
  target: T,
): Promise<boolean> {
  if (current && sameEntity(current, target)) return false;
  await table.put(toCloudRow(target));
  return true;
}

async function applyTemplateAggregate(
  database: AppDatabase,
  aggregate: WorkoutTemplateAggregate,
): Promise<void> {
  await database.transaction(
    'rw',
    [database.workoutTemplates, database.workoutTemplateExercises],
    async () => {
      const existing = await database.workoutTemplateExercises
        .where('templateId')
        .equals(aggregate.id)
        .toArray();
      const targetIds = new Set(aggregate.exercises.map((exercise) => exercise.id));
      const removedIds = existing
        .filter((exercise) => !targetIds.has(exercise.id))
        .map((exercise) => exercise.id);
      await database.workoutTemplates.put(aggregate.template);
      if (removedIds.length > 0) {
        await database.workoutTemplateExercises.bulkDelete(removedIds);
      }
      if (aggregate.exercises.length > 0) {
        await database.workoutTemplateExercises.bulkPut([...aggregate.exercises]);
      }
    },
  );
}

async function applySessionAggregate(
  database: AppDatabase,
  aggregate: WorkoutSessionAggregate,
): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.workoutSessions,
      database.workoutSessionExercises,
      database.strengthSets,
    ],
    async () => {
      const [existingExercises, existingSets] = await Promise.all([
        database.workoutSessionExercises
          .where('sessionId')
          .equals(aggregate.id)
          .toArray(),
        database.strengthSets
          .where('sessionId')
          .equals(aggregate.id)
          .toArray(),
      ]);
      const targetExerciseIds = new Set(aggregate.exercises.map((exercise) => exercise.id));
      const targetSetIds = new Set(aggregate.sets.map((set) => set.id));
      const removedExerciseIds = existingExercises
        .filter((exercise) => !targetExerciseIds.has(exercise.id))
        .map((exercise) => exercise.id);
      const removedSetIds = existingSets
        .filter((set) => !targetSetIds.has(set.id))
        .map((set) => set.id);

      await database.workoutSessions.put(aggregate.session);
      if (removedSetIds.length > 0) await database.strengthSets.bulkDelete(removedSetIds);
      if (removedExerciseIds.length > 0) {
        await database.workoutSessionExercises.bulkDelete(removedExerciseIds);
      }
      if (aggregate.exercises.length > 0) {
        await database.workoutSessionExercises.bulkPut([...aggregate.exercises]);
      }
      if (aggregate.sets.length > 0) {
        await database.strengthSets.bulkPut([...aggregate.sets]);
      }
    },
  );
}

async function applyDeletedMarker(
  database: AppDatabase,
  marker: DeletionRecord,
): Promise<void> {
  if (marker.status !== 'deleted') return;
  if (marker.entityType === 'strengthSet') {
    await database.strengthSets.delete(marker.entityId);
    return;
  }
  if (marker.entityType === 'workoutSessionExercise') {
    const sets = await database.strengthSets
      .where('sessionExerciseId')
      .equals(marker.entityId)
      .toArray();
    if (sets.length > 0) {
      await database.strengthSets.bulkDelete(sets.map((set) => set.id));
    }
    await database.workoutSessionExercises.delete(marker.entityId);
  }
}

export async function previewRealStrengthSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealStrengthSyncPreview> {
  return buildPreview(await readState(localDatabase, cloudDatabase, currentUserId));
}

export async function synchronizeRealStrength(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealStrengthSyncResult> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  const localExercises = mapById(state.localExercises);
  const cloudExercises = mapById(state.cloudExercises);
  const localTemplates = mapById(state.localTemplates);
  const cloudTemplates = mapById(state.cloudTemplates);
  const localSessions = mapById(state.localSessions);
  const cloudSessions = mapById(state.cloudSessions);
  const localMarkers = mapById(state.localMarkers);
  const cloudMarkers = mapById(state.cloudMarkers);
  const resolvedMarkers = resolveMarkers(
    state.localMarkers,
    state.cloudMarkers,
    state.localSessions,
    state.cloudSessions,
  );

  let uploadedExercises = 0;
  let downloadedExercises = 0;
  let uploadedTemplates = 0;
  let downloadedTemplates = 0;
  let uploadedSessions = 0;
  let downloadedSessions = 0;
  let uploadedDeletionRecords = 0;
  let downloadedDeletionRecords = 0;

  for (const marker of resolvedMarkers.values()) {
    const local = localMarkers.get(marker.id);
    const cloud = cloudMarkers.get(marker.id);
    if (!sameEntity(local, marker)) {
      await localDatabase.deletionRecords.put(marker);
      await applyDeletedMarker(localDatabase, marker);
      downloadedDeletionRecords += 1;
    }
    if (
      await putCloud(
        cloudDatabase.realStrengthDeletionRecords as Table<DeletionRecord, string>,
        cloud,
        marker,
      )
    ) {
      uploadedDeletionRecords += 1;
    }
  }

  const exerciseIds = new Set([...localExercises.keys(), ...cloudExercises.keys()]);
  for (const id of exerciseIds) {
    const resolved = chooseLatest(localExercises.get(id), cloudExercises.get(id));
    if (!resolved) continue;
    if (!sameEntity(localExercises.get(id), resolved)) {
      const existing = await localDatabase.exerciseDefinitions.get(id);
      if (!existing || existing.source === 'user') {
        await localDatabase.exerciseDefinitions.put(resolved.exercise);
        downloadedExercises += 1;
      }
    }
    if (
      await putCloud(
        cloudDatabase.realStrengthExercises as Table<StrengthExerciseAggregate, string>,
        cloudExercises.get(id),
        resolved,
      )
    ) uploadedExercises += 1;
  }

  const templateIds = new Set([...localTemplates.keys(), ...cloudTemplates.keys()]);
  for (const id of templateIds) {
    const resolved = chooseLatest(localTemplates.get(id), cloudTemplates.get(id));
    if (!resolved) continue;
    if (!sameEntity(localTemplates.get(id), resolved)) {
      await applyTemplateAggregate(localDatabase, resolved);
      downloadedTemplates += 1;
    }
    if (
      await putCloud(
        cloudDatabase.realWorkoutTemplates as Table<WorkoutTemplateAggregate, string>,
        cloudTemplates.get(id),
        resolved,
      )
    ) uploadedTemplates += 1;
  }

  const sessionIds = new Set([...localSessions.keys(), ...cloudSessions.keys()]);
  for (const id of sessionIds) {
    const chosen = chooseLatest(localSessions.get(id), cloudSessions.get(id));
    if (!chosen) continue;
    const resolved = applyMarkersToSession(chosen, resolvedMarkers);
    const localResolved = localSessions.get(id)
      ? applyMarkersToSession(localSessions.get(id)!, resolvedMarkers)
      : undefined;
    if (!sameEntity(localResolved, resolved)) {
      await applySessionAggregate(localDatabase, resolved);
      downloadedSessions += 1;
    }
    if (
      await putCloud(
        cloudDatabase.realWorkoutSessions as Table<WorkoutSessionAggregate, string>,
        cloudSessions.get(id),
        resolved,
      )
    ) uploadedSessions += 1;
  }

  return {
    ...preview,
    uploadedExercises,
    downloadedExercises,
    uploadedTemplates,
    downloadedTemplates,
    uploadedSessions,
    downloadedSessions,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    completedAt: new Date().toISOString(),
  };
}
