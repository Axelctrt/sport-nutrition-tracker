import { describe, expect, it } from 'vitest';
import {
  buildStrengthPerformanceSnapshot,
  buildStrengthSchedulePerformance,
  compareStrengthPerformance,
  type StrengthExerciseExposure,
  type StrengthPerformanceBestSet,
  type StrengthPerformanceRelation,
} from '@/domain/coach/strengthPerformance';
import {
  resolveReferenceWeightEvidence,
  resolveWeightEntryEvidence,
  type CoachSignalEvidence,
} from '@/domain/coach/coachSignalEvidence';
import type { LocalDate } from '@/domain/models/common';
import type {
  StrengthSet,
  StrengthTrackingMode,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import { loadUnitForTrackingMode } from '@/domain/strength/strengthTracking';
import { createEntity } from '@/shared/utils/entities';
import {
  createExerciseDefinitionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

const REFERENCE_DATE = '2026-08-25';

function bestSet(overrides: Partial<StrengthPerformanceBestSet> = {}): StrengthPerformanceBestSet {
  return {
    setId: 'set-1',
    setNumber: 1,
    repetitions: 10,
    weightKg: 60,
    estimatedOneRepMaxKg: 80,
    ...overrides,
  };
}

function bestSetWithoutEstimate(
  overrides: Partial<StrengthPerformanceBestSet> = {},
): StrengthPerformanceBestSet {
  const result = bestSet(overrides);
  delete result.estimatedOneRepMaxKg;
  return result;
}

function exposure(
  mode: StrengthTrackingMode,
  set: StrengthPerformanceBestSet,
  overrides: Partial<StrengthExerciseExposure> = {},
): StrengthExerciseExposure {
  return {
    sessionId: 'session-1',
    sessionExerciseId: 'session-exercise-1',
    date: '2026-08-01',
    occurredAt: '2026-08-01T18:00:00.000Z',
    trackingMode: mode,
    plannedWorkingSetCount: 4,
    completedPlannedWorkingSetCount: 4,
    completedTrainingSetCount: 4,
    bestSet: set,
    bodyWeightTrendConfirmed: false,
    progressionEligible: false,
    progressionIneligibilityReason: 'incompleteSnapshot',
    relationToPrevious: 'notComparable',
    ...overrides,
  };
}

function relation(
  mode: StrengthTrackingMode,
  previousSet: StrengthPerformanceBestSet,
  currentSet: StrengthPerformanceBestSet,
  confirmedBodyWeight = false,
): StrengthPerformanceRelation {
  return compareStrengthPerformance(
    exposure(mode, previousSet, { bodyWeightTrendConfirmed: confirmedBodyWeight }),
    exposure(mode, currentSet, { bodyWeightTrendConfirmed: confirmedBodyWeight }),
  );
}

describe('compareStrengthPerformance', () => {
  it.each([
    ['plus de répétitions à charge identique', bestSet({ repetitions: 10 }), bestSet({ repetitions: 11 }), 'improved'],
    ['moins de répétitions à charge identique', bestSet({ repetitions: 10 }), bestSet({ repetitions: 9 }), 'regressed'],
    ['RPE inférieur à charge et répétitions identiques', bestSet({ rpe: 9 }), bestSet({ rpe: 8 }), 'improved'],
    ['RPE supérieur à charge et répétitions identiques', bestSet({ rpe: 8 }), bestSet({ rpe: 9 }), 'regressed'],
    ['RPE partiellement absent', bestSet({ rpe: 8 }), bestSet(), 'equivalent'],
    ['égalité parfaite', bestSet({ rpe: 8 }), bestSet({ rpe: 8 }), 'equivalent'],
  ] as const)('%s', (_label, previousSet, currentSet, expected) => {
    expect(relation('loadRepetitions', previousSet, currentSet)).toBe(expected);
  });

  it('réutilise l’e1RM existant lorsque les charges diffèrent', () => {
    expect(relation(
      'loadRepetitions',
      bestSet({ weightKg: 60, repetitions: 10, estimatedOneRepMaxKg: 80 }),
      bestSet({ weightKg: 65, repetitions: 8, estimatedOneRepMaxKg: 82.3 }),
    )).toBe('improved');
  });

  it('expose exactement l’estimation 1RM existante sans nouvelle formule', () => {
    const snapshot = performanceSnapshot([{ weightKg: 60, repetitions: 10 }]);
    expect(snapshot.exercises[0]!.exposures[0]).toMatchObject({
      estimatedOneRepMaxKg: 80,
      bestSet: { estimatedOneRepMaxKg: 80 },
    });
  });

  it('refuse la comparaison de charges différentes sans e1RM valide', () => {
    expect(relation(
      'loadRepetitions',
      bestSetWithoutEstimate({ weightKg: 60, repetitions: 13 }),
      bestSetWithoutEstimate({ weightKg: 65, repetitions: 13 }),
    )).toBe('notComparable');
  });

  it.each([
    ['repetitions', { repetitions: 10 }, { repetitions: 12 }],
    ['duration', { durationSeconds: 45 }, { durationSeconds: 60 }],
    ['distance', { distanceMeters: 100 }, { distanceMeters: 120 }],
  ] as const)('compare le mode %s par sa mesure canonique', (mode, previous, current) => {
    expect(relation(
      mode,
      bestSetWithoutEstimate(previous),
      bestSetWithoutEstimate(current),
    )).toBe('improved');
  });

  it.each(['bodyweightRepetitions', 'assistedRepetitions'] as const)(
    'compare %s par charge effective uniquement avec un poids confirmé',
    (mode) => {
      const previous = bestSetWithoutEstimate({ effectiveLoadKg: 70 });
      const current = bestSetWithoutEstimate({ effectiveLoadKg: 75 });
      expect(relation(mode, previous, current, true)).toBe('improved');
      expect(relation(mode, previous, current, false)).toBe('notComparable');
    },
  );
});

interface ExposureValue {
  date?: LocalDate;
  repetitions?: number;
  weightKg?: number;
  rpe?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  mode?: StrengthTrackingMode;
}

function performanceSnapshot(
  values: ExposureValue[],
  options: {
    extraSets?: StrengthSet[];
    bodyWeightEvidenceBySessionId?: Record<string, CoachSignalEvidence<number>>;
    referenceDate?: LocalDate;
  } = {},
) {
  const sessions: WorkoutSession[] = [];
  const sessionExercises: WorkoutSessionExercise[] = [];
  const sets: StrengthSet[] = [];
  values.forEach((value, index) => {
    const number = index + 1;
    const sessionId = `session-${number}`;
    const sessionExerciseId = `session-exercise-${number}`;
    const date = value.date ?? `2026-08-${String(number).padStart(2, '0')}`;
    const mode = value.mode ?? 'loadRepetitions';
    sessions.push(createEntity(createWorkoutSessionInput({
      date,
      status: 'completed',
      completedAt: `${date}T18:00:00.000Z`,
    }), sessionId));
    sessionExercises.push(createEntity(createWorkoutSessionExerciseInput({
      sessionId,
      exerciseDefinitionId: 'exercise-1',
      exerciseNameSnapshot: 'Développé couché',
      loadUnitSnapshot: loadUnitForTrackingMode(mode),
      trackingModeSnapshot: mode,
    }), sessionExerciseId));
    const input = createStrengthSetInput({
      sessionId,
      sessionExerciseId,
      repetitions: value.repetitions ?? 10,
      weightKg: value.weightKg ?? 60,
      isCompleted: true,
      ...(value.rpe === undefined ? {} : { rpe: value.rpe }),
      ...(value.durationSeconds === undefined ? {} : {
        durationSeconds: value.durationSeconds,
      }),
      ...(value.distanceMeters === undefined ? {} : {
        distanceMeters: value.distanceMeters,
      }),
    });
    if (value.rpe === undefined) delete input.rpe;
    sets.push(createEntity(input, `set-${number}`));
  });
  return buildStrengthPerformanceSnapshot({
    referenceDate: options.referenceDate ?? REFERENCE_DATE,
    sessions,
    sessionExercises,
    sets: [...sets, ...(options.extraSets ?? [])],
    exerciseDefinitions: [createEntity(
      createExerciseDefinitionInput(),
      'exercise-1',
    )],
    ...(options.bodyWeightEvidenceBySessionId === undefined ? {} : {
      bodyWeightEvidenceBySessionId: options.bodyWeightEvidenceBySessionId,
    }),
  });
}

function trend(values: ExposureValue[]): string {
  return performanceSnapshot(values).exercises[0]!.trend;
}

describe('buildStrengthPerformanceSnapshot — tendances Option A', () => {
  it('classe une exposition unique en données insuffisantes', () => {
    expect(trend([{ repetitions: 10 }])).toBe('insufficientData');
  });

  it('sort immédiatement vers progressing sur une amélioration récente', () => {
    expect(trend([{ repetitions: 10 }, { repetitions: 11 }])).toBe('progressing');
  });

  it('garde deux expositions identiques en stable', () => {
    expect(trend([{ repetitions: 10 }, { repetitions: 10 }])).toBe('stable');
  });

  it('exige trois expositions comparables sans progression pour stagnating', () => {
    expect(trend([
      { repetitions: 10 },
      { repetitions: 10 },
      { repetitions: 10 },
    ])).toBe('stagnating');
  });

  it('exige deux régressions comparables consécutives pour degrading', () => {
    expect(trend([
      { repetitions: 12 },
      { repetitions: 10 },
      { repetitions: 8 },
    ])).toBe('degrading');
  });

  it('ne dégrade jamais après une seule régression ou une mauvaise séance isolée', () => {
    expect(trend([{ repetitions: 12 }, { repetitions: 10 }])).toBe('stable');
    expect(trend([
      { repetitions: 12 },
      { repetitions: 10 },
      { repetitions: 10 },
    ])).toBe('stagnating');
  });

  it('une amélioration récente sort immédiatement d’une séquence mauvaise', () => {
    expect(trend([
      { repetitions: 12 },
      { repetitions: 10 },
      { repetitions: 8 },
      { repetitions: 13 },
    ])).toBe('progressing');
  });

  it('notComparable casse la chaîne sans traverser silencieusement l’exposition', () => {
    const snapshot = performanceSnapshot([
      { weightKg: 60, repetitions: 12 },
      { weightKg: 60, repetitions: 10 },
      { weightKg: 70, repetitions: 13 },
      { weightKg: 70, repetitions: 12 },
    ]);
    const performance = snapshot.exercises[0]!;
    expect(performance.exposures.map(({ relationToPrevious }) => relationToPrevious)).toEqual([
      'notComparable',
      'regressed',
      'notComparable',
      'regressed',
    ]);
    expect(performance.comparableExposureCount).toBe(2);
    expect(performance.trend).toBe('stable');
  });

  it('exclut les expositions postérieures à referenceDate d’une tendance historique', () => {
    const snapshot = performanceSnapshot([
      { date: '2026-08-24', repetitions: 10 },
      { date: REFERENCE_DATE, repetitions: 10 },
      { date: '2026-08-26', repetitions: 14 },
    ]);

    expect(snapshot.exercises[0]!.exposures.map(({ date }) => date)).toEqual([
      '2026-08-24',
      REFERENCE_DATE,
    ]);
    expect(snapshot.exercises[0]).toMatchObject({
      exposureCount: 2,
      trend: 'stable',
    });
  });
});

describe('buildStrengthPerformanceSnapshot — provenance et séries', () => {
  const confirmedWeight = resolveWeightEntryEvidence(createEntity({
    date: '2026-08-01',
    weightKg: 70,
    provenance: 'userMeasurement',
  }, 'weight-confirmed'));
  const initializedWeight = resolveWeightEntryEvidence(createEntity({
    date: '2026-08-01',
    weightKg: 70,
    provenance: 'profileInitialization',
  }, 'weight-initialized'));
  const legacyWeight = resolveWeightEntryEvidence(createEntity({
    date: '2026-08-01',
    weightKg: 70,
  }, 'weight-legacy'));
  const profileFallback = resolveReferenceWeightEvidence('2026-08-01', {
    weightKg: 70,
    source: 'profile',
    period: { start: '2026-07-20', end: '2026-07-26' },
    dailyWeights: [],
  });

  it.each([
    ['userMeasurement', confirmedWeight, 'progressing'],
    ['profileInitialization', initializedWeight, 'insufficientData'],
    ['legacyUnknown', legacyWeight, 'insufficientData'],
    ['profileFallback', profileFallback, 'insufficientData'],
  ] as const)('qualifie correctement la provenance %s', (_label, evidence, expectedTrend) => {
    const snapshot = performanceSnapshot([
      { mode: 'bodyweightRepetitions', repetitions: 10 },
      { mode: 'bodyweightRepetitions', repetitions: 11 },
    ], {
      bodyWeightEvidenceBySessionId: {
        'session-1': evidence,
        'session-2': evidence,
      },
    });
    expect(snapshot.exercises[0]!.trend).toBe(expectedTrend);
  });

  it('ignore warm-up et série incomplète, sans laisser une drop set satisfaire le plan', () => {
    const snapshot = performanceSnapshot([{ repetitions: 10 }]);
    const baseSession = snapshot.exercises[0]!.exposures[0]!;
    expect(baseSession.completedPlannedWorkingSetCount).toBe(1);

    const sessionId = 'session-1';
    const sessionExerciseId = 'session-exercise-1';
    const extraSets = [
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 0,
        type: 'warmup',
        isCompleted: true,
      }), 'warmup'),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 2,
        type: 'working',
        isCompleted: true,
      }), 'working-2'),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 3,
        type: 'working',
        isCompleted: false,
      }), 'working-3'),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 4,
        type: 'working',
        isCompleted: true,
      }), 'working-4'),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 5,
        type: 'working',
        isCompleted: true,
      }), 'working-extra'),
      createEntity(createStrengthSetInput({
        sessionId,
        sessionExerciseId,
        setNumber: 6,
        type: 'dropSet',
        isCompleted: true,
      }), 'drop-set'),
    ];
    const full = performanceSnapshot([{ repetitions: 10 }], { extraSets });
    const result = full.exercises[0]!.exposures[0]!;
    expect(result).toMatchObject({
      plannedWorkingSetCount: 4,
      completedPlannedWorkingSetCount: 3,
      completedTrainingSetCount: 5,
    });
    expect(result.volumeKg).toBe(3_480);
  });

  it('partage exactement l’évaluation pure de progression pour quatre working complétées', () => {
    const extraSets = [2, 3, 4].map((setNumber) => createEntity(createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber,
      repetitions: 12,
      weightKg: 60,
      type: 'working',
      isCompleted: true,
    }), `working-${setNumber}`));
    const snapshot = performanceSnapshot([{ repetitions: 12, rpe: 8 }], { extraSets });
    expect(snapshot.exercises[0]!.exposures[0]).toMatchObject({
      plannedWorkingSetCount: 4,
      completedPlannedWorkingSetCount: 4,
      progressionEligible: true,
    });
  });

  it('sélectionne le meilleur set de façon stable en cas d’égalité', () => {
    const tiedSet = createEntity(createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber: 2,
      repetitions: 10,
      weightKg: 60,
      isCompleted: true,
    }), 'set-tied');
    const snapshot = performanceSnapshot([{ repetitions: 10 }], { extraSets: [tiedSet] });
    expect(snapshot.exercises[0]!.exposures[0]!.bestSet.setId).toBe('set-1');
  });

  it('préfère les répétitions à charge identique même sans e1RM au-delà de 12 reps', () => {
    const currentFourteenInput = createStrengthSetInput({
      sessionId: 'session-2',
      sessionExerciseId: 'session-exercise-2',
      setNumber: 2,
      repetitions: 14,
      weightKg: 60,
      isCompleted: true,
    });
    delete currentFourteenInput.rpe;
    const currentFourteen = createEntity(currentFourteenInput, 'current-60x14');
    const snapshot = performanceSnapshot([
      { weightKg: 60, repetitions: 13 },
      { weightKg: 60, repetitions: 12 },
    ], { extraSets: [currentFourteen] });
    const current = snapshot.exercises[0]!.exposures[1]!;

    expect(current.bestSet).toMatchObject({
      setId: 'current-60x14',
      weightKg: 60,
      repetitions: 14,
    });
    expect(current.bestSet.estimatedOneRepMaxKg).toBeUndefined();
    expect(current.relationToPrevious).toBe('improved');
  });

  it('départage même charge et mêmes répétitions par le RPE inférieur', () => {
    const lowerRpe = createEntity(createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber: 2,
      repetitions: 10,
      weightKg: 60,
      rpe: 8,
      isCompleted: true,
    }), 'lower-rpe');
    const snapshot = performanceSnapshot([
      { weightKg: 60, repetitions: 10, rpe: 9 },
    ], { extraSets: [lowerRpe] });

    expect(snapshot.exercises[0]!.exposures[0]!.bestSet.setId).toBe('lower-rpe');
  });

  it('conserve la sélection par e1RM existant lorsque les charges diffèrent', () => {
    const higherEstimateInput = createStrengthSetInput({
      sessionId: 'session-1',
      sessionExerciseId: 'session-exercise-1',
      setNumber: 2,
      repetitions: 8,
      weightKg: 65,
      isCompleted: true,
    });
    delete higherEstimateInput.rpe;
    const higherEstimate = createEntity(higherEstimateInput, 'higher-estimate');
    const snapshot = performanceSnapshot([
      { weightKg: 60, repetitions: 10 },
    ], { extraSets: [higherEstimate] });

    expect(snapshot.exercises[0]!.exposures[0]!.bestSet).toMatchObject({
      setId: 'higher-estimate',
      estimatedOneRepMaxKg: 82.3,
    });
  });

  it('ignore une warm-up ou une série non terminée comme seule preuve d’exposition', () => {
    const session = createEntity(createWorkoutSessionInput(), 'session-only');
    const exercise = createEntity(createWorkoutSessionExerciseInput({
      sessionId: session.id,
    }), 'exercise-only');
    const sets = [
      createEntity(createStrengthSetInput({
        sessionId: session.id,
        sessionExerciseId: exercise.id,
        type: 'warmup',
      }), 'warmup-only'),
      createEntity(createStrengthSetInput({
        sessionId: session.id,
        sessionExerciseId: exercise.id,
        setNumber: 2,
        isCompleted: false,
      }), 'incomplete-only'),
    ];
    expect(buildStrengthPerformanceSnapshot({
      referenceDate: REFERENCE_DATE,
      sessions: [session],
      sessionExercises: [exercise],
      sets,
      exerciseDefinitions: [],
    }).exercises).toEqual([]);
  });
});

