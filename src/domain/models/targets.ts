import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { DatedEntity } from '@/domain/models/common';
import type {
  ExpectedStepsConfidence,
  ExpectedStepsSource,
} from '@/domain/models/steps';
import type {
  AgeInformation,
  OccupationalActivity,
  SexForEnergyEquation,
  WeightGoal,
} from '@/domain/models/profile';
import type { UserSettings } from '@/domain/models/settings';

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

export interface DailyTargetEnergyProfileInputs {
  sexForEnergyEquation: SexForEnergyEquation;
  ageInformation: AgeInformation;
  heightCm: number;
  goal: WeightGoal;
  targetWeeklyWeightChangePercent: number;
  occupationalActivity: OccupationalActivity;
  dailyStepGoal: number;
  proteinGramsPerKg: number;
  fatGramsPerKg: number;
}

export type DailyTargetEnergySettingsInputs = Pick<
  UserSettings,
  | 'includedBaseSteps'
  | 'walkingKcalPerKgPerKm'
  | 'runningKcalPerKgPerKm'
  | 'strengthTrainingMet'
  | 'calorieFloorBmrMultiplier'
  | 'defaultCyclingMet'
  | 'defaultWalkingMet'
  | 'defaultOtherCardioMet'
  | 'swimmingMetValues'
>;

export interface DailyTargetEnergyInputSnapshot {
  version: 1;
  profile: DailyTargetEnergyProfileInputs;
  settings: DailyTargetEnergySettingsInputs;
}

export interface DailyTarget extends DatedEntity {
  calculationWeightKg: number;
  energyInputSnapshot?: DailyTargetEnergyInputSnapshot;
  energy: DailyEnergyBreakdown;
  targetWeeklyWeightChangePercentUsed?: number;
  goalAdjustmentKcal: number;
  acceptedCalibrationAdjustmentKcal: number;
  calorieFloorKcal: number;
  targetCaloriesKcal: number;
  macros: DailyMacroTargets;
  plannedActivities?: PlannedActivityCalorieSnapshot[];
  stepBasis?: {
    mode: 'expected';
    steps: number;
    stepGoal: number;
    source: ExpectedStepsSource;
    confidence: ExpectedStepsConfidence;
    observedDayCount: number;
    observationWindowDays: number;
  };
  calculationVersion: number;
}
