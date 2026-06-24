import type { DatedEntity } from '@/domain/models/common';

export interface DailyEnergyBreakdown {
  bmrKcal: number;
  occupationalBaseKcal: number;
  walkingKcal: number;
  runningKcal: number;
  swimmingKcal: number;
  strengthTrainingKcal: number;
  otherActivitiesKcal: number;
  totalEstimatedExpenditureKcal: number;
}

export interface DailyMacroTargets {
  proteinGrams: number;
  carbohydratesGrams: number;
  fatGrams: number;
}

export interface DailyTarget extends DatedEntity {
  calculationWeightKg: number;
  energy: DailyEnergyBreakdown;
  goalAdjustmentKcal: number;
  acceptedCalibrationAdjustmentKcal: number;
  calorieFloorKcal: number;
  targetCaloriesKcal: number;
  macros: DailyMacroTargets;
  calculationVersion: number;
}
