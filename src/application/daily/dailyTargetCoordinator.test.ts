import { describe, expect, it, vi } from 'vitest';
import {
  calculateAndPersistDailyTarget,
  resolveAcceptedCalibrationAdjustment,
  resolveCalculationWeight,
  type DailyTargetCoordinatorDependencies,
} from '@/application/daily/dailyTargetCoordinator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { StrengthTrainingActivity } from '@/domain/models/activity';
import type { DailyCheckOut } from '@/domain/models/dailyCoaching';
import type { DailySteps } from '@/domain/models/steps';
import type { WorkoutSession } from '@/domain/models/strength';
import type { AcceptedCalorieAdjustment } from '@/domain/models/weeklyReview';
import type { WeightEntry } from '@/domain/models/weight';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

function createProfile() {
  return createEntity(createProfileInput());
}

function createWeightEntry(date = '2026-06-22', weightKg = 61): WeightEntry {
  return createEntity({ date, weightKg });
}

function createAdjustment(
  overrides: Partial<AcceptedCalorieAdjustment> = {},
): AcceptedCalorieAdjustment {
  return {
    id: crypto.randomUUID(),
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    weeklyReviewId: crypto.randomUUID(),
    effectiveFrom: '2026-06-02',
    adjustmentKcalPerDay: 50,
    resultingCumulativeAdjustmentKcal: 50,
    status: 'active',
    ...overrides,
  };
}

