import { APP_SETTINGS_ID } from '@/domain/defaults/identifiers';
import { createDefaultRoutineReminderPreferences, normalizeRoutineReminderPreferences } from '@/domain/reminders/routineReminder';
import {
  createDefaultDashboardPreferences,
  normalizeDashboardPreferences,
} from '@/domain/dashboard/dashboardPreferences';
import type { EnduranceTemplate } from '@/domain/models/activity';
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


export const DEFAULT_ENDURANCE_TEMPLATES: EnduranceTemplate[] = [
  {
    id: 'endurance-template-running-easy',
    name: 'Course facile 45 min',
    activityType: 'running',
    durationMinutes: 45,
    intensity: 'low',
    runningSessionType: 'easy',
    distanceKm: 7,
    averageCadenceSpm: 170,
    terrainType: 'road',
  },
  {
    id: 'endurance-template-running-intervals',
    name: '10 × 400 m',
    activityType: 'running',
    durationMinutes: 60,
    intensity: 'high',
    runningSessionType: 'intervals',
    distanceKm: 10,
    averageCadenceSpm: 175,
    terrainType: 'track',
    intervalDetails: '10 × 400 m, récupération 1 min.',
  },
  {
    id: 'endurance-template-swimming-endurance',
    name: 'Natation endurance 1 500 m',
    activityType: 'swimming',
    durationMinutes: 45,
    intensity: 'moderate',
    swimmingSessionType: 'endurance',
    mainStroke: 'freestyle',
    distanceMeters: 1_500,
    poolLengthMeters: 25,
  },
  {
    id: 'endurance-template-cycling-endurance',
    name: 'Vélo endurance 90 min',
    activityType: 'cycling',
    durationMinutes: 90,
    intensity: 'moderate',
    distanceKm: 35,
    cyclingMet: 6.8,
    bikeType: 'road',
    cyclingEnvironment: 'outdoor',
  },
];

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
      restTimerAutoStart: true,
      restTimerSoundEnabled: false,
      restTimerVibrationEnabled: true,
      enduranceTemplates: DEFAULT_ENDURANCE_TEMPLATES.map((template) => ({ ...template })),
      enduranceTemplatesVersion: 1,
      dashboardPreferences: createDefaultDashboardPreferences(),
      routineReminderPreferences: createDefaultRoutineReminderPreferences(),
    },
    APP_SETTINGS_ID,
  );
}

export function normalizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    backupReminderIntervalDays: settings.backupReminderIntervalDays ?? 0,
    restTimerAutoStart: settings.restTimerAutoStart ?? true,
    restTimerSoundEnabled: settings.restTimerSoundEnabled ?? false,
    restTimerVibrationEnabled: settings.restTimerVibrationEnabled ?? true,
    enduranceTemplates: settings.enduranceTemplates ?? DEFAULT_ENDURANCE_TEMPLATES.map((template) => ({ ...template })),
    enduranceTemplatesVersion: settings.enduranceTemplatesVersion ?? 1,
    dashboardPreferences: normalizeDashboardPreferences(settings.dashboardPreferences),
    routineReminderPreferences: normalizeRoutineReminderPreferences(settings.routineReminderPreferences),
  };
}
