import { calculateCalorieTarget } from '@/domain/calculations/calorieTarget';
import { DAILY_TARGET_CALCULATION_VERSION } from '@/domain/calculations/constants';
import {
  calculateDailyExpenditure,
  type DailyExpenditureInput,
  type DailyExpenditureResult,
} from '@/domain/calculations/expenditure';
import {
  calculateMacroTargets,
  type MacroTargetsResult,
} from '@/domain/calculations/macros';
import type { DailyMacroTargets } from '@/domain/models/targets';

export interface DailyTargetCalculationInput extends DailyExpenditureInput {
  acceptedCalibrationAdjustmentKcal?: number;
}

export interface DailyTargetCalculationResult extends DailyExpenditureResult {
  calculationWeightKg: number;
  targetWeeklyWeightChangePercentUsed: number;
  goalRateWasNormalized: boolean;
  goalAdjustmentKcal: number;
  acceptedCalibrationAdjustmentKcal: number;
  targetBeforeFloorKcal: number;
  calorieFloorKcal: number;
  targetCaloriesKcal: number;
  floorApplied: boolean;
  macros: DailyMacroTargets;
  macroDetails: Omit<MacroTargetsResult, 'macros'>;
  calculationVersion: number;
}

export function calculateDailyTarget({
  acceptedCalibrationAdjustmentKcal = 0,
  ...expenditureInput
}: DailyTargetCalculationInput): DailyTargetCalculationResult {
  const expenditure = calculateDailyExpenditure(expenditureInput);
  const calorieTarget = calculateCalorieTarget({
    weightKg: expenditureInput.weightKg,
    goal: expenditureInput.profile.goal,
    targetWeeklyWeightChangePercent:
      expenditureInput.profile.targetWeeklyWeightChangePercent,
    totalEstimatedExpenditureKcal:
      expenditure.energy.totalEstimatedExpenditureKcal,
    bmrKcal: expenditure.energy.bmrKcal,
    calorieFloorBmrMultiplier:
      expenditureInput.settings.calorieFloorBmrMultiplier,
    acceptedCalibrationAdjustmentKcal,
  });
  const macroResult = calculateMacroTargets({
    targetCaloriesKcal: calorieTarget.targetCaloriesKcal,
    weightKg: expenditureInput.weightKg,
    proteinGramsPerKg: expenditureInput.profile.proteinGramsPerKg,
    fatGramsPerKg: expenditureInput.profile.fatGramsPerKg,
  });

  return {
    ...expenditure,
    calculationWeightKg: expenditureInput.weightKg,
    targetWeeklyWeightChangePercentUsed:
      calorieTarget.targetWeeklyWeightChangePercentUsed,
    goalRateWasNormalized: calorieTarget.goalRateWasNormalized,
    goalAdjustmentKcal: calorieTarget.goalAdjustmentKcal,
    acceptedCalibrationAdjustmentKcal:
      calorieTarget.acceptedCalibrationAdjustmentKcal,
    targetBeforeFloorKcal: calorieTarget.targetBeforeFloorKcal,
    calorieFloorKcal: calorieTarget.calorieFloorKcal,
    targetCaloriesKcal: calorieTarget.targetCaloriesKcal,
    floorApplied: calorieTarget.floorApplied,
    macros: macroResult.macros,
    macroDetails: {
      fixedMacroCaloriesKcal: macroResult.fixedMacroCaloriesKcal,
      remainingCaloriesForCarbohydratesKcal:
        macroResult.remainingCaloriesForCarbohydratesKcal,
      carbohydratesClampedToZero:
        macroResult.carbohydratesClampedToZero,
    },
    calculationVersion: DAILY_TARGET_CALCULATION_VERSION,
  };
}
