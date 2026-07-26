import { addDays, parseISO } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import {
  loadEnergyArchitectureRetrospective,
  type EnergyArchitectureRetrospectiveDependencies,
} from '@/application/daily/energyArchitectureRetrospectiveService';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { DailyCheckOut } from '@/domain/models/dailyCoaching';
import type { FoodEntry } from '@/domain/models/food';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeightEntry } from '@/domain/models/weight';
import { createEntity } from '@/shared/utils/entities';
import { toLocalDate } from '@/shared/utils/dates';
import { createProfileInput } from '@/test/factories/profileFactory';

const analysisStart = '2026-07-01';
const analysisEnd = '2026-07-28';

function dateAt(index: number) {
  return toLocalDate(addDays(parseISO(analysisStart), index));
}

function foodEntry(date: string): FoodEntry {
  return createEntity<FoodEntry>({
    date,
    mealId: `meal:${date}`,
    mealSlot: 'dinner',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: 'daily-energy',
      inputMode: 'amount',
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: {
        caloriesKcal: 2_200,
        proteinGrams: 140,
        carbohydratesGrams: 250,
        fatGrams: 70,
      },
    },
  });
}

function dailyTarget(date: string): DailyTarget {
  return createEntity<DailyTarget>({
    date,
    calculationWeightKg: 70,
    energy: {
      bmrKcal: 1_700,
      occupationalBaseKcal: 2_295,
      walkingKcal: 100,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      plannedActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 2_395,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1_500,
    targetCaloriesKcal: 2_395,
    macros: {
      proteinGrams: 140,
      carbohydratesGrams: 260,
      fatGrams: 70,
    },
    calculationVersion: 5,
  });
}

describe('energyArchitectureRetrospectiveService', () => {
  it('charge 28 jours et n’utilise que les pas liés au bilan quotidien', async () => {
    const dates = Array.from({ length: 28 }, (_, index) => dateAt(index));
    const steps = dates.map((date) => createEntity<DailySteps>({
      date,
      totalSteps: 9_000,
      source: 'manual',
    }, `steps:${date}`));
    const dependencies: EnergyArchitectureRetrospectiveDependencies = {
      settings: {
        get: vi.fn(async () => createDefaultAppSettings()),
      },
      weights: {
        listBetween: vi.fn(async () => dates.map((date) => (
          createEntity<WeightEntry>({ date, weightKg: 70 })
        ))),
      },
      food: {
        listEntriesBetween: vi.fn(async () => dates.map(foodEntry)),
        listJournalStatusesBetween: vi.fn(async () => []),
      },
      steps: {
        listBetween: vi.fn(async () => steps),
      },
      targets: {
        listTargetsBetween: vi.fn(async () => dates.map(dailyTarget)),
      },
      dailyCoaching: {
        listCheckOutsBetween: vi.fn(async () => dates.map((date) => (
          createEntity<DailyCheckOut>({
            date,
            stepsEntryId: `steps:${date}`,
            foodJournalComplete: true,
            contextFlags: [],
            contextSyncPreference: 'localOnly',
            completedAt: `${date}T21:00:00.000Z`,
          })
        ))),
      },
      activities: {
        listBetween: vi.fn(async () => []),
      },
    };

    const report = await loadEnergyArchitectureRetrospective(
      analysisEnd,
      createEntity(createProfileInput({ occupationalActivity: 'active' })),
      dependencies,
    );

    expect(dependencies.weights.listBetween).toHaveBeenCalledWith(
      analysisStart,
      analysisEnd,
    );
    expect(report.totalDayCount).toBe(28);
    expect(report.eligibleDayCount).toBe(28);
    expect(report.validWindowCount).toBe(15);
    expect(report.excludedDays).toEqual([]);
    expect(report.windows[0]?.averageCandidateExpenditureKcal).toBeLessThan(
      report.windows[0]?.averageCurrentExpenditureKcal ?? 0,
    );
  });
});
