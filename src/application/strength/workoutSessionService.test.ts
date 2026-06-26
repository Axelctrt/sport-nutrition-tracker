import {
  abandonWorkoutSession,
  addExerciseToWorkoutSession,
  completeWorkoutSession,
  getWorkoutSessionView,
  moveWorkoutSessionExercise,
  removeExerciseFromWorkoutSession,
  startEmptyWorkoutSession,
  startWorkoutSessionFromTemplate,
  updateWorkoutSessionNotes,
} from '@/application/strength/workoutSessionService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthExerciseRepository } from '@/infrastructure/repositories/dexie/DexieStrengthExerciseRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

describe('workoutSessionService', () => {
  let database: AppDatabase;
  let sessionRepository: DexieWorkoutSessionRepository;
  let templateRepository: DexieWorkoutTemplateRepository;
  let exerciseRepository: DexieStrengthExerciseRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-session-service-${crypto.randomUUID()}`);
    await database.open();
    sessionRepository = new DexieWorkoutSessionRepository(database);
    templateRepository = new DexieWorkoutTemplateRepository(database);
    exerciseRepository = new DexieStrengthExerciseRepository(database);
    await database.exerciseDefinitions.bulkAdd([
      createEntity(createExerciseDefinitionInput({ name: 'Développé couché' }), 'exercise-bench'),
      createEntity(createExerciseDefinitionInput({ name: 'Rowing barre', primaryMuscleGroup: 'back' }), 'exercise-row'),
      createEntity(createExerciseDefinitionInput({ name: 'Élévations latérales', primaryMuscleGroup: 'shoulders' }), 'exercise-lateral'),
    ]);
    await database.workoutTemplates.add(createEntity(createWorkoutTemplateInput(), 'template-push'));
    await database.workoutTemplateExercises.bulkAdd([
      createEntity(createWorkoutTemplateExerciseInput({
        templateId: 'template-push',
        exerciseDefinitionId: 'exercise-bench',
        sortOrder: 0,
        exerciseGroupId: 'group-a',
        exerciseGroupType: 'superset',
        exerciseGroupName: 'Push / épaules',
        exerciseGroupRounds: 3,
        exerciseGroupRestBetweenExercisesSeconds: 10,
        exerciseGroupRestBetweenRoundsSeconds: 90,
      }), 'template-exercise-bench'),
      createEntity(createWorkoutTemplateExerciseInput({
        templateId: 'template-push',
        exerciseDefinitionId: 'exercise-lateral',
        sortOrder: 1,
        exerciseGroupId: 'group-a',
        exerciseGroupType: 'superset',
        exerciseGroupName: 'Push / épaules',
        exerciseGroupRounds: 3,
        exerciseGroupRestBetweenExercisesSeconds: 10,
        exerciseGroupRestBetweenRoundsSeconds: 90,
        plannedSets: 3,
        minRepetitions: 12,
        maxRepetitions: 15,
      }), 'template-exercise-lateral'),
    ]);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('démarre une séance depuis un modèle avec des instantanés indépendants', async () => {
    const started = await startWorkoutSessionFromTemplate(
      sessionRepository,
      templateRepository,
      exerciseRepository,
      'template-push',
      new Date('2026-06-25T17:00:00.000Z'),
    );

    expect(started.session).toMatchObject({
      date: '2026-06-25',
      status: 'inProgress',
      sourceTemplateId: 'template-push',
      sourceTemplateNameSnapshot: 'Push A',
    });
    expect(started.exercises.map((exercise) => exercise.exerciseNameSnapshot)).toEqual([
      'Développé couché',
      'Élévations latérales',
    ]);
    expect(started.exercises[0]).toMatchObject({
      exerciseGroupId: 'group-a',
      exerciseGroupType: 'superset',
      exerciseGroupName: 'Push / épaules',
      exerciseGroupRounds: 3,
      exerciseGroupRestBetweenExercisesSeconds: 10,
      exerciseGroupRestBetweenRoundsSeconds: 90,
    });

    await database.exerciseDefinitions.update('exercise-bench', { name: 'Nom modifié' });
    expect((await sessionRepository.listExercises(started.session.id))[0]?.exerciseNameSnapshot).toBe('Développé couché');
  });

  it('reprend une séance en cours et refuse d’en démarrer une seconde', async () => {
    const first = await startEmptyWorkoutSession(sessionRepository, new Date('2026-06-25T17:00:00.000Z'));
    expect((await sessionRepository.getInProgress())?.id).toBe(first.session.id);
    await expect(startEmptyWorkoutSession(sessionRepository)).rejects.toThrow(/déjà en cours/);
  });

  it('ajoute, réordonne et retire des exercices dans une séance libre', async () => {
    const started = await startEmptyWorkoutSession(sessionRepository);
    const bench = await addExerciseToWorkoutSession(sessionRepository, exerciseRepository, started.session.id, 'exercise-bench');
    const row = await addExerciseToWorkoutSession(sessionRepository, exerciseRepository, started.session.id, 'exercise-row');

    const moved = await moveWorkoutSessionExercise(sessionRepository, started.session.id, row.id, -1);
    expect(moved.map((exercise) => exercise.id)).toEqual([row.id, bench.id]);

    const remaining = await removeExerciseFromWorkoutSession(sessionRepository, started.session.id, row.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ id: bench.id, sortOrder: 0 });
  });

  it('enregistre les notes puis termine la séance avec sa durée', async () => {
    const started = await startEmptyWorkoutSession(sessionRepository, new Date('2026-06-25T17:00:00.000Z'));
    await addExerciseToWorkoutSession(sessionRepository, exerciseRepository, started.session.id, 'exercise-bench');
    await updateWorkoutSessionNotes(sessionRepository, started.session.id, 'Bonne séance');
    const completed = await completeWorkoutSession(
      sessionRepository,
      started.session.id,
      new Date('2026-06-25T18:05:00.000Z'),
    );

    expect(completed).toMatchObject({ status: 'completed', durationMinutes: 65, notes: 'Bonne séance' });
    expect(await sessionRepository.getInProgress()).toBeUndefined();
  });

  it('conserve une séance abandonnée dans l’historique', async () => {
    const started = await startEmptyWorkoutSession(sessionRepository, new Date('2026-06-25T17:00:00.000Z'));
    const abandoned = await abandonWorkoutSession(
      sessionRepository,
      started.session.id,
      new Date('2026-06-25T17:12:00.000Z'),
    );
    expect(abandoned).toMatchObject({ status: 'abandoned', durationMinutes: 12 });
    expect((await getWorkoutSessionView(sessionRepository, started.session.id)).session.status).toBe('abandoned');
  });
});
