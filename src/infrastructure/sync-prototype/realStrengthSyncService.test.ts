import Dexie, { type Table } from 'dexie';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealStrengthSync,
  synchronizeRealStrength,
  type StrengthExerciseAggregate,
  type WorkoutSessionAggregate,
  type WorkoutTemplateAggregate,
} from '@/infrastructure/sync-prototype/realStrengthSyncService';

type CloudMetadata = {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};

type CloudExercise = StrengthExerciseAggregate & CloudMetadata;
type CloudTemplate = WorkoutTemplateAggregate & CloudMetadata;
type CloudSession = WorkoutSessionAggregate & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realStrengthExercises: Table<CloudExercise, string>;
  declare realWorkoutTemplates: Table<CloudTemplate, string>;
  declare realWorkoutSessions: Table<CloudSession, string>;
  declare realStrengthDeletionRecords: Table<CloudMarker, string>;

  constructor() {
    super(`sportpilot-b3-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realStrengthExercises: 'id, updatedAt',
      realWorkoutTemplates: 'id, updatedAt',
      realWorkoutSessions: 'id, updatedAt',
      realStrengthDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

const CREATED_AT = '2026-07-01T08:00:00.000Z';

function customExercise(
  id: string,
  updatedAt = '2026-07-01T09:00:00.000Z',
  name = 'Développé incliné personnalisé',
): ExerciseDefinition {
  return {
    id,
    name,
    primaryMuscleGroup: 'pectorals',
    secondaryMuscleGroups: ['triceps'],
    equipment: 'dumbbells',
    category: 'strength',
    movementType: 'compound',
    loadUnit: 'kg',
    source: 'user',
    isArchived: false,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function catalogExercise(id: string): ExerciseDefinition {
  return {
    ...customExercise(id),
    name: 'Développé couché catalogue',
    source: 'catalog',
  };
}

function template(
  id: string,
  updatedAt = '2026-07-01T09:00:00.000Z',
  name = 'Push B3',
): WorkoutTemplate {
  return {
    id,
    name,
    isArchived: false,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function templateExercise(
  id: string,
  templateId: string,
  exerciseDefinitionId: string,
  updatedAt = '2026-07-01T09:00:00.000Z',
  sortOrder = 0,
): WorkoutTemplateExercise {
  return {
    id,
    templateId,
    exerciseDefinitionId,
    sortOrder,
    plannedSets: 3,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 30,
    loadIncrementKg: 2,
    restSeconds: 90,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function session(
  id: string,
  updatedAt = '2026-07-01T09:00:00.000Z',
): WorkoutSession {
  return {
    id,
    date: '2026-07-01',
    status: 'completed',
    startedAt: '2026-07-01T17:00:00.000Z',
    completedAt: '2026-07-01T18:00:00.000Z',
    durationMinutes: 60,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function sessionExercise(
  id: string,
  sessionId: string,
  exerciseDefinitionId: string,
  updatedAt = '2026-07-01T09:00:00.000Z',
): WorkoutSessionExercise {
  return {
    id,
    sessionId,
    exerciseDefinitionId,
    exerciseNameSnapshot: 'Développé incliné personnalisé',
    sortOrder: 0,
    plannedSets: 3,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 30,
    loadIncrementKg: 2,
    restSeconds: 90,
    loadUnitSnapshot: 'kg',
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function strengthSet(
  id: string,
  sessionId: string,
  sessionExerciseId: string,
  updatedAt = '2026-07-01T09:00:00.000Z',
  repetitions = 10,
): StrengthSet {
  return {
    id,
    sessionId,
    sessionExerciseId,
    setNumber: 1,
    repetitions,
    weightKg: 30,
    type: 'working',
    isCompleted: true,
    completedAt: updatedAt,
    createdAt: CREATED_AT,
    updatedAt,
  };
}

function exerciseAggregate(value: ExerciseDefinition): StrengthExerciseAggregate {
  return { id: value.id, exercise: value, updatedAt: value.updatedAt };
}

function templateAggregate(
  value: WorkoutTemplate,
  exercises: WorkoutTemplateExercise[],
): WorkoutTemplateAggregate {
  const updatedAt = [value, ...exercises]
    .map((entity) => entity.updatedAt)
    .sort()
    .at(-1)!;
  return { id: value.id, template: value, exercises, updatedAt };
}

function sessionAggregate(
  value: WorkoutSession,
  exercises: WorkoutSessionExercise[],
  sets: StrengthSet[],
): WorkoutSessionAggregate {
  const updatedAt = [value, ...exercises, ...sets]
    .map((entity) => entity.updatedAt)
    .sort()
    .at(-1)!;
  return { id: value.id, session: value, exercises, sets, updatedAt };
}

describe('synchronisation B3 de la musculation', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-b3-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie les exercices personnalisés, modèles et séances une seule fois', async () => {
    const exercise = customExercise('exercise-1');
    const model = template('template-1');
    const modelExercise = templateExercise('template-exercise-1', model.id, exercise.id);
    const workout = session('session-1');
    const workoutExercise = sessionExercise('session-exercise-1', workout.id, exercise.id);
    const set = strengthSet('set-1', workout.id, workoutExercise.id);

    await local.exerciseDefinitions.bulkAdd([catalogExercise('catalog-1'), exercise]);
    await local.workoutTemplates.add(model);
    await local.workoutTemplateExercises.add(modelExercise);
    await local.workoutSessions.add(workout);
    await local.workoutSessionExercises.add(workoutExercise);
    await local.strengthSets.add(set);

    const first = await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first).toMatchObject({
      uploadedExercises: 1,
      uploadedTemplates: 1,
      uploadedSessions: 1,
    });
    expect(second).toMatchObject({
      uploadedExercises: 0,
      uploadedTemplates: 0,
      uploadedSessions: 0,
      differingEntityCount: 0,
    });
    expect(await cloud.realStrengthExercises.count()).toBe(1);
    expect(await cloud.realWorkoutTemplates.count()).toBe(1);
    expect(await cloud.realWorkoutSessions.count()).toBe(1);
  });

  it('ignore les métadonnées techniques Dexie Cloud', async () => {
    const exercise = customExercise('exercise-metadata');
    await local.exerciseDefinitions.add(exercise);
    await cloud.realStrengthExercises.add({
      ...exerciseAggregate(exercise),
      id: `#${exercise.id}`,
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 1_751_360_400_000,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
  });

  it('télécharge une séance complète sans laisser de série orpheline', async () => {
    const exercise = customExercise('exercise-cloud');
    const workout = session('session-cloud', '2026-07-01T10:00:00.000Z');
    const workoutExercise = sessionExercise(
      'session-exercise-cloud',
      workout.id,
      exercise.id,
      '2026-07-01T10:00:00.000Z',
    );
    const set = strengthSet(
      'set-cloud',
      workout.id,
      workoutExercise.id,
      '2026-07-01T10:00:00.000Z',
    );
    await cloud.realStrengthExercises.add({
      ...exerciseAggregate(exercise),
      id: `#${exercise.id}`,
      owner: 'user-1',
    });
    await cloud.realWorkoutSessions.add({
      ...sessionAggregate(workout, [workoutExercise], [set]),
      id: `#${workout.id}`,
      owner: 'user-1',
    });

    const result = await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedExercises).toBe(1);
    expect(result.downloadedSessions).toBe(1);
    expect(await local.workoutSessions.get(workout.id)).toEqual(workout);
    expect(await local.workoutSessionExercises.get(workoutExercise.id)).toEqual(workoutExercise);
    expect(await local.strengthSets.get(set.id)).toEqual(set);
    expect(
      (await local.strengthSets.toArray()).every((row) =>
        row.sessionExerciseId === workoutExercise.id,
      ),
    ).toBe(true);
  });

  it('remplace atomiquement les exercices d’un modèle plus récent', async () => {
    const firstExercise = customExercise('exercise-a');
    const secondExercise = customExercise('exercise-b');
    const localTemplate = template('template-atomic', '2026-07-01T09:00:00.000Z');
    const localChild = templateExercise(
      'template-child-a',
      localTemplate.id,
      firstExercise.id,
      '2026-07-01T09:00:00.000Z',
    );
    const cloudTemplate = template(
      localTemplate.id,
      '2026-07-01T11:00:00.000Z',
      'Pull distant',
    );
    const cloudChild = templateExercise(
      'template-child-b',
      cloudTemplate.id,
      secondExercise.id,
      '2026-07-01T11:00:00.000Z',
    );
    await local.exerciseDefinitions.bulkAdd([firstExercise, secondExercise]);
    await local.workoutTemplates.add(localTemplate);
    await local.workoutTemplateExercises.add(localChild);
    await cloud.realWorkoutTemplates.add({
      ...templateAggregate(cloudTemplate, [cloudChild]),
      id: `#${cloudTemplate.id}`,
      owner: 'user-1',
    });

    await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.workoutTemplates.get(localTemplate.id)).toMatchObject({
      name: 'Pull distant',
    });
    expect(
      await local.workoutTemplateExercises
        .where('templateId')
        .equals(localTemplate.id)
        .toArray(),
    ).toEqual([cloudChild]);
  });

  it('propage la suppression d’une série sans la faire réapparaître', async () => {
    const exercise = customExercise('exercise-delete-set');
    const workout = session('session-delete-set');
    const workoutExercise = sessionExercise(
      'session-exercise-delete-set',
      workout.id,
      exercise.id,
    );
    const set = strengthSet('set-delete', workout.id, workoutExercise.id);
    const aggregate = sessionAggregate(workout, [workoutExercise], [set]);
    await local.exerciseDefinitions.add(exercise);
    await local.workoutSessions.add(workout);
    await local.workoutSessionExercises.add(workoutExercise);
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'strengthSet', entityId: set.id },
        '2026-07-01T12:00:00.000Z',
      ),
    );
    await cloud.realWorkoutSessions.add({
      ...aggregate,
      id: `#${aggregate.id}`,
      owner: 'user-1',
    });

    const first = await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedDeletionRecords).toBe(1);
    expect(await local.strengthSets.get(set.id)).toBeUndefined();
    expect((await cloud.realWorkoutSessions.get(`#${workout.id}`))?.sets).toEqual([]);
    expect(second.differingEntityCount).toBe(0);
  });

  it('supprime un exercice de séance et toutes ses séries comme un ensemble', async () => {
    const exercise = customExercise('exercise-delete-row');
    const workout = session('session-delete-row');
    const workoutExercise = sessionExercise(
      'session-exercise-delete-row',
      workout.id,
      exercise.id,
    );
    const set = strengthSet('set-delete-row', workout.id, workoutExercise.id);
    await local.workoutSessions.add(workout);
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        {
          entityType: 'workoutSessionExercise',
          entityId: workoutExercise.id,
        },
        '2026-07-01T12:00:00.000Z',
      ),
    );
    const aggregate = sessionAggregate(workout, [workoutExercise], [set]);
    await cloud.realWorkoutSessions.add({
      ...aggregate,
      id: `#${aggregate.id}`,
      owner: 'user-1',
    });

    await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    const cloudSession = await cloud.realWorkoutSessions.get(`#${workout.id}`);
    expect(cloudSession?.exercises).toEqual([]);
    expect(cloudSession?.sets).toEqual([]);
    expect(await local.workoutSessionExercises.get(workoutExercise.id)).toBeUndefined();
    expect(await local.strengthSets.get(set.id)).toBeUndefined();
  });

  it('restaure une série plus récente qu’un ancien marqueur de suppression', async () => {
    const workout = session('session-restore');
    const workoutExercise = sessionExercise(
      'session-exercise-restore',
      workout.id,
      'exercise-restore',
    );
    const set = strengthSet(
      'set-restore',
      workout.id,
      workoutExercise.id,
      '2026-07-01T12:00:00.000Z',
    );
    await local.workoutSessions.add(workout);
    await local.workoutSessionExercises.add(workoutExercise);
    await local.strengthSets.add(set);
    const marker = createDeletedDeletionRecord(
      { entityType: 'strengthSet', entityId: set.id },
      '2026-07-01T10:00:00.000Z',
    );
    await cloud.realStrengthDeletionRecords.add({
      ...marker,
      id: `#${marker.id}`,
      owner: 'user-1',
    });

    await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.deletionRecords.get(marker.id)).toMatchObject({
      status: 'restored',
    });
    expect(await cloud.realWorkoutSessions.get(`#${workout.id}`)).toBeDefined();
  });

  it('ignore strictement les agrégats d’un autre compte', async () => {
    const exercise = customExercise('exercise-other-account');
    await cloud.realStrengthExercises.add({
      ...exerciseAggregate(exercise),
      id: `#${exercise.id}`,
      owner: 'user-2',
    });

    const result = await synchronizeRealStrength(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedExercises).toBe(0);
    expect(await local.exerciseDefinitions.get(exercise.id)).toBeUndefined();
    expect(await cloud.realStrengthExercises.count()).toBe(1);
  });

  it('analyse les écarts sans écrire dans le cloud', async () => {
    const exercise = customExercise('exercise-preview');
    await local.exerciseDefinitions.add(exercise);

    const preview = await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview).toMatchObject({
      localCustomExerciseCount: 1,
      cloudCustomExerciseCount: 0,
      differingEntityCount: 1,
    });
    expect(await cloud.realStrengthExercises.count()).toBe(0);
  });
});
