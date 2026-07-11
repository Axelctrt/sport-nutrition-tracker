import { KCAL_PER_KILOGRAM_OF_BODY_WEIGHT } from '@/domain/calculations/constants';
import { roundCalories, roundUpToIncrement } from '@/domain/calculations/rounding';
import {
  assertFiniteNumber,
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';
import type { WeightGoal } from '@/domain/models/profile';

export interface CalorieTargetInput {
  weightKg: number;
  goal: WeightGoal;
  targetWeeklyWeightChangePercent: number;
  totalEstimatedExpenditureKcal: number;
  bmrKcal: number;
  calorieFloorBmrMultiplier: number;
  acceptedCalibrationAdjustmentKcal?: number;
}

export interface CalorieTargetResult {
  targetWeeklyWeightChangePercentUsed: number;
  goalRateWasNormalized: boolean;
  goalAdjustmentKcal: number;
  acceptedCalibrationAdjustmentKcal: number;
  targetBeforeFloorKcal: number;
  calorieFloorKcal: number;
  targetCaloriesKcal: number;
  floorApplied: boolean;
}

export function resolveGoalCompatibleWeeklyChangePercent(
  goal: WeightGoal,
  targetWeeklyWeightChangePercent: number,
): number {
  assertFiniteNumber(
    targetWeeklyWeightChangePercent,
    'targetWeeklyWeightChangePercent',
  );

  if (goal === 'maintenance') {
    return 0;
  }

  const magnitude = Math.abs(targetWeeklyWeightChangePercent);
  return goal === 'loss' ? -magnitude : magnitude;
}

export function calculateGoalAdjustmentKcal(
  weightKg: number,
  targetWeeklyWeightChangePercent: number,
): number {
  assertPositiveNumber(weightKg, 'weightKg');
  assertFiniteNumber(
    targetWeeklyWeightChangePercent,
    'targetWeeklyWeightChangePercent',
  );

  return (
    weightKg
    * (targetWeeklyWeightChangePercent / 100)
    * KCAL_PER_KILOGRAM_OF_BODY_WEIGHT
  ) / 7;
}

export function calculateCalorieTarget({
  weightKg,
  goal,
  targetWeeklyWeightChangePercent,
  totalEstimatedExpenditureKcal,
  bmrKcal,
  calorieFloorBmrMultiplier,
  acceptedCalibrationAdjustmentKcal = 0,
}: CalorieTargetInput): CalorieTargetResult {
  assertNonNegativeNumber(
    totalEstimatedExpenditureKcal,
    'totalEstimatedExpenditureKcal',
  );
  assertPositiveNumber(bmrKcal, 'bmrKcal');
  assertPositiveNumber(calorieFloorBmrMultiplier, 'calorieFloorBmrMultiplier');
  assertFiniteNumber(
    acceptedCalibrationAdjustmentKcal,
    'acceptedCalibrationAdjustmentKcal',
  );

  const targetWeeklyWeightChangePercentUsed =
    resolveGoalCompatibleWeeklyChangePercent(
      goal,
      targetWeeklyWeightChangePercent,
    );
  const goalAdjustmentKcal = calculateGoalAdjustmentKcal(
    weightKg,
    targetWeeklyWeightChangePercentUsed,
  );
  const targetBeforeFloorKcal = totalEstimatedExpenditureKcal
    + goalAdjustmentKcal
    + acceptedCalibrationAdjustmentKcal;
  const rawCalorieFloor = bmrKcal * calorieFloorBmrMultiplier;
  const calorieFloorKcal = roundUpToIncrement(rawCalorieFloor, 10);
  const roundedTarget = roundCalories(targetBeforeFloorKcal);
  const targetCaloriesKcal = Math.max(roundedTarget, calorieFloorKcal);

  return {
    targetWeeklyWeightChangePercentUsed,
    goalRateWasNormalized:
      targetWeeklyWeightChangePercentUsed !== targetWeeklyWeightChangePercent,
    goalAdjustmentKcal,
    acceptedCalibrationAdjustmentKcal,
    targetBeforeFloorKcal,
    calorieFloorKcal,
    targetCaloriesKcal,
    floorApplied: targetCaloriesKcal === calorieFloorKcal
      && targetBeforeFloorKcal < calorieFloorKcal,
  };
}
