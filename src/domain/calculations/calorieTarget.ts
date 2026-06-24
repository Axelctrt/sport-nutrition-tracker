import { KCAL_PER_KILOGRAM_OF_BODY_WEIGHT } from '@/domain/calculations/constants';
import { roundCalories, roundUpToIncrement } from '@/domain/calculations/rounding';
import {
  assertFiniteNumber,
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';

export interface CalorieTargetInput {
  weightKg: number;
  targetWeeklyWeightChangePercent: number;
  totalEstimatedExpenditureKcal: number;
  bmrKcal: number;
  calorieFloorBmrMultiplier: number;
  acceptedCalibrationAdjustmentKcal?: number;
}

export interface CalorieTargetResult {
  goalAdjustmentKcal: number;
  acceptedCalibrationAdjustmentKcal: number;
  targetBeforeFloorKcal: number;
  calorieFloorKcal: number;
  targetCaloriesKcal: number;
  floorApplied: boolean;
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

  const goalAdjustmentKcal = calculateGoalAdjustmentKcal(
    weightKg,
    targetWeeklyWeightChangePercent,
  );
  const targetBeforeFloorKcal = totalEstimatedExpenditureKcal
    + goalAdjustmentKcal
    + acceptedCalibrationAdjustmentKcal;
  const rawCalorieFloor = bmrKcal * calorieFloorBmrMultiplier;
  const calorieFloorKcal = roundUpToIncrement(rawCalorieFloor, 10);
  const roundedTarget = roundCalories(targetBeforeFloorKcal);
  const targetCaloriesKcal = Math.max(roundedTarget, calorieFloorKcal);

  return {
    goalAdjustmentKcal,
    acceptedCalibrationAdjustmentKcal,
    targetBeforeFloorKcal,
    calorieFloorKcal,
    targetCaloriesKcal,
    floorApplied: targetCaloriesKcal === calorieFloorKcal
      && targetBeforeFloorKcal < calorieFloorKcal,
  };
}
