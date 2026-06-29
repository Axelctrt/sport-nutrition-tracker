import {
  APP_SETTINGS_ID,
  DEVICE_SETTINGS_ID,
  USER_SETTINGS_ID,
} from '@/domain/defaults/identifiers';
import {
  createDefaultRoutineReminderPreferences,
  normalizeRoutineReminderPreferences,
} from '@/domain/reminders/routineReminder';
import {
  createDefaultDashboardPreferences,
  normalizeDashboardPreferences,
} from '@/domain/dashboard/dashboardPreferences';
import type { EnduranceTemplate } from '@/domain/models/activity';
import type {
  AppSettings,
  DeviceSettings,
  UserSettings,
} from '@/domain/models/settings';
import { createEntity } from '@/shared/utils/entities';

export const DEFAULT_SWIMMING_MET_VALUES: UserSettings['swimmingMetValues'] = {
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

export function createDefaultUserSettings(): UserSettings {
  return createEntity(
    {
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
      enduranceTemplates: DEFAULT_ENDURANCE_TEMPLATES.map((template) => ({
        ...template,
      })),
      enduranceTemplatesVersion: 1,
      dashboardPreferences: createDefaultDashboardPreferences(),
      routineReminderPreferences: createDefaultRoutineReminderPreferences(),
    },
    USER_SETTINGS_ID,
  );
}

export function createDefaultDeviceSettings(
  deviceId: string = crypto.randomUUID(),
): DeviceSettings {
  return createEntity(
    {
      deviceId,
      theme: 'system',
      requestPersistentStorage: true,
      backupReminderIntervalDays: 0,
      restTimerAutoStart: true,
      restTimerSoundEnabled: false,
      restTimerVibrationEnabled: true,
    },
    DEVICE_SETTINGS_ID,
  );
}

export function normalizeUserSettings(
  settings: UserSettings,
): UserSettings {
  return {
    ...settings,
    enduranceTemplates:
      settings.enduranceTemplates ??
      DEFAULT_ENDURANCE_TEMPLATES.map((template) => ({ ...template })),
    enduranceTemplatesVersion: settings.enduranceTemplatesVersion ?? 1,
    dashboardPreferences: normalizeDashboardPreferences(
      settings.dashboardPreferences,
    ),
    routineReminderPreferences: normalizeRoutineReminderPreferences(
      settings.routineReminderPreferences,
    ),
  };
}

export function normalizeDeviceSettings(
  settings: DeviceSettings,
): DeviceSettings {
  return {
    ...settings,
    deviceId: settings.deviceId || crypto.randomUUID(),
    theme: settings.theme ?? 'system',
    requestPersistentStorage: settings.requestPersistentStorage ?? true,
    backupReminderIntervalDays: settings.backupReminderIntervalDays ?? 0,
    restTimerAutoStart: settings.restTimerAutoStart ?? true,
    restTimerSoundEnabled: settings.restTimerSoundEnabled ?? false,
    restTimerVibrationEnabled:
      settings.restTimerVibrationEnabled ?? true,
  };
}

export function composeAppSettings(
  user: UserSettings,
  device: DeviceSettings,
): AppSettings {
  const normalizedUser = normalizeUserSettings(user);
  const normalizedDevice = normalizeDeviceSettings(device);

  return {
    ...normalizedUser,
    id: APP_SETTINGS_ID,
    createdAt: normalizedUser.createdAt,
    updatedAt:
      normalizedUser.updatedAt > normalizedDevice.updatedAt
        ? normalizedUser.updatedAt
        : normalizedDevice.updatedAt,
    theme: normalizedDevice.theme,
    requestPersistentStorage: normalizedDevice.requestPersistentStorage,
    backupReminderIntervalDays:
      normalizedDevice.backupReminderIntervalDays,
    restTimerAutoStart: normalizedDevice.restTimerAutoStart,
    restTimerSoundEnabled: normalizedDevice.restTimerSoundEnabled,
    restTimerVibrationEnabled: normalizedDevice.restTimerVibrationEnabled,
    ...(normalizedDevice.lastBackupExportedAt === undefined
      ? {}
      : { lastBackupExportedAt: normalizedDevice.lastBackupExportedAt }),
    ...(normalizedDevice.lastBackupAppVersion === undefined
      ? {}
      : { lastBackupAppVersion: normalizedDevice.lastBackupAppVersion }),
    ...(normalizedDevice.lastBackupSchemaVersion === undefined
      ? {}
      : { lastBackupSchemaVersion: normalizedDevice.lastBackupSchemaVersion }),
  };
}

export function splitAppSettings(settings: AppSettings): {
  user: UserSettings;
  device: DeviceSettings;
} {
  const {
    theme,
    requestPersistentStorage,
    backupReminderIntervalDays,
    restTimerAutoStart,
    restTimerSoundEnabled,
    restTimerVibrationEnabled,
    lastBackupExportedAt,
    lastBackupAppVersion,
    lastBackupSchemaVersion,
    ...userValues
  } = settings;

  return {
    user: normalizeUserSettings({
      ...userValues,
      id: USER_SETTINGS_ID,
    }),
    device: normalizeDeviceSettings({
      id: DEVICE_SETTINGS_ID,
      deviceId: crypto.randomUUID(),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      theme,
      requestPersistentStorage,
      backupReminderIntervalDays,
      restTimerAutoStart,
      restTimerSoundEnabled,
      restTimerVibrationEnabled,
      ...(lastBackupExportedAt === undefined
        ? {}
        : { lastBackupExportedAt }),
      ...(lastBackupAppVersion === undefined
        ? {}
        : { lastBackupAppVersion }),
      ...(lastBackupSchemaVersion === undefined
        ? {}
        : { lastBackupSchemaVersion }),
    }),
  };
}

export function createDefaultAppSettings(): AppSettings {
  return composeAppSettings(
    createDefaultUserSettings(),
    createDefaultDeviceSettings(),
  );
}

export function normalizeAppSettings(settings: AppSettings): AppSettings {
  const split = splitAppSettings(settings);
  return composeAppSettings(split.user, split.device);
}
