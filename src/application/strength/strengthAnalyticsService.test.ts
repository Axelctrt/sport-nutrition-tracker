import {
  buildStrengthExerciseAnalytics,
  calculateEstimatedOneRepMax,
} from '@/application/strength/strengthAnalyticsService';
import type { ExerciseHistoryEntry } from '@/application/strength/strengthHistoryService';
import type { StrengthSet } from '@/domain/models/strength';
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
    totalVolumeKg: completedSets
      .filter((set) => set.type !== 'warmup')
      .reduce((total, set) => total + set.weightKg * set.repetitions, 0),
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
});
