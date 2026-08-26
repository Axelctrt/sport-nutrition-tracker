import { describe, expect, it, vi } from 'vitest';
import {
  calculateStrengthPerformance,
  type StrengthPerformanceServiceDependencies,
} from '@/application/coach/strengthPerformanceService';
import type {
  ExerciseDefinition,
  StrengthSet,
  StrengthTrackingMode,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import type { WeightEntry } from '@/domain/models/weight';
import { loadUnitForTrackingMode } from '@/domain/strength/strengthTracking';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

interface Fixture {
  sessions: WorkoutSession[];
  exercisesBySession: Record<string, WorkoutSessionExercise[]>;
  setsBySession: Record<string, StrengthSet[]>;
  definitions: ExerciseDefinition[];
  weights?: WeightEntry[];
}

function completedSession(
  number: number,
  repetitions: number,
  mode: StrengthTrackingMode = 'loadRepetitions',
): {
  session: WorkoutSession;
  exercise: WorkoutSessionExercise;
  set: StrengthSet;
} {
  const sessionId = `session-${number}`;
  const sessionExerciseId = `session-exercise-${number}`;
  const date = `2026-08-${String(number).padStart(2, '0')}`;
  const session = createEntity(createWorkoutSessionInput({
    date,
    status: 'completed',
    completedAt: `${date}T18:00:00.000Z`,
  }), sessionId);
  const exercise = createEntity(createWorkoutSessionExerciseInput({
    sessionId,
    exerciseDefinitionId: 'exercise-1',
    trackingModeSnapshot: mode,
    loadUnitSnapshot: loadUnitForTrackingMode(mode),
  }), sessionExerciseId);
  const set = createEntity(createStrengthSetInput({
    sessionId,
    sessionExerciseId,
    repetitions,
    weightKg: 60,
    isCompleted: true,
  }), `set-${number}`);
  return { session, exercise, set };
}

function dependencies(fixture: Fixture): StrengthPerformanceServiceDependencies & {
  workoutSessions: {
    listAll: ReturnType<typeof vi.fn>;
    listExercises: ReturnType<typeof vi.fn>;
  };
  strengthSets: { listBySession: ReturnType<typeof vi.fn> };
  strengthExercises: { listAll: ReturnType<typeof vi.fn> };
  weight: { listAll: ReturnType<typeof vi.fn> };
} {
  return {
    workoutSessions: {
      listAll: vi.fn(async () => fixture.sessions),
      listExercises: vi.fn(async (sessionId: string) => (
        fixture.exercisesBySession[sessionId] ?? []
      )),
    },
    strengthSets: {
      listBySession: vi.fn(async (sessionId: string) => (
        fixture.setsBySession[sessionId] ?? []
      )),
    },
    strengthExercises: {
      listAll: vi.fn(async () => fixture.definitions),
    },
    weight: {
      listAll: vi.fn(async () => fixture.weights ?? []),
    },
  };
}

function fixture(
  mode: StrengthTrackingMode = 'loadRepetitions',
  weights: WeightEntry[] = [],
): Fixture {
  const first = completedSession(1, 10, mode);
  const second = completedSession(2, 11, mode);
  return {
    sessions: [second.session, first.session],
    exercisesBySession: {
      [first.session.id]: [first.exercise],
      [second.session.id]: [second.exercise],
    },
    setsBySession: {
      [first.session.id]: [first.set],
      [second.session.id]: [second.set],
    },
    definitions: [createEntity(createExerciseDefinitionInput({
      trackingMode: mode,
      loadUnit: loadUnitForTrackingMode(mode),
    }), 'exercise-1')],
    weights,
  };
}

describe('calculateStrengthPerformance', () => {
  it('lit les repositories nécessaires et reste déterministe malgré leur ordre', async () => {
    const source = fixture();
    const future = completedSession(26, 20);
    source.sessions.push(future.session);
    source.exercisesBySession[future.session.id] = [future.exercise];
    source.setsBySession[future.session.id] = [future.set];
    const reversed: Fixture = {
      ...source,
      sessions: [...source.sessions].reverse(),
      exercisesBySession: Object.fromEntries(Object.entries(source.exercisesBySession)
        .reverse()
        .map(([sessionId, exercises]) => [sessionId, [...exercises].reverse()])),
      setsBySession: Object.fromEntries(Object.entries(source.setsBySession)
        .reverse()
        .map(([sessionId, sets]) => [sessionId, [...sets].reverse()])),
      definitions: [...source.definitions].reverse(),
    };
    const deps = dependencies(source);
    const reversedDeps = dependencies(reversed);

    const first = await calculateStrengthPerformance('2026-08-25', deps);
    const second = await calculateStrengthPerformance('2026-08-25', reversedDeps);

    expect(first).toStrictEqual(second);
    expect(first.exercises[0]).toMatchObject({
      exerciseDefinitionId: 'exercise-1',
      trend: 'progressing',
      exposureCount: 2,
    });
    expect(first.exercises[0]!.exposures.map(({ sessionId }) => sessionId)).toEqual([
      'session-1',
      'session-2',
    ]);
    expect(deps.workoutSessions.listAll).toHaveBeenCalledOnce();
    expect(deps.workoutSessions.listExercises).toHaveBeenCalledWith('session-1');
    expect(deps.workoutSessions.listExercises).toHaveBeenCalledWith('session-2');
    expect(deps.workoutSessions.listExercises).toHaveBeenCalledWith('session-26');
    expect(deps.strengthSets.listBySession).toHaveBeenCalledWith('session-1');
    expect(deps.strengthSets.listBySession).toHaveBeenCalledWith('session-2');
    expect(deps.strengthSets.listBySession).toHaveBeenCalledWith('session-26');
    expect(deps.strengthExercises.listAll).toHaveBeenCalledOnce();
    expect(deps.weight.listAll).not.toHaveBeenCalled();
  });

  it('n’expose que des méthodes de lecture et aucune persistence Coach', () => {
    const deps = dependencies(fixture());
    expect(Object.keys(deps.workoutSessions).sort()).toEqual(['listAll', 'listExercises']);
    expect(Object.keys(deps.strengthSets)).toEqual(['listBySession']);
    expect(Object.keys(deps.strengthExercises)).toEqual(['listAll']);
    expect(Object.keys(deps.weight)).toEqual(['listAll']);
    expect(Object.keys(deps)).not.toContain('dailyCoaching');
    expect(Object.keys(deps)).not.toContain('coach');
  });

  it('autorise une tendance corporelle uniquement avec userMeasurement', async () => {
    const confirmed = createEntity<WeightEntry>({
      date: '2026-08-01',
      weightKg: 70,
      provenance: 'userMeasurement' as const,
    }, 'weight-confirmed');
    const initialized = createEntity<WeightEntry>({
      date: '2026-08-01',
      weightKg: 70,
      provenance: 'profileInitialization' as const,
    }, 'weight-initialized');

    const confirmedDeps = dependencies(fixture('bodyweightRepetitions', [confirmed]));
    await expect(calculateStrengthPerformance('2026-08-25', confirmedDeps)).resolves
      .toMatchObject({ exercises: [{ trend: 'progressing' }] });
    expect(confirmedDeps.weight.listAll).toHaveBeenCalledOnce();

    const initializedDeps = dependencies(fixture('bodyweightRepetitions', [initialized]));
    await expect(calculateStrengthPerformance('2026-08-25', initializedDeps)).resolves
      .toMatchObject({ exercises: [{ trend: 'insufficientData' }] });
  });

  it('n’utilise pas une pesée future et qualifie le legacy sans laundering', async () => {
    const legacy = createEntity<WeightEntry>({
      date: '2026-08-01',
      weightKg: 70,
    }, 'weight-legacy');
    const future = createEntity<WeightEntry>({
      date: '2026-08-03',
      weightKg: 70,
      provenance: 'userMeasurement' as const,
    }, 'weight-future');
    const deps = dependencies(fixture('assistedRepetitions', [future, legacy]));

    const snapshot = await calculateStrengthPerformance('2026-08-25', deps);

    expect(snapshot.exercises[0]!.trend).toBe('insufficientData');
    expect(snapshot.exercises[0]!.exposures.map(({ bodyWeightProvenance }) => (
      bodyWeightProvenance
    ))).toEqual(['legacyUnknown', 'legacyUnknown']);
  });

  it('refuse une referenceDate invalide avant toute lecture', async () => {
    const deps = dependencies(fixture());
    await expect(calculateStrengthPerformance('2026-08-40', deps)).rejects.toThrow(/invalide/);
    expect(deps.workoutSessions.listAll).not.toHaveBeenCalled();
    expect(deps.strengthExercises.listAll).not.toHaveBeenCalled();
  });
});
