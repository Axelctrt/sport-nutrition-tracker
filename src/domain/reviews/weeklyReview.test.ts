import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { DailyJournalStatus, FoodEntry } from '@/domain/models/food';
import type { DailySteps } from '@/domain/models/steps';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createEntity } from '@/shared/utils/entities';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeightEntry } from '@/domain/models/weight';
import {
  calculateAdherenceScore,
  calculateCalibrationProposal,
  calculateWeeklyReview,
  resolveWeeklyReviewPeriod,
} from '@/domain/reviews/weeklyReview';

const entity = { id: 'id', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' };

function weight(date: string, weightKg: number): WeightEntry {
  return { ...entity, id: `w-${date}`, date, weightKg };
}
function target(date: string, calories = 2_000, protein = 120): DailyTarget {
  return {
    ...entity, id: `t-${date}`, date, calculationWeightKg: 70,
    energy: { bmrKcal: 1600, occupationalBaseKcal: 1900, walkingKcal: 0, runningKcal: 0, swimmingKcal: 0, strengthTrainingKcal: 0, otherActivitiesKcal: 0, totalEstimatedExpenditureKcal: 1900 },
    goalAdjustmentKcal: 0, acceptedCalibrationAdjustmentKcal: 0, calorieFloorKcal: 1760,
    targetCaloriesKcal: calories, macros: { proteinGrams: protein, carbohydratesGrams: 250, fatGrams: 70 }, calculationVersion: 1,
  };
}
function food(date: string, calories = 2_000, protein = 120): FoodEntry {
  return {
    ...entity, id: `f-${date}`, date, mealId: `m-${date}`, mealSlot: 'lunch', sourceType: 'product',
    reference: { sourceType: 'product', productId: 'p', inputMode: 'amount', inputQuantity: 100, normalizedAmount: 100, normalizedUnit: 'g', nutritionPer100Snapshot: { caloriesKcal: calories, proteinGrams: protein, carbohydratesGrams: 0, fatGrams: 0 } },
  };
}
function status(date: string): DailyJournalStatus { return { ...entity, id: `s-${date}`, date, isComplete: true }; }
function steps(date: string, totalSteps: number): DailySteps { return { ...entity, id: `d-${date}`, date, totalSteps, source: 'manual' }; }

function baseInput(): Parameters<typeof calculateWeeklyReview>[0] {
  const profile = createEntity(createProfileInput({ initialWeightKg: 70, goal: 'loss', targetWeeklyWeightChangePercent: -0.5, dailyStepGoal: 8_000 }), 'profile', '2026-06-01T00:00:00.000Z');
  const dates = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11'];
  return {
    ...resolveWeeklyReviewPeriod('2026-06-10'), profile, settings: createDefaultAppSettings(),
    currentWeights: [weight('2026-06-08', 69.6), weight('2026-06-10', 69.5), weight('2026-06-12', 69.4)],
    previousWeights: [weight('2026-06-01', 70), weight('2026-06-03', 70.1), weight('2026-06-05', 69.9)],
    foodEntries: dates.map((date) => food(date)), dailyTargets: dates.map((date) => target(date)),
    journalStatuses: dates.map((date) => status(date)), dailySteps: dates.map((date) => steps(date, 9_000)),
    currentCumulativeAdjustmentKcal: 0,
  };
}

describe('weekly review', () => {
  it('résout une semaine du lundi au dimanche et la précédente', () => {
    expect(resolveWeeklyReviewPeriod('2026-06-10')).toEqual({ weekStart: '2026-06-08', weekEnd: '2026-06-14', previousWeekStart: '2026-06-01', previousWeekEnd: '2026-06-07' });
  });
  it('limite une correction à 100 kcal et le cumul à 600 kcal', () => {
    expect(calculateCalibrationProposal({ actualWeightChangeKg: -1, targetWeightChangeKg: -0.35, currentCumulativeAdjustmentKcal: 550, maximumWeeklyAdjustmentKcal: 100, maximumCumulativeAdjustmentKcal: 600 })).toMatchObject({ proposedAdjustmentKcal: 50, resultingCumulativeAdjustmentKcal: 600, decision: 'increase' });
  });
  it('calcule un score sans ton culpabilisant', () => {
    expect(calculateAdherenceScore({ completedFoodDays: 7, proteinTargetDays: 7, stepGoalDays: 7, weighInCount: 3 })).toEqual({ score: 100, level: 'excellent' });
  });
  it('rend la calibration éligible quand les données minimales sont présentes', () => {
    const review = calculateWeeklyReview(baseInput());
    expect(review.isCalibrationEligible).toBe(true);
    expect(review.actualWeightChangeKg).toBeCloseTo(-0.5, 2);
    expect(review.targetWeightChangeKg).toBeCloseTo(-0.35, 2);
    expect(review.proposedDecision).toBe('increase');
    expect(review.proposedAdjustmentKcal).toBe(100);
  });
  it('refuse la calibration lorsque les journées alimentaires sont insuffisantes', () => {
    const input = baseInput();
    input.journalStatuses = input.journalStatuses.slice(0, 3);
    const review = calculateWeeklyReview(input);
    expect(review.isCalibrationEligible).toBe(false);
    expect(review.decisionStatus).toBe('notEligible');
    expect(review.ineligibilityReasons.some((reason) => reason.includes('4 journées'))).toBe(true);
  });
  it('refuse la calibration lorsque l’écart calorique dépasse 10 %', () => {
    const input = baseInput();
    input.foodEntries = input.foodEntries.map((entry) => food(entry.date, 1_500));
    const review = calculateWeeklyReview(input);
    expect(review.isCalibrationEligible).toBe(false);
    expect(review.calorieDeviationPercent).toBe(25);
  });
});