describe('dailyTargetCoordinator', () => {
  it('utilise la moyenne des pesées de la semaine civile précédente', () => {
    const entries = [
      createWeightEntry('2026-06-29', 60),
      createWeightEntry('2026-07-01', 61),
      createWeightEntry('2026-07-05', 62),
    ];

    expect(resolveCalculationWeight('2026-07-09', createProfile(), entries)).toMatchObject({
      weightKg: 61,
      source: 'previousWeekAverage',
      period: { start: '2026-06-29', end: '2026-07-05' },
    });
  });

  it('revient au poids initial du profil sans pesée la semaine précédente', () => {
    expect(resolveCalculationWeight('2026-07-09', createProfile(), [])).toEqual({
      weightKg: 60,
      source: 'profile',
      period: { start: '2026-06-29', end: '2026-07-05' },
      dailyWeights: [],
    });
  });

  it('retient le dernier ajustement cumulé applicable', () => {
    const adjustments = [
      createAdjustment(),
      createAdjustment({
        createdAt: '2026-06-08T08:00:00.000Z',
        effectiveFrom: '2026-06-09',
        adjustmentKcalPerDay: -25,
        resultingCumulativeAdjustmentKcal: 25,
      }),
      createAdjustment({
        effectiveFrom: '2026-07-01',
        resultingCumulativeAdjustmentKcal: 100,
      }),
    ];

    expect(resolveAcceptedCalibrationAdjustment(adjustments, '2026-06-23')).toBe(25);
  });

  it('respecte la date de révocation d’un ajustement', () => {
    const adjustment = createAdjustment({
      status: 'reverted',
      revertedAt: '2026-06-20T12:00:00.000Z',
    });

    expect(resolveAcceptedCalibrationAdjustment([adjustment], '2026-06-19')).toBe(50);
    expect(resolveAcceptedCalibrationAdjustment([adjustment], '2026-06-20')).toBe(0);
  });

  it('charge les données quotidiennes, calcule puis persiste la cible', async () => {
    const savedTarget = vi.fn(async (target) => ({
      id: 'target-id',
      createdAt: '2026-06-23T08:00:00.000Z',
      updatedAt: '2026-06-23T08:00:00.000Z',
      ...target,
    }));
    const dependencies: DailyTargetCoordinatorDependencies = {
      settings: { get: vi.fn(async () => createDefaultAppSettings()) },
      weight: {
        listBetween: vi.fn(async () => [
          createWeightEntry('2026-06-15', 61),
          createWeightEntry('2026-06-18', 63),
        ]),
        getByDate: vi.fn(async () => createWeightEntry('2026-06-23', 62)),
      },
      steps: {
        getByDate: vi.fn(async () => createEntity({
          date: '2026-06-23',
          totalSteps: 9_000,
          source: 'manual' as const,
        })),
        listBetween: vi.fn(async () => []),
      },
      dailyCoaching: { getCheckOut: vi.fn(async () => undefined) },
      activities: { listByDate: vi.fn(async () => []) },
      targets: { upsertTarget: savedTarget },
      weeklyReviews: { listAdjustments: vi.fn(async () => []) },
      workoutSessions: { listAll: vi.fn(async () => []) },
      listEndurancePlanningSessions: vi.fn(async () => []),
    };

    const snapshot = await calculateAndPersistDailyTarget(
      '2026-06-23',
      createProfile(),
      dependencies,
    );

    expect(snapshot.weight.weightKg).toBe(62);
    expect(snapshot.weight.source).toBe('previousWeekAverage');
    expect(snapshot.dateWeightEntry?.weightKg).toBe(62);
    expect(dependencies.weight.listBetween).toHaveBeenCalledWith(
      '2026-06-15',
      '2026-06-21',
    );
    expect(snapshot.calculation.steps.totalSteps).toBe(5_000);
    expect(snapshot.energyGuidance).toMatchObject({
      expectedSteps: {
        expectedSteps: 5_000,
        stepGoal: 10_000,
        source: 'profileFallback',
        confidence: 'fallback',
        observedDayCount: 0,
      },
      finalStatus: 'open',
    });
    expect(snapshot.target.stepBasis).toEqual({
      mode: 'expected',
      steps: 5_000,
      stepGoal: 10_000,
      source: 'profileFallback',
      confidence: 'fallback',
      observedDayCount: 0,
      observationWindowDays: 28,
    });
    expect(snapshot.target.targetCaloriesKcal).toBeGreaterThan(0);
    expect(snapshot.energyTransparency).toMatchObject({
      plannedSportCaloriesKcal: 0,
      actualSportCaloriesKcal: 0,
      rawSportCaloriesKcal: 0,
    });
    expect(savedTarget).toHaveBeenCalledOnce();
  });

  it('sépare la cible guidée de la dépense finale sans compter deux fois le sport', async () => {
    const date = '2026-07-13';
    const linkedSession = createEntity<WorkoutSession>({
      date,
      status: 'planned',
      plannedDate: date,
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic',
      sourceTemplateNameSnapshot: 'Séance liée',
    });
    const remainingSession = createEntity<WorkoutSession>({
      date,
      status: 'planned',
      plannedDate: date,
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic',
      sourceTemplateNameSnapshot: 'Séance encore prévue',
    });
    const cancelledSession = createEntity<WorkoutSession>({
      date,
      status: 'skipped',
      plannedDate: date,
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic',
      sourceTemplateNameSnapshot: 'Séance annulée',
    });
    const actualActivity = createEntity<StrengthTrainingActivity>({
      date,
      type: 'strengthTraining',
      durationMinutes: 60,
      intensity: 'moderate',
      met: 5,
      plannedActivity: {
        source: 'strengthSession',
        sourceId: linkedSession.id,
      },
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 252,
        metUsed: 5,
        calculationVersion: 2,
      },
    });
    const checkOut = createEntity<DailyCheckOut>({
      date,
      stepsEntryId: `steps:${date}`,
      foodJournalComplete: true,
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-07-13T21:00:00.000Z',
    });
    const settings = createDefaultAppSettings();
    const savedTarget = vi.fn(async (target) => createEntity(target));
    const dependencies: DailyTargetCoordinatorDependencies = {
      settings: { get: vi.fn(async () => settings) },
      weight: {
        listBetween: vi.fn(async () => []),
        getByDate: vi.fn(async () => undefined),
      },
      steps: {
        getByDate: vi.fn(async () => createEntity({
          date,
          totalSteps: 8_000,
          source: 'manual' as const,
        }, `steps:${date}`)),
        listBetween: vi.fn(async () =>
          Array.from({ length: 14 }, (_, index) => createEntity<DailySteps>({
            date: `2026-06-${String(30 - index).padStart(2, '0')}`,
            totalSteps: 8_000,
            source: 'manual' as const,
          }))),
      },
      dailyCoaching: { getCheckOut: vi.fn(async () => checkOut) },
      activities: { listByDate: vi.fn(async () => [actualActivity]) },
      targets: { upsertTarget: savedTarget },
      weeklyReviews: { listAdjustments: vi.fn(async () => []) },
      workoutSessions: {
        listAll: vi.fn(async () => [
          linkedSession,
          remainingSession,
          cancelledSession,
        ]),
      },
      listEndurancePlanningSessions: vi.fn(async () => []),
    };

    const snapshot = await calculateAndPersistDailyTarget(
      date,
      createProfile(),
      dependencies,
    );

    expect(snapshot.plannedActivities).toHaveLength(1);
    expect(snapshot.plannedActivities[0]?.sourceId).toBe(remainingSession.id);
    expect(snapshot.calculation.energy).toMatchObject({
      strengthTrainingKcal: 252,
      plannedActivitiesKcal: 157.5,
    });
    expect(snapshot.energyGuidance.finalStatus).toBe('final');
    expect(snapshot.energyGuidance.finalExpenditure?.energy).toMatchObject({
      strengthTrainingKcal: 252,
      plannedActivitiesKcal: 0,
    });
    expect(
      snapshot.calculation.energy.totalEstimatedExpenditureKcal
      - (snapshot.energyGuidance.finalExpenditure?.energy
        .totalEstimatedExpenditureKcal ?? 0),
    ).toBe(157.5);
  });
});
