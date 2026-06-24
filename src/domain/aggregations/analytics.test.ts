import { describe, expect, it } from 'vitest';
import {
  aggregateActivityWeeks,
  aggregateNutritionWeeks,
  aggregateRunningWeeks,
  aggregateSwimmingWeeks,
  aggregateWeightWeeks,
  buildHistoryDays,
  calculateTargetWeight,
  calculateWeightMovingAverage,
  createTwelveWeekWindow,
} from '@/domain/aggregations/analytics';
import type { Activity, RunningActivity, SwimmingActivity } from '@/domain/models/activity';
import type { DailyJournalStatus, FoodEntry } from '@/domain/models/food';
import type { UserProfile } from '@/domain/models/profile';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeightEntry } from '@/domain/models/weight';

const metadata = {
  id: 'entity-1',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const profile: UserProfile = {
  ...metadata,
  id: 'profile',
  firstName: 'Test',
  sexForEnergyEquation: 'male',
  ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-01-01' },
  heightCm: 180,
  initialWeightKg: 80,
  goal: 'loss',
  targetWeeklyWeightChangePercent: -0.5,
  occupationalActivity: 'sedentary',
  dailyStepGoal: 10_000,
  proteinGramsPerKg: 1.8,
  fatGramsPerKg: 0.9,
};

function running(overrides: Partial<RunningActivity> = {}): RunningActivity {
  return {
    ...metadata,
    type: 'running',
    date: '2026-06-02',
    durationMinutes: 50,
    intensity: 'moderate',
    rpe: 6,
    sessionType: 'easy',
    distanceKm: 10,
    averageCadenceSpm: 170,
    calculation: { weightKg: 80, estimatedCaloriesKcal: 800, calculationVersion: 1 },
    ...overrides,
  };
}

function swimming(overrides: Partial<SwimmingActivity> = {}): SwimmingActivity {
  return {
    ...metadata,
    id: 'swim',
    type: 'swimming',
    date: '2026-06-03',
    durationMinutes: 40,
    intensity: 'moderate',
    rpe: 5,
    sessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceMeters: 2000,
    calculation: { weightKg: 80, estimatedCaloriesKcal: 400, calculationVersion: 1 },
    ...overrides,
  };
}

function target(date: string, calories = 2000, protein = 140): DailyTarget {
  return {
    ...metadata,
    id: `target-${date}`,
    date,
    calculationWeightKg: 80,
    energy: {
      bmrKcal: 1700,
      occupationalBaseKcal: 2040,
      walkingKcal: 0,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 2040,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1870,
    targetCaloriesKcal: calories,
    macros: { proteinGrams: protein, carbohydratesGrams: 250, fatGrams: 70 },
    calculationVersion: 1,
  };
}

function productEntry(date: string, calories: number, protein: number): FoodEntry {
  return {
    ...metadata,
    id: `entry-${date}-${calories}`,
    date,
    mealId: `meal-${date}`,
    mealSlot: 'lunch',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: 'product',
      inputMode: 'amount',
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: {
        caloriesKcal: calories,
        proteinGrams: protein,
        carbohydratesGrams: 0,
        fatGrams: 0,
      },
    },
  };
}

describe('agrégations analytiques', () => {
  it('crée exactement douze semaines du lundi au dimanche', () => {
    const weeks = createTwelveWeekWindow('2026-06-23');
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toMatchObject({ weekStart: '2026-04-06', weekEnd: '2026-04-12' });
    expect(weeks.at(-1)).toMatchObject({ weekStart: '2026-06-22', weekEnd: '2026-06-28' });
  });

  it('pondère l’allure de course par la distance', () => {
    const weeks = createTwelveWeekWindow('2026-06-07');
    const summary = aggregateRunningWeeks([
      running(),
      running({ id: 'run-2', durationMinutes: 30, distanceKm: 5, rpe: 8 }),
    ], weeks).at(-1);

    expect(summary).toMatchObject({
      distanceKm: 15,
      durationMinutes: 80,
      sessionCount: 2,
      longestDistanceKm: 10,
      averageRpe: 7,
      weightedPaceSecondsPerKm: 320,
    });
  });

  it('pondère l’allure de natation par la distance totale', () => {
    const weeks = createTwelveWeekWindow('2026-06-07');
    const summary = aggregateSwimmingWeeks([
      swimming(),
      swimming({ id: 'swim-2', durationMinutes: 20, distanceMeters: 500, rpe: 7 }),
    ], weeks).at(-1);

    expect(summary).toMatchObject({
      distanceMeters: 2500,
      durationMinutes: 60,
      sessionCount: 2,
      longestDistanceMeters: 2000,
      averageRpe: 6,
      weightedPaceSecondsPer100m: 144,
    });
  });

  it('calcule l’adhérence calorique et protéique sur les jours suivis', () => {
    const weeks = createTwelveWeekWindow('2026-06-07');
    const statuses: DailyJournalStatus[] = [{
      ...metadata,
      id: 'status',
      date: '2026-06-02',
      isComplete: true,
    }];
    const summary = aggregateNutritionWeeks([
      productEntry('2026-06-02', 1900, 150),
      productEntry('2026-06-03', 1500, 100),
    ], [
      target('2026-06-02'),
      target('2026-06-03'),
    ], statuses, weeks).at(-1);

    expect(summary).toMatchObject({
      trackedDayCount: 2,
      completedDayCount: 1,
      averageConsumedCaloriesKcal: 1700,
      averageTargetCaloriesKcal: 2000,
      averageConsumedProteinGrams: 125,
      averageTargetProteinGrams: 140,
      calorieAdherencePercent: 50,
      proteinAdherencePercent: 50,
    });
  });

  it('calcule les pas moyens uniquement sur les jours renseignés', () => {
    const weeks = createTwelveWeekWindow('2026-06-07');
    const steps: DailySteps[] = [
      { ...metadata, id: 'steps-1', date: '2026-06-02', totalSteps: 8_000, source: 'manual' },
      { ...metadata, id: 'steps-2', date: '2026-06-03', totalSteps: 12_000, source: 'manual' },
    ];
    const summary = aggregateActivityWeeks([running()], steps, weeks).at(-1);
    expect(summary).toMatchObject({
      averageSteps: 10_000,
      recordedStepDays: 2,
      totalSportMinutes: 50,
      sessionCount: 1,
    });
    expect(summary?.breakdown[0]).toMatchObject({ type: 'running', durationMinutes: 50 });
  });

  it('calcule une moyenne mobile sur sept jours calendaires sans interpolation', () => {
    const weights: WeightEntry[] = [
      { ...metadata, id: 'w1', date: '2026-06-01', weightKg: 80 },
      { ...metadata, id: 'w2', date: '2026-06-05', weightKg: 79 },
      { ...metadata, id: 'w3', date: '2026-06-08', weightKg: 78 },
    ];
    const points = calculateWeightMovingAverage(weights, profile);
    expect(points.map((point) => point.movingAverageKg)).toEqual([80, 79.5, 78.5]);
    expect(points.at(-1)?.sampleCount).toBe(2);
  });

  it('calcule la trajectoire cible par variation hebdomadaire composée', () => {
    expect(calculateTargetWeight(profile, '2026-01-08')).toBe(79.6);
  });

  it('calcule les moyennes hebdomadaires de poids et le nombre de pesées', () => {
    const weeks = createTwelveWeekWindow('2026-06-07');
    const summary = aggregateWeightWeeks([
      { ...metadata, id: 'w1', date: '2026-06-02', weightKg: 80 },
      { ...metadata, id: 'w2', date: '2026-06-04', weightKg: 79 },
    ], weeks, profile).at(-1);
    expect(summary?.averageWeightKg).toBe(79.5);
    expect(summary?.weighInCount).toBe(2);
  });

  it('construit un historique journalier trié du plus récent au plus ancien', () => {
    const activities: Activity[] = [running({ date: '2026-06-02' })];
    const days = buildHistoryDays({
      activities,
      weights: [{ ...metadata, id: 'weight', date: '2026-06-03', weightKg: 79 }],
      steps: [{ ...metadata, id: 'steps', date: '2026-06-02', totalSteps: 10_000, source: 'manual' }],
      foodEntries: [productEntry('2026-06-02', 1900, 150)],
      dailyTargets: [target('2026-06-02')],
      journalStatuses: [{ ...metadata, id: 'status', date: '2026-06-02', isComplete: true }],
    });

    expect(days.map((day) => day.date)).toEqual(['2026-06-03', '2026-06-02']);
    expect(days[1]).toMatchObject({
      activityCount: 1,
      sportMinutes: 50,
      totalSteps: 10_000,
      consumedCaloriesKcal: 1900,
      targetCaloriesKcal: 2000,
      journalComplete: true,
    });
  });
});