function scheduledSession(
  id: string,
  status: WorkoutSession['status'],
  plannedDate: LocalDate,
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  return createEntity(createWorkoutSessionInput({
    status,
    date: plannedDate,
    plannedDate,
    originalPlannedDate: plannedDate,
    plannedAt: `${plannedDate}T08:00:00.000Z`,
    ...overrides,
  }), id);
}

describe('buildStrengthSchedulePerformance', () => {
  it('distingue completed planned, skipped, overdue et abandoned à date explicite', () => {
    const sessions = [
      scheduledSession('completed', 'completed', '2026-08-20'),
      createEntity(createWorkoutSessionInput({ status: 'completed' }), 'completed-unplanned'),
      scheduledSession('skipped', 'skipped', '2026-08-21'),
      scheduledSession('overdue', 'planned', '2026-08-24'),
      scheduledSession('today', 'planned', REFERENCE_DATE),
      scheduledSession('rescheduled', 'planned', '2026-08-27', {
        originalPlannedDate: '2026-08-20',
      }),
      scheduledSession('abandoned', 'abandoned', '2026-08-22'),
      scheduledSession('completed-future-event', 'completed', '2026-08-24', {
        completedAt: '2026-08-26T10:00:00.000Z',
      }),
      scheduledSession('skipped-future-event', 'skipped', '2026-08-24', {
        skippedAt: '2026-08-26T10:00:00.000Z',
      }),
      scheduledSession('abandoned-future-event', 'abandoned', '2026-08-24', {
        completedAt: '2026-08-26T10:00:00.000Z',
      }),
    ];

    expect(buildStrengthSchedulePerformance(sessions, REFERENCE_DATE)).toEqual({
      completedPlannedCount: 1,
      skippedCount: 1,
      overdueCount: 1,
      abandonedCount: 1,
    });
    expect(buildStrengthSchedulePerformance(sessions, '2026-08-28').overdueCount).toBe(3);
  });
});
