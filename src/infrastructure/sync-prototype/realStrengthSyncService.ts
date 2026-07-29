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
import { sameLocalCollection } from '@/infrastructure/sync-prototype/localSyncCompareAndSwap';
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
  cloudExerciseRows: readonly CloudOwned<StrengthExerciseAggregate & LogicalSyncFields>[];
  cloudTemplateRows: readonly CloudOwned<WorkoutTemplateAggregate & LogicalSyncFields>[];
  cloudSessionRows: readonly CloudOwned<WorkoutSessionAggregate & LogicalSyncFields>[];
  cloudMarkerRows: readonly CloudOwned<DeletionRecord & LogicalSyncFields>[];
}

interface StrengthLogicalState {
  readonly exercises: readonly StrengthExerciseAggregate[];
  readonly templates: readonly WorkoutTemplateAggregate[];
  readonly sessions: readonly WorkoutSessionAggregate[];
  readonly markers: readonly DeletionRecord[];
}

const STRENGTH_DELETION_TYPES = new Set([
  'strengthSet',
  'workoutSessionExercise',
]);

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
  return {
    ...stripLogicalSyncFields(stripCloudFields(value)),
    id: localId,
  } as T;
}

function mapById<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
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

  const ownedCloudExerciseRows = cloudExerciseRows
    .filter((row) => belongsToCurrentUser(row, currentUserId));
  const ownedCloudTemplateRows = cloudTemplateRows
    .filter((row) => belongsToCurrentUser(row, currentUserId));
  const ownedCloudSessionRows = cloudSessionRows
    .filter((row) => belongsToCurrentUser(row, currentUserId));
  const ownedCloudMarkerRows = cloudMarkerRows
    .filter(
      (row) =>
        belongsToCurrentUser(row, currentUserId) &&
        STRENGTH_DELETION_TYPES.has(row.entityType),
    );
  const cloudExercises = ownedCloudExerciseRows
    .map(fromCloudRow)
    .filter((row): row is StrengthExerciseAggregate => row !== undefined);
  const cloudTemplates = ownedCloudTemplateRows
    .map(fromCloudRow)
    .filter((row): row is WorkoutTemplateAggregate => row !== undefined)
    .map((row) => templateAggregate(row.template, row.exercises));
  const cloudSessions = ownedCloudSessionRows
    .map(fromCloudRow)
    .filter((row): row is WorkoutSessionAggregate => row !== undefined)
    .map((row) => sessionAggregate(row.session, row.exercises, row.sets));
  const cloudMarkers = ownedCloudMarkerRows
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
    cloudExerciseRows: ownedCloudExerciseRows,
    cloudTemplateRows: ownedCloudTemplateRows,
    cloudSessionRows: ownedCloudSessionRows,
    cloudMarkerRows: ownedCloudMarkerRows,
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

