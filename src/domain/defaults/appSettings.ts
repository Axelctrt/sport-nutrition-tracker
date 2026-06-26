import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { AppSettings } from '@/domain/models/settings';
import { createEntity } from '@/shared/utils/entities';

export const DEFAULT_SWIMMING_MET_VALUES: AppSettings['swimmingMetValues'] = {
  recovery: 4.8,
  technique: 5.8,
  endurance: 6,
  tempo: 8.3,
  intervals: 9.8,
  competition: 10,
};

export function createDefaultAppSettings(): AppSettings {
  return createEntity(
    {
      theme: 'system',
      includedBaseSteps: 3_000,
      walkingKcalPerKgPerKm: 0.5,
      runningKcalPerKgPerKm: 1,
      strengthTrainingMet: 5,
      calorieFloorBmrMultiplier: 1.1,
      defaultCyclingMet: 6.8,
      defaultWalkingMet: 3.5,
      defaultOtherCardioMet: 7,
      swimmingMetValues: { ...DEFAULT_SWIMMING_MET_VALUES },
      maximumWeeklyAdjustmentKcal: 100,
      maximumCumulativeAdjustmentKcal: 600,
      requestPersistentStorage: true,
      backupReminderIntervalDays: 0,
    },
    APP_SETTINGS_ID,
  );
}

export function normalizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    backupReminderIntervalDays: settings.backupReminderIntervalDays ?? 0,
  };
}
