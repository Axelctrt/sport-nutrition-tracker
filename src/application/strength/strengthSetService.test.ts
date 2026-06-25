import {
  addStrengthSet,
  deleteStrengthSet,
  duplicateStrengthSet,
  setStrengthSetCompletion,
  updateStrengthSet,
} from '@/application/strength/strengthSetService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthSetRepository } from '@/infrastructure/repositories/dexie/DexieStrengthSetRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { createEntity } from '@/shared/utils/entities';
import {
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

describe('strengthSetService', () => {
  let database: AppDatabase;
  let sessionRepository: DexieWorkoutSessionRepository;
  let setRepository: DexieStrengthSetRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-strength-set-service-${crypto.randomUUID()}`);
    await database.open();
    sessionRepository = new DexieWorkoutSessionRepository(database);
    setRepository = new DexieStrengthSetRepository(database);
    const sessionInput = createWorkoutSessionInput({ status: 'inProgress' });
    delete sessionInput.completedAt;
    delete sessionInput.durationMinutes;
    await database.workoutSessions.add(createEntity(sessionInput, 'session-1'));
    await database.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-1',
      minRepetitions: 8,
      targetLoadKg: 60,
    }), 'session-exercise-1'));
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('ajoute une première série avec les objectifs de l’exercice', async () => {
    const created = await addStrengthSet(
      sessionRepository,
      setRepository,
      'session-1',
      'session-exercise-1',
    );

    expect(created).toMatchObject({
      setNumber: 1,
      repetitions: 8,
      weightKg: 60,
      type: 'working',
      isCompleted: false,
    });
  });

  it('enregistre puis valide une série avec son RPE', async () => {
    const setInput = createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      isCompleted: false,
    });
    delete setInput.completedAt;
    const set = await setRepository.create(setInput);

    await updateStrengthSet(
      sessionRepository,
      setRepository,
      'session-1',
      'session-exercise-1',
      set.id,
      { repetitions: 10, weightKg: 62.5, rpe: 8.5, type: 'working', notes: 'Propre' },
    );
    const completed = await setStrengthSetCompletion(
      sessionRepository,
      setRepository,
      'session-1',
      'session-exercise-1',
      set.id,
      { repetitions: 10, weightKg: 62.5, rpe: 8.5, type: 'working', notes: 'Propre' },
      true,
      new Date('2026-06-25T17:20:00.000Z'),
    );

    expect(completed).toMatchObject({
      repetitions: 10,
      weightKg: 62.5,
      rpe: 8.5,
      isCompleted: true,
      completedAt: '2026-06-25T17:20:00.000Z',
      notes: 'Propre',
    });
  });

  it('duplique une série sans la marquer comme terminée', async () => {
    const source = await setRepository.create(createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber: 1,
      repetitions: 12,
      weightKg: 60,
      rpe: 8,
      isCompleted: true,
    }));

    const duplicate = await duplicateStrengthSet(
      sessionRepository,
      setRepository,
      'session-1',
      'session-exercise-1',
      source.id,
    );

    expect(duplicate).toMatchObject({
      setNumber: 2,
      repetitions: 12,
      weightKg: 60,
      rpe: 8,
      isCompleted: false,
    });
    expect(duplicate.completedAt).toBeUndefined();
  });

  it('supprime une série et renumérote les suivantes', async () => {
    const first = await setRepository.create(createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber: 1,
    }));
    const second = await setRepository.create(createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber: 2,
    }));

    const remaining = await deleteStrengthSet(
      sessionRepository,
      setRepository,
      'session-1',
      'session-exercise-1',
      first.id,
    );

    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ id: second.id, setNumber: 1 });
  });

  it('refuse de modifier les séries d’une séance terminée', async () => {
    await database.workoutSessions.update('session-1', { status: 'completed' });
    await expect(addStrengthSet(
      sessionRepository,
      setRepository,
      'session-1',
      'session-exercise-1',
    )).rejects.toThrow(/terminée/);
  });
});
