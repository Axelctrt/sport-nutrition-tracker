import {
  calculateExerciseVolume,
  copyPreviousExerciseSets,
  getPreviousExercisePerformance,
  listExerciseHistory,
} from '@/application/strength/strengthHistoryService';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieStrengthSetRepository } from '@/infrastructure/repositories/dexie/DexieStrengthSetRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { createEntity } from '@/shared/utils/entities';
import {
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';
import { createProfileInput } from '@/test/factories/profileFactory';

describe('strengthHistoryService', () => {
  let database: AppDatabase;
  let sessionRepository: DexieWorkoutSessionRepository;
  let setRepository: DexieStrengthSetRepository;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-strength-history-${crypto.randomUUID()}`);
    await database.open();
    sessionRepository = new DexieWorkoutSessionRepository(database);
    setRepository = new DexieStrengthSetRepository(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  async function addCompletedPerformance(
    sessionId: string,
    sessionExerciseId: string,
    date: string,
    completedAt: string,
    weightKg: number,
  ) {
    await database.workoutSessions.add(createEntity(createWorkoutSessionInput({
      date,
      completedAt,
      startedAt: `${date}T17:00:00.000Z`,
    }), sessionId));
    await database.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId,
      exerciseDefinitionId: 'exercise-bench',
    }), sessionExerciseId));
    await database.strengthSets.bulkAdd([
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 1,
        weightKg: 20,
        repetitions: 10,
        type: 'warmup',
      }), `${sessionId}-warmup`),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 2,
        weightKg,
        repetitions: 10,
        type: 'working',
      }), `${sessionId}-working`),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 3,
        weightKg,
        repetitions: 8,
        type: 'working',
        isCompleted: false,
      }), `${sessionId}-unfinished`),
    ]);
  }

  it('liste les performances terminées de la plus récente à la plus ancienne', async () => {
    await addCompletedPerformance('session-old', 'exercise-old', '2026-06-10', '2026-06-10T18:00:00.000Z', 55);
    await addCompletedPerformance('session-latest', 'exercise-latest', '2026-06-20', '2026-06-20T18:00:00.000Z', 60);

    const history = await listExerciseHistory(sessionRepository, setRepository, 'exercise-bench');

    expect(history.map((entry) => entry.session.id)).toEqual(['session-latest', 'session-old']);
    expect(history[0]?.sets).toHaveLength(2);
    expect(history[0]?.workingSets).toHaveLength(1);
    expect(history[0]?.totalVolumeKg).toBe(600);
  });

  it('exclut les séries d’échauffement du volume principal', () => {
    const sets = [
      createEntity(createStrengthSetInput({ type: 'warmup', weightKg: 20, repetitions: 10 }), 'warmup'),
      createEntity(createStrengthSetInput({ type: 'working', weightKg: 60, repetitions: 10 }), 'working'),
      createEntity(createStrengthSetInput({ type: 'working', weightKg: 60, repetitions: 8, isCompleted: false }), 'pending'),
    ];

    expect(calculateExerciseVolume(sets)).toBe(600);
  });

  it('retrouve la dernière performance antérieure à la séance en cours', async () => {
    await addCompletedPerformance('session-old', 'exercise-old', '2026-06-10', '2026-06-10T18:00:00.000Z', 55);
    await addCompletedPerformance('session-latest', 'exercise-latest', '2026-06-20', '2026-06-20T18:00:00.000Z', 60);
    const currentInput = createWorkoutSessionInput({
      date: '2026-06-25',
      status: 'inProgress',
      startedAt: '2026-06-25T17:00:00.000Z',
    });
    delete currentInput.completedAt;
    delete currentInput.durationMinutes;
    await database.workoutSessions.add(createEntity(currentInput, 'session-current'));

    const previous = await getPreviousExercisePerformance(
      sessionRepository,
      setRepository,
      'session-current',
      'exercise-bench',
    );

    expect(previous?.session.id).toBe('session-latest');
  });

  it('reprend les séries terminées de la séance précédente sans les valider', async () => {
    await addCompletedPerformance('session-previous', 'exercise-previous', '2026-06-20', '2026-06-20T18:00:00.000Z', 60);
    const currentInput = createWorkoutSessionInput({
      date: '2026-06-25',
      status: 'inProgress',
      startedAt: '2026-06-25T17:00:00.000Z',
    });
    delete currentInput.completedAt;
    delete currentInput.durationMinutes;
    await database.workoutSessions.add(createEntity(currentInput, 'session-current'));
    await database.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-bench',
    }), 'exercise-current'));

    const copied = await copyPreviousExerciseSets(
      sessionRepository,
      setRepository,
      'session-current',
      'exercise-current',
    );

    expect(copied).toHaveLength(2);
    expect(copied.map((set) => ({ setNumber: set.setNumber, weightKg: set.weightKg, isCompleted: set.isCompleted })))
      .toEqual([
        { setNumber: 1, weightKg: 20, isCompleted: false },
        { setNumber: 2, weightKg: 60, isCompleted: false },
      ]);
    expect(copied.every((set) => set.completedAt === undefined)).toBe(true);
  });

  it('refuse de remplacer des séries déjà saisies', async () => {
    await addCompletedPerformance('session-previous', 'exercise-previous', '2026-06-20', '2026-06-20T18:00:00.000Z', 60);
    const currentInput = createWorkoutSessionInput({
      date: '2026-06-25',
      status: 'inProgress',
      startedAt: '2026-06-25T17:00:00.000Z',
    });
    delete currentInput.completedAt;
    delete currentInput.durationMinutes;
    await database.workoutSessions.add(createEntity(currentInput, 'session-current'));
    await database.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-current',
      exerciseDefinitionId: 'exercise-bench',
    }), 'exercise-current'));
    await setRepository.create(createStrengthSetInput({
      sessionId: 'session-current',
      sessionExerciseId: 'exercise-current',
      isCompleted: false,
    }));

    await expect(copyPreviousExerciseSets(
      sessionRepository,
      setRepository,
      'session-current',
      'exercise-current',
    )).rejects.toThrow(/Supprime les séries/);
  });

  it('utilise le dernier poids connu à la date de séance pour une performance au poids du corps', async () => {
    await database.workoutSessions.add(createEntity(createWorkoutSessionInput({
      date: '2026-06-10',
      completedAt: '2026-06-10T18:00:00.000Z',
    }), 'session-bodyweight'));
    await database.workoutSessionExercises.add(createEntity(createWorkoutSessionExerciseInput({
      sessionId: 'session-bodyweight',
      exerciseDefinitionId: 'exercise-pullup',
      exerciseNameSnapshot: 'Tractions',
      loadUnitSnapshot: 'bodyweight',
      trackingModeSnapshot: 'bodyweightRepetitions',
    }), 'exercise-bodyweight'));
    await database.strengthSets.add(createEntity(createStrengthSetInput({
      sessionId: 'session-bodyweight',
      sessionExerciseId: 'exercise-bodyweight',
      weightKg: 10,
      repetitions: 10,
    }), 'set-bodyweight'));

    const history = await listExerciseHistory(
      sessionRepository,
      setRepository,
      'exercise-pullup',
      {
        weightRepository: {
          listAll: async () => [
            createEntity({ date: '2026-06-01', weightKg: 70 }, 'weight-before'),
            createEntity({ date: '2026-06-15', weightKg: 72 }, 'weight-after'),
          ],
        },
        profileRepository: {
          get: async () => createEntity(
            createProfileInput({ initialWeightKg: 68 }),
            LOCAL_USER_PROFILE_ID,
          ),
        },
      },
    );

    expect(history[0]).toMatchObject({
      bodyWeightKg: 70,
      hasEffectiveLoadData: true,
      totalVolumeKg: 800,
      totalAdditionalVolumeKg: 100,
    });
  });

});
