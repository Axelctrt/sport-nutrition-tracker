import type { EntityChanges } from '@/domain/models/common';
import type { AppSettings } from '@/domain/models/settings';
import type { SettingsFormValues } from '@/features/settings/schemas/settingsSchema';

export function settingsToFormValues(settings: AppSettings): SettingsFormValues {
  return {
    theme: settings.theme,
    includedBaseSteps: settings.includedBaseSteps,
    walkingKcalPerKgPerKm: settings.walkingKcalPerKgPerKm,
    runningKcalPerKgPerKm: settings.runningKcalPerKgPerKm,
    strengthTrainingMet: settings.strengthTrainingMet,
    calorieFloorBmrMultiplier: settings.calorieFloorBmrMultiplier,
    defaultCyclingMet: settings.defaultCyclingMet,
    defaultWalkingMet: settings.defaultWalkingMet,
    defaultOtherCardioMet: settings.defaultOtherCardioMet,
    swimmingMetValues: { ...settings.swimmingMetValues },
    maximumWeeklyAdjustmentKcal: settings.maximumWeeklyAdjustmentKcal,
    maximumCumulativeAdjustmentKcal: settings.maximumCumulativeAdjustmentKcal,
    requestPersistentStorage: settings.requestPersistentStorage,
    restTimerAutoStart: settings.restTimerAutoStart,
    restTimerSoundEnabled: settings.restTimerSoundEnabled,
    restTimerVibrationEnabled: settings.restTimerVibrationEnabled,
  };
}

export function settingsFormValuesToChanges(
  values: SettingsFormValues,
): EntityChanges<AppSettings> {
  return {
    ...values,
    swimmingMetValues: { ...values.swimmingMetValues },
  };
}
