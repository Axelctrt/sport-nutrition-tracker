import {
  buildStrengthExerciseAnalytics,
  calculateEstimatedOneRepMax,
} from '@/application/strength/strengthAnalyticsService';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import type { StrengthSet, StrengthTrackingMode } from '@/domain/models/strength';
import { createEntity } from '@/shared/utils/entities';
import {
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

function createHistoryEntry(
  sessionId: string,
  date: string,
  sets: Array<ReturnType<typeof createStrengthSetInput>>,
): ExerciseHistoryEntry {
  const completedSets = sets.map((set, index) => createEntity<StrengthSet>(
    { ...set, isCompleted: true },
    `${sessionId}-set-${index + 1}`,
  ));
  return {
    session: createEntity(createWorkoutSessionInput({
      date,
      completedAt: `${date}T18:00:00.000Z`,
      sourceTemplateNameSnapshot: `Séance ${sessionId}`,
    }), sessionId),
    sessionExercise: createEntity(createWorkoutSessionExerciseInput({ sessionId }), `${sessionId}-exercise`),
    sets: completedSets,
    workingSets: completedSets.filter((set) => set.type !== 'warmup'),
    hasEffectiveLoadData: true,
    totalVolumeKg: completedSets
      .filter((set) => set.type !== 'warmup')
      .reduce((total, set) => total + set.weightKg * set.repetitions, 0),
    totalAdditionalVolumeKg: 0,
    totalDurationSeconds: completedSets.reduce((total, set) => total + (set.durationSeconds ?? 0), 0),
    totalDistanceMeters: completedSets.reduce((total, set) => total + (set.distanceMeters ?? 0), 0),
  };
}


function createTrackedHistoryEntry(
  sessionId: string,
  date: string,
  trackingMode: StrengthTrackingMode,
  sets: Array<ReturnType<typeof createStrengthSetInput>>,
  options: { bodyWeightKg?: number; totalVolumeKg?: number; totalAdditionalVolumeKg?: number } = {},
): ExerciseHistoryEntry {
  const completedSets = sets.map((set, index) => createEntity<StrengthSet>(
    { ...set, isCompleted: true },
    `${sessionId}-tracked-set-${index + 1}`,
  ));
  const sessionExercise = createEntity(createWorkoutSessionExerciseInput({
    sessionId,
    trackingModeSnapshot: trackingMode,
    loadUnitSnapshot: trackingMode === 'bodyweightRepetitions'
      ? 'bodyweight'
      : trackingMode === 'assistedRepetitions'
        ? 'assistedKg'
        : trackingMode === 'loadRepetitions'
          ? 'kg'
          : 'none',
  }), `${sessionId}-tracked-exercise`);
  return {
    session: createEntity(createWorkoutSessionInput({
      date,
      completedAt: `${date}T18:00:00.000Z`,
      sourceTemplateNameSnapshot: `Séance ${sessionId}`,
    }), sessionId),
    sessionExercise,
    sets: completedSets,
    workingSets: completedSets.filter((set) => set.type !== 'warmup'),
    ...(options.bodyWeightKg === undefined ? {} : { bodyWeightKg: options.bodyWeightKg }),
    hasEffectiveLoadData: trackingMode === 'loadRepetitions'
      || ((trackingMode === 'bodyweightRepetitions' || trackingMode === 'assistedRepetitions')
        && options.bodyWeightKg !== undefined),
    totalVolumeKg: options.totalVolumeKg ?? 0,
    totalAdditionalVolumeKg: options.totalAdditionalVolumeKg ?? 0,
    totalDurationSeconds: completedSets.reduce(
      (total, set) => total + (set.durationSeconds ?? 0),
      0,
    ),
    totalDistanceMeters: completedSets.reduce(
      (total, set) => total + (set.distanceMeters ?? 0),
      0,
    ),
  };
}

describe('strengthAnalyticsService', () => {
  it('calcule une estimation Epley uniquement sur une plage pertinente', () => {
    expect(calculateEstimatedOneRepMax(100, 1)).toBe(100);
    expect(calculateEstimatedOneRepMax(60, 10)).toBe(80);
    expect(calculateEstimatedOneRepMax(60, 13)).toBeUndefined();
    expect(calculateEstimatedOneRepMax(0, 10)).toBeUndefined();
  });

  it('calcule les records, volumes, répétitions et charge moyenne sans les échauffements', () => {
    const history = [
      createHistoryEntry('latest', '2026-06-20', [
        createStrengthSetInput({ type: 'warmup', weightKg: 20, repetitions: 10 }),
        createStrengthSetInput({ weightKg: 65, repetitions: 8 }),
        createStrengthSetInput({ weightKg: 65, repetitions: 7 }),
      ]),
      createHistoryEntry('old', '2026-06-10', [
        createStrengthSetInput({ weightKg: 60, repetitions: 10 }),
        createStrengthSetInput({ weightKg: 60, repetitions: 9 }),
      ]),
    ];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.summary).toMatchObject({
      sessionCount: 2,
      workingSetCount: 4,
      totalRepetitions: 34,
      totalVolumeKg: 2115,
      bestLoadKg: 65,
      averageLoadKg: 62.5,
      bestRepetitions: 10,
      bestSetVolumeKg: 600,
      bestSessionVolumeKg: 1140,
    });
    expect(analytics.summary.estimatedOneRepMaxKg).toBe(82.3);
  });

  it('produit les points chronologiques et compare les deux dernières séances', () => {
    const history = [
      createHistoryEntry('latest', '2026-06-20', [
        createStrengthSetInput({ weightKg: 65, repetitions: 10 }),
        createStrengthSetInput({ weightKg: 65, repetitions: 10 }),
      ]),
      createHistoryEntry('old', '2026-06-10', [
        createStrengthSetInput({ weightKg: 60, repetitions: 10 }),
        createStrengthSetInput({ weightKg: 60, repetitions: 8 }),
      ]),
    ];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.sessions.map((session) => session.sessionId)).toEqual(['old', 'latest']);
    expect(analytics.comparison).toMatchObject({
      volumeDeltaKg: 220,
      volumeDeltaPercent: 20.4,
      bestLoadDeltaKg: 5,
      repetitionsDelta: 2,
      averageLoadDeltaKg: 5,
    });
  });

  it('conserve le meilleur nombre de répétitions pour chaque charge', () => {
    const history = [
      createHistoryEntry('latest', '2026-06-20', [
        createStrengthSetInput({ weightKg: 60, repetitions: 12 }),
        createStrengthSetInput({ weightKg: 65, repetitions: 8 }),
      ]),
      createHistoryEntry('old', '2026-06-10', [
        createStrengthSetInput({ weightKg: 60, repetitions: 10 }),
        createStrengthSetInput({ weightKg: 65, repetitions: 6 }),
      ]),
    ];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.loadRepetitionRecords).toEqual([
      { weightKg: 65, repetitions: 8, sessionId: 'latest', date: '2026-06-20' },
      { weightKg: 60, repetitions: 12, sessionId: 'latest', date: '2026-06-20' },
    ]);
  });

  it('retourne des statistiques neutres sans séries de travail', () => {
    const history = [createHistoryEntry('warmup-only', '2026-06-20', [
      createStrengthSetInput({ type: 'warmup', weightKg: 20, repetitions: 10 }),
    ])];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.sessions).toEqual([]);
    expect(analytics.summary).toMatchObject({
      sessionCount: 0,
      workingSetCount: 0,
      totalRepetitions: 0,
      totalVolumeKg: 0,
      averageLoadKg: 0,
    });
    expect(analytics.comparison).toBeUndefined();
  });

  it('analyse le poids du corps et sépare clairement le lest additionnel', () => {
    const history = [createTrackedHistoryEntry(
      'bodyweight',
      '2026-06-20',
      'bodyweightRepetitions',
      [
        createStrengthSetInput({ weightKg: 10, repetitions: 8 }),
        createStrengthSetInput({ weightKg: 0, repetitions: 12 }),
      ],
      { bodyWeightKg: 70, totalVolumeKg: 1480, totalAdditionalVolumeKg: 80 },
    )];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.trackingMode).toBe('bodyweightRepetitions');
    expect(analytics.summary).toMatchObject({
      bestRepetitions: 12,
      maximumAdditionalLoadKg: 10,
      totalAdditionalVolumeKg: 80,
      totalVolumeKg: 1480,
      bestLoadKg: 80,
    });
    expect(analytics.summary.estimatedOneRepMaxKg).toBeUndefined();
  });

  it('classe un exercice assisté en considérant qu’une assistance plus faible est meilleure', () => {
    const history = [createTrackedHistoryEntry(
      'assisted',
      '2026-06-20',
      'assistedRepetitions',
      [
        createStrengthSetInput({ weightKg: 20, repetitions: 8 }),
        createStrengthSetInput({ weightKg: 30, repetitions: 12 }),
      ],
      { bodyWeightKg: 70, totalVolumeKg: 880 },
    )];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.summary).toMatchObject({
      minimumAssistanceKg: 20,
      bestLoadKg: 50,
      bestRepetitions: 12,
    });
    expect(analytics.loadRepetitionRecords.map((record) => record.weightKg)).toEqual([20, 30]);
    expect(analytics.loadRepetitionRecords[0]).toMatchObject({ effectiveLoadKg: 50 });
  });

  it('suit les répétitions seules sans inventer de charge ou de volume', () => {
    const history = [createTrackedHistoryEntry(
      'repetitions',
      '2026-06-20',
      'repetitions',
      [
        createStrengthSetInput({ weightKg: 0, repetitions: 15 }),
        createStrengthSetInput({ weightKg: 0, repetitions: 12 }),
      ],
    )];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.summary).toMatchObject({
      totalRepetitions: 27,
      bestRepetitions: 15,
      totalVolumeKg: 0,
      bestLoadKg: 0,
    });
    expect(analytics.loadRepetitionRecords).toEqual([]);
  });

  it('suit une durée sans afficher de métrique de charge', () => {
    const history = [createTrackedHistoryEntry(
      'duration',
      '2026-06-20',
      'duration',
      [
        createStrengthSetInput({ weightKg: 0, repetitions: 0, durationSeconds: 60 }),
        createStrengthSetInput({ weightKg: 0, repetitions: 0, durationSeconds: 45 }),
      ],
    )];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.summary).toMatchObject({
      totalDurationSeconds: 105,
      bestDurationSeconds: 60,
      totalVolumeKg: 0,
    });
    expect(analytics.summary.estimatedOneRepMaxKg).toBeUndefined();
  });

  it('suit une distance indépendamment des répétitions', () => {
    const history = [createTrackedHistoryEntry(
      'distance',
      '2026-06-20',
      'distance',
      [
        createStrengthSetInput({ weightKg: 0, repetitions: 0, distanceMeters: 30 }),
        createStrengthSetInput({ weightKg: 0, repetitions: 0, distanceMeters: 40 }),
      ],
    )];

    const analytics = buildStrengthExerciseAnalytics(history);

    expect(analytics.summary).toMatchObject({
      totalDistanceMeters: 70,
      bestDistanceMeters: 40,
      totalVolumeKg: 0,
    });
  });

});
