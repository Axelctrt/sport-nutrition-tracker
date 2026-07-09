import { describe, expect, it, vi } from 'vitest';
import {
  calculateAndPersistDailyTarget,
  resolveAcceptedCalibrationAdjustment,
  resolveCalculationWeight,
  type DailyTargetCoordinatorDependencies,
} from '@/application/daily/dailyTargetCoordinator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
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
      },
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
    expect(snapshot.calculation.steps.totalSteps).toBe(9_000);
    expect(snapshot.target.targetCaloriesKcal).toBeGreaterThan(0);
    expect(snapshot.energyTransparency).toMatchObject({
      plannedSportCaloriesKcal: 0,
      actualSportCaloriesKcal: 0,
      rawSportCaloriesKcal: 0,
    });
    expect(savedTarget).toHaveBeenCalledOnce();
  });
});