function resolveStrengthLogicalState(
  localValue: StrengthLogicalState,
  cloudValue: StrengthLogicalState,
): StrengthLogicalState {
  const resolveEntities = <T extends { id: string; updatedAt: string }>(
    localEntities: readonly T[],
    cloudEntities: readonly T[],
  ) => {
    const localById = mapById(localEntities);
    const cloudById = mapById(cloudEntities);
    const ids = new Set([...localById.keys(), ...cloudById.keys()]);
    return sortById(
      [...ids]
        .map((id) => chooseLatest(localById.get(id), cloudById.get(id)))
        .filter((value): value is T => value !== undefined),
    );
  };

  const markers = resolveMarkers(
    localValue.markers,
    cloudValue.markers,
    localValue.sessions,
    cloudValue.sessions,
  );
  const sessions = resolveEntities(
    localValue.sessions,
    cloudValue.sessions,
  ).map((session) => applyMarkersToSession(session, markers));

  return {
    exercises: resolveEntities(localValue.exercises, cloudValue.exercises),
    templates: resolveEntities(localValue.templates, cloudValue.templates),
    sessions,
    markers: sortById([...markers.values()]),
  };
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
  options: CloudSyncExecutionOptions = {},
): Promise<RealStrengthSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const preview = buildPreview(state);
  const empty: StrengthLogicalState = {
    exercises: [],
    templates: [],
    sessions: [],
    markers: [],
  };
  const localLogical = resolveStrengthLogicalState({
    exercises: state.localExercises,
    templates: state.localTemplates,
    sessions: state.localSessions,
    markers: state.localMarkers,
  }, empty);
  const cloudLogical = resolveStrengthLogicalState(empty, {
    exercises: state.cloudExercises,
    templates: state.cloudTemplates,
    sessions: state.cloudSessions,
    markers: state.cloudMarkers,
  });
  const mergedLogical = resolveStrengthLogicalState(localLogical, cloudLogical);
  const actorId = await resolveSyncActorId(localDatabase);
  const resolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'strength',
    entityId: 'strength',
    actorId,
    localValue: localLogical,
    cloudValue: cloudLogical,
    cloudStamp: maximumLogicalSyncStamp([
      ...state.cloudExerciseRows,
      ...state.cloudTemplateRows,
      ...state.cloudSessionRows,
      ...state.cloudMarkerRows,
    ]),
    legacyResolve: () => mergedLogical,
    concurrentResolve: () => mergedLogical,
  });
  const final = resolution.value;
  const localExercises = mapById(state.localExercises);
  const cloudExercises = mapById(state.cloudExercises);
  const localTemplates = mapById(state.localTemplates);
  const cloudTemplates = mapById(state.cloudTemplates);
  const localSessions = mapById(state.localSessions);
  const cloudSessions = mapById(state.cloudSessions);
  const localMarkers = mapById(state.localMarkers);
  const cloudMarkers = mapById(state.cloudMarkers);
  const countChanged = <T extends { id: string }>(
    current: ReadonlyMap<string, T>,
    target: readonly T[],
  ) => target.filter((value) => !sameEntity(current.get(value.id), value)).length;
  const uploadedExercises = writeCloud
    ? countChanged(cloudExercises, final.exercises)
    : 0;
  const downloadedExercises = countChanged(localExercises, final.exercises);
  const uploadedTemplates = writeCloud
    ? countChanged(cloudTemplates, final.templates)
    : 0;
  const downloadedTemplates = countChanged(localTemplates, final.templates);
  const uploadedSessions = writeCloud
    ? countChanged(cloudSessions, final.sessions)
    : 0;
  const downloadedSessions = countChanged(localSessions, final.sessions);
  const uploadedDeletionRecords = writeCloud
    ? countChanged(cloudMarkers, final.markers)
    : 0;
  const downloadedDeletionRecords = countChanged(localMarkers, final.markers);

  let localStateApplied = false;
  await localDatabase.transaction(
    'rw',
    [
      localDatabase.exerciseDefinitions,
      localDatabase.workoutTemplates,
      localDatabase.workoutTemplateExercises,
      localDatabase.workoutSessions,
      localDatabase.workoutSessionExercises,
      localDatabase.strengthSets,
      localDatabase.deletionRecords,
    ],
    async () => {
      const current = await readLocalState(localDatabase);
      if (
        !sameLocalCollection(current.exercises, state.localExercises)
        || !sameLocalCollection(current.templates, state.localTemplates)
        || !sameLocalCollection(current.sessions, state.localSessions)
        || !sameLocalCollection(current.markers, state.localMarkers)
      ) {
        return;
      }

      const finalExerciseIds = new Set(final.exercises.map((value) => value.id));
      const finalTemplateIds = new Set(final.templates.map((value) => value.id));
      const finalTemplateExerciseIds = new Set(
        final.templates.flatMap((value) => value.exercises.map((item) => item.id)),
      );
      const finalSessionIds = new Set(final.sessions.map((value) => value.id));
      const finalSessionExerciseIds = new Set(
        final.sessions.flatMap((value) => value.exercises.map((item) => item.id)),
      );
      const finalSetIds = new Set(
        final.sessions.flatMap((value) => value.sets.map((item) => item.id)),
      );
      const finalMarkerIds = new Set(final.markers.map((value) => value.id));

      await localDatabase.strengthSets.bulkDelete(
        state.localSessions
          .flatMap((value) => value.sets)
          .filter((value) => !finalSetIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.workoutSessionExercises.bulkDelete(
        state.localSessions
          .flatMap((value) => value.exercises)
          .filter((value) => !finalSessionExerciseIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.workoutSessions.bulkDelete(
        state.localSessions
          .filter((value) => !finalSessionIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.workoutTemplateExercises.bulkDelete(
        state.localTemplates
          .flatMap((value) => value.exercises)
          .filter((value) => !finalTemplateExerciseIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.workoutTemplates.bulkDelete(
        state.localTemplates
          .filter((value) => !finalTemplateIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.exerciseDefinitions.bulkDelete(
        state.localExercises
          .filter((value) => !finalExerciseIds.has(value.id))
          .map((value) => value.id),
      );
      await localDatabase.deletionRecords.bulkDelete(
        state.localMarkers
          .filter((value) => !finalMarkerIds.has(value.id))
          .map((value) => value.id),
      );

      if (final.exercises.length > 0) {
        await localDatabase.exerciseDefinitions.bulkPut(
          final.exercises.map((value) => value.exercise),
        );
      }
      if (final.templates.length > 0) {
        await localDatabase.workoutTemplates.bulkPut(
          final.templates.map((value) => value.template),
        );
        const exercises = final.templates.flatMap((value) => [...value.exercises]);
        if (exercises.length > 0) {
          await localDatabase.workoutTemplateExercises.bulkPut(exercises);
        }
      }
      if (final.sessions.length > 0) {
        await localDatabase.workoutSessions.bulkPut(
          final.sessions.map((value) => value.session),
        );
        const exercises = final.sessions.flatMap((value) => [...value.exercises]);
        const sets = final.sessions.flatMap((value) => [...value.sets]);
        if (exercises.length > 0) {
          await localDatabase.workoutSessionExercises.bulkPut(exercises);
        }
        if (sets.length > 0) await localDatabase.strengthSets.bulkPut(sets);
      }
      if (final.markers.length > 0) {
        await localDatabase.deletionRecords.bulkPut([...final.markers]);
      }
      localStateApplied = true;
    },
  );

  if (writeCloud && localStateApplied) {
    const cloudExerciseRowById = new Map(
      state.cloudExerciseRows.flatMap((row) => {
        const id = localIdFromCloud(row.id);
        return id ? [[id, row] as const] : [];
      }),
    );
    const cloudTemplateRowById = new Map(
      state.cloudTemplateRows.flatMap((row) => {
        const id = localIdFromCloud(row.id);
        return id ? [[id, row] as const] : [];
      }),
    );
    const cloudSessionRowById = new Map(
      state.cloudSessionRows.flatMap((row) => {
        const id = localIdFromCloud(row.id);
        return id ? [[id, row] as const] : [];
      }),
    );
    const cloudMarkerRowById = new Map(
      state.cloudMarkerRows.flatMap((row) => {
        const id = localIdFromCloud(row.id);
        return id ? [[id, row] as const] : [];
      }),
    );

    await cloudDatabase.transaction(
      'rw',
      [
        cloudDatabase.realStrengthExercises,
        cloudDatabase.realWorkoutTemplates,
        cloudDatabase.realWorkoutSessions,
        cloudDatabase.realStrengthDeletionRecords,
      ],
      async () => {
        const deleteMissing = async <T extends { id: string }>(
          current: readonly T[],
          target: readonly T[],
          remove: (id: string) => Promise<unknown>,
        ) => {
          const targetIds = new Set(target.map((value) => value.id));
          for (const value of current) {
            if (!targetIds.has(value.id)) await remove(cloudPrivateId(value.id));
          }
        };
        await deleteMissing(
          state.cloudExercises,
          final.exercises,
          (id) => cloudDatabase.realStrengthExercises.delete(id),
        );
        await deleteMissing(
          state.cloudTemplates,
          final.templates,
          (id) => cloudDatabase.realWorkoutTemplates.delete(id),
        );
        await deleteMissing(
          state.cloudSessions,
          final.sessions,
          (id) => cloudDatabase.realWorkoutSessions.delete(id),
        );
        await deleteMissing(
          state.cloudMarkers,
          final.markers,
          (id) => cloudDatabase.realStrengthDeletionRecords.delete(id),
        );

        for (const value of final.exercises) {
          await upsertLogicalCloudValue(
            cloudDatabase.realStrengthExercises,
            cloudExercises.get(value.id),
            cloudExerciseRowById.get(value.id),
            value,
            resolution.stamp,
            (target) => toCloudRow(target),
          );
        }
        for (const value of final.templates) {
          await upsertLogicalCloudValue(
            cloudDatabase.realWorkoutTemplates,
            cloudTemplates.get(value.id),
            cloudTemplateRowById.get(value.id),
            value,
            resolution.stamp,
            (target) => toCloudRow(target),
          );
        }
        for (const value of final.sessions) {
          await upsertLogicalCloudValue(
            cloudDatabase.realWorkoutSessions,
            cloudSessions.get(value.id),
            cloudSessionRowById.get(value.id),
            value,
            resolution.stamp,
            (target) => toCloudRow(target),
          );
        }
        for (const value of final.markers) {
          await upsertLogicalCloudValue(
            cloudDatabase.realStrengthDeletionRecords,
            cloudMarkers.get(value.id),
            cloudMarkerRowById.get(value.id),
            value,
            resolution.stamp,
            (target) => toCloudRow(target),
          );
        }
      },
    );
    await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
  }

  return {
    ...preview,
    uploadedExercises: localStateApplied ? uploadedExercises : 0,
    downloadedExercises: localStateApplied ? downloadedExercises : 0,
    uploadedTemplates: localStateApplied ? uploadedTemplates : 0,
    downloadedTemplates: localStateApplied ? downloadedTemplates : 0,
    uploadedSessions: localStateApplied ? uploadedSessions : 0,
    downloadedSessions: localStateApplied ? downloadedSessions : 0,
    uploadedDeletionRecords: localStateApplied ? uploadedDeletionRecords : 0,
    downloadedDeletionRecords: localStateApplied ? downloadedDeletionRecords : 0,
    completedAt: new Date().toISOString(),
  };
}
