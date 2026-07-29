import type { UserProfile } from '@/domain/models/profile';
import type { AppSettings } from '@/domain/models/settings';
import type {
  DailyTargetEnergyInputSnapshot,
  DailyTargetEnergyProfileInputs,
  DailyTargetEnergySettingsInputs,
} from '@/domain/models/targets';

export const DAILY_TARGET_ENERGY_INPUT_SNAPSHOT_VERSION = 1;

export function buildDailyTargetEnergyInputSnapshot(
  profile: UserProfile,
  settings: AppSettings,
): DailyTargetEnergyInputSnapshot {
  const profileInputs: DailyTargetEnergyProfileInputs = {
    sexForEnergyEquation: profile.sexForEnergyEquation,
    ageInformation: { ...profile.ageInformation },
    heightCm: profile.heightCm,
    goal: profile.goal,
    targetWeeklyWeightChangePercent:
      profile.targetWeeklyWeightChangePercent,
    occupationalActivity: profile.occupationalActivity,
    dailyStepGoal: profile.dailyStepGoal,
    proteinGramsPerKg: profile.proteinGramsPerKg,
    fatGramsPerKg: profile.fatGramsPerKg,
  };
  const settingsInputs: DailyTargetEnergySettingsInputs = {
    includedBaseSteps: settings.includedBaseSteps,
    walkingKcalPerKgPerKm: settings.walkingKcalPerKgPerKm,
    runningKcalPerKgPerKm: settings.runningKcalPerKgPerKm,
    strengthTrainingMet: settings.strengthTrainingMet,
    calorieFloorBmrMultiplier: settings.calorieFloorBmrMultiplier,
    defaultCyclingMet: settings.defaultCyclingMet,
    defaultWalkingMet: settings.defaultWalkingMet,
    defaultOtherCardioMet: settings.defaultOtherCardioMet,
    swimmingMetValues: { ...settings.swimmingMetValues },
  };

  return {
    version: DAILY_TARGET_ENERGY_INPUT_SNAPSHOT_VERSION,
    profile: profileInputs,
    settings: settingsInputs,
  };
}

export function restoreDailyTargetEnergyContext(
  snapshot: DailyTargetEnergyInputSnapshot,
  fallbackProfile: UserProfile,
  fallbackSettings: AppSettings,
): {
  profile: UserProfile;
  settings: AppSettings;
} {
  return {
    profile: {
      ...fallbackProfile,
      ...snapshot.profile,
      ageInformation: { ...snapshot.profile.ageInformation },
    },
    settings: {
      ...fallbackSettings,
      ...snapshot.settings,
      swimmingMetValues: { ...snapshot.settings.swimmingMetValues },
    },
  };
}
