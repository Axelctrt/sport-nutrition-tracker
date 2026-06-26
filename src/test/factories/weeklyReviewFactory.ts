import type { NewEntity } from '@/domain/models/common';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import { createEntity } from '@/shared/utils/entities';

export function createWeeklyReview(
  overrides: Partial<NewEntity<WeeklyReview>> = {},
): WeeklyReview {
  return createEntity<WeeklyReview>({
    weekStart: '2026-06-08',
    weekEnd: '2026-06-14',
    previousWeekStart: '2026-06-01',
    previousWeekEnd: '2026-06-07',
    weighInCount: 3,
    previousWeighInCount: 2,
    trackedFoodDays: 5,
    completedFoodDays: 4,
    calorieComparableDays: 4,
    averageWeightKg: 69.5,
    previousAverageWeightKg: 70,
    actualWeightChangeKg: -0.5,
    targetWeightChangeKg: -0.35,
    averageConsumedCaloriesKcal: 2_000,
    averageTargetCaloriesKcal: 2_050,
    calorieDeviationPercent: -2.4,
    calorieAdherencePercent: 92,
    proteinTargetDays: 4,
    stepGoalDays: 5,
    recordedStepDays: 6,
    isCalibrationEligible: true,
    ineligibilityReasons: [],
    rawProposedAdjustmentKcal: 120,
    proposedDecision: 'increase',
    proposedAdjustmentKcal: 100,
    currentCumulativeAdjustmentKcal: 0,
    resultingCumulativeAdjustmentKcal: 100,
    adherenceScore: 82,
    adherenceLevel: 'good',
    decisionStatus: 'pending',
    ...overrides,
  }, 'weekly-review');
}

export function createAcceptedAdjustment(
  overrides: Partial<NewEntity<AcceptedCalorieAdjustment>> = {},
): AcceptedCalorieAdjustment {
  return createEntity<AcceptedCalorieAdjustment>({
    weeklyReviewId: 'weekly-review',
    effectiveFrom: '2026-06-15',
    adjustmentKcalPerDay: 100,
    resultingCumulativeAdjustmentKcal: 100,
    status: 'active',
    ...overrides,
  }, 'adjustment');
}
