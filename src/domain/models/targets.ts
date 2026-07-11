import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { DatedEntity } from '@/domain/models/common';

export interface DailyEnergyBreakdown {
  bmrKcal: number;
  occupationalBaseKcal: number;
  walkingKcal: number;
  runningKcal: number;
  swimmingKcal: number;
  strengthTrainingKcal: number;
  otherActivitiesKcal: number;
  plannedActivitiesKcal?: number;
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
  targetWeeklyWeightChangePercentUsed?: number;
  goalAdjustmentKcal: number;
  acceptedCalibrationAdjustmentKcal: number;
  calorieFloorKcal: number;
  targetCaloriesKcal: number;
  macros: DailyMacroTargets;
  plannedActivities?: PlannedActivityCalorieSnapshot[];
  calculationVersion: number;
}
