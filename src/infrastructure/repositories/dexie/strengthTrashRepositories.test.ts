import type {
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthSetRepository } from '@/infrastructure/repositories/dexie/DexieStrengthSetRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { restoreTrashItem } from '@/infrastructure/repositories/dexie/trashService';

describe('corbeille des données de musculation', () => {
  let database: AppDatabase;
  let setRepository: DexieStrengthSetRepository;
  let sessionRepository: DexieWorkoutSessionRepository;

  beforeEach(async () => {
    database = new AppDatabase(
      `sportpilot-strength-trash-${crypto.randomUUID()}`,
    );
    await database.open();

    setRepository = new DexieStrengthSetRepository(database);
    sessionRepository = new DexieWorkoutSessionRepository(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('supprime, renumérote puis restaure une série à sa position', async () => {
    const session = {
      id: 'session-set-trash',
      date: '2026-06-28',
      status: 'completed',
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T09:00:00.000Z',
    } satisfies WorkoutSession;
    const exercise = {
      id: 'session-exercise-set-trash',
      sessionId: session.id,
      exerciseDefinitionId: 'exercise-bench',
      exerciseNameSnapshot: 'Développé couché',
      sortOrder: 0,
      loadUnitSnapshot: 'kg',
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T09:00:00.000Z',
    } satisfies WorkoutSessionExercise;
    const sets = [1, 2, 3].map(
      (setNumber) =>
        ({
          id: `strength-set-${setNumber}`,
          sessionId: session.id,
          sessionExerciseId: exercise.id,
          setNumber,
          repetitions: 10,
          weightKg: 60,
          type: 'working',
          isCompleted: true,
          createdAt: '2026-06-28T08:10:00.000Z',
          updatedAt: '2026-06-28T08:20:00.000Z',
        }) satisfies StrengthSet,
    );

    await database.workoutSessions.add(session);
    await database.workoutSessionExercises.add(exercise);
    await database.strengthSets.bulkAdd(sets);

    const remaining = await setRepository.deleteAndRenumber(
      exercise.id,
      sets[1]!.id,
    );

    expect(remaining.map((set) => set.setNumber)).toEqual([1, 2]);
    expect(
      await database.strengthSets.get(sets[1]!.id),
    ).toBeUndefined();

    const trashItem = await database.trashItems
      .where('entityType')
      .equals('strengthSet')
      .first();

    expect(trashItem).toBeDefined();
    await restoreTrashItem(database, trashItem!.id);

    const restored = (
      await database.strengthSets
        .where('sessionExerciseId')
        .equals(exercise.id)
        .toArray()
    ).sort((left, right) => left.setNumber - right.setNumber);

    expect(restored.map((set) => set.id)).toEqual([
      sets[0]!.id,
      sets[1]!.id,
      sets[2]!.id,
    ]);
    expect(restored.map((set) => set.setNumber)).toEqual([1, 2, 3]);
  });

  it('restaure un exercice de séance avec toutes ses séries', async () => {
    const session = {
      id: 'session-exercise-trash',
      date: '2026-06-29',
      status: 'completed',
      createdAt: '2026-06-29T08:00:00.000Z',
      updatedAt: '2026-06-29T09:00:00.000Z',
    } satisfies WorkoutSession;
    const exercise = {
      id: 'session-exercise-trash-item',
      sessionId: session.id,
      exerciseDefinitionId: 'exercise-row',
      exerciseNameSnapshot: 'Rowing',
      sortOrder: 0,
      loadUnitSnapshot: 'kg',
      createdAt: '2026-06-29T08:00:00.000Z',
      updatedAt: '2026-06-29T09:00:00.000Z',
    } satisfies WorkoutSessionExercise;
    const set = {
      id: 'strength-set-exercise-trash',
      sessionId: session.id,
      sessionExerciseId: exercise.id,
      setNumber: 1,
      repetitions: 12,
      weightKg: 50,
      type: 'working',
      isCompleted: true,
      createdAt: '2026-06-29T08:10:00.000Z',
      updatedAt: '2026-06-29T08:20:00.000Z',
    } satisfies StrengthSet;

    await database.workoutSessions.add(session);
    await database.workoutSessionExercises.add(exercise);
    await database.strengthSets.add(set);

    await sessionRepository.removeExercise(session.id, exercise.id);

    expect(
      await database.workoutSessionExercises.get(exercise.id),
    ).toBeUndefined();
    expect(await database.strengthSets.get(set.id)).toBeUndefined();

    const trashItem = await database.trashItems
      .where('entityType')
      .equals('workoutSessionExercise')
      .first();

    expect(trashItem).toBeDefined();
    await restoreTrashItem(database, trashItem!.id);

    expect(
      await database.workoutSessionExercises.get(exercise.id),
    ).toEqual(exercise);
    expect(await database.strengthSets.get(set.id)).toEqual(set);
  });

  it('refuse de restaurer une série si son exercice n’existe plus', async () => {
    const session = {
      id: 'session-parent-conflict',
      date: '2026-06-30',
      status: 'completed',
      createdAt: '2026-06-30T08:00:00.000Z',
      updatedAt: '2026-06-30T09:00:00.000Z',
    } satisfies WorkoutSession;
    const exercise = {
      id: 'exercise-parent-conflict',
      sessionId: session.id,
      exerciseDefinitionId: 'exercise-squat',
      exerciseNameSnapshot: 'Squat',
      sortOrder: 0,
      loadUnitSnapshot: 'kg',
      createdAt: '2026-06-30T08:00:00.000Z',
      updatedAt: '2026-06-30T09:00:00.000Z',
    } satisfies WorkoutSessionExercise;
    const set = {
      id: 'set-parent-conflict',
      sessionId: session.id,
      sessionExerciseId: exercise.id,
      setNumber: 1,
      repetitions: 8,
      weightKg: 80,
      type: 'working',
      isCompleted: true,
      createdAt: '2026-06-30T08:10:00.000Z',
      updatedAt: '2026-06-30T08:20:00.000Z',
    } satisfies StrengthSet;

    await database.workoutSessions.add(session);
    await database.workoutSessionExercises.add(exercise);
    await database.strengthSets.add(set);

    await setRepository.deleteAndRenumber(exercise.id, set.id);
    await database.workoutSessionExercises.delete(exercise.id);

    const trashItem = await database.trashItems
      .where('entityType')
      .equals('strengthSet')
      .first();

    await expect(
      restoreTrashItem(database, trashItem!.id),
    ).rejects.toThrow('L’exercice associé n’existe plus');

    expect(await database.trashItems.get(trashItem!.id)).toBeDefined();
  });
});
