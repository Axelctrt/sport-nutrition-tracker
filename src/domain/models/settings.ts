import type { EntityMetadata, IsoDateTime } from '@/domain/models/common';
import type { EnduranceTemplate, SwimmingSessionType } from '@/domain/models/activity';
import type { DashboardPreferences } from '@/domain/dashboard/dashboardPreferences';
import type { RoutineReminderPreferences } from '@/domain/reminders/routineReminder';

export type ThemePreference = 'system' | 'light' | 'dark';
export type BackupReminderIntervalDays = 0 | 7 | 14 | 30;

export interface UserSettings extends EntityMetadata {
  includedBaseSteps: number;
  walkingKcalPerKgPerKm: number;
  runningKcalPerKgPerKm: number;
  strengthTrainingMet: number;
  calorieFloorBmrMultiplier: number;
  defaultCyclingMet: number;
  defaultWalkingMet: number;
  defaultOtherCardioMet: number;
  swimmingMetValues: Record<SwimmingSessionType, number>;
  maximumWeeklyAdjustmentKcal: number;
  maximumCumulativeAdjustmentKcal: number;
  enduranceTemplates?: EnduranceTemplate[];
  enduranceTemplatesVersion?: number;
  dashboardPreferences?: DashboardPreferences;
  routineReminderPreferences?: RoutineReminderPreferences;
}

export interface DeviceSettings extends EntityMetadata {
  deviceId: string;
  theme: ThemePreference;
  requestPersistentStorage: boolean;
  backupReminderIntervalDays: BackupReminderIntervalDays;
  restTimerAutoStart: boolean;
  restTimerSoundEnabled: boolean;
  restTimerVibrationEnabled: boolean;
  automaticWeightSyncEnabled: boolean;
  lastBackupExportedAt?: IsoDateTime;
  lastBackupAppVersion?: string;
  lastBackupSchemaVersion?: number;
}

/** Vue recomposée utilisée par l’application. */
export interface AppSettings extends UserSettings {
  theme: ThemePreference;
  requestPersistentStorage: boolean;
  backupReminderIntervalDays: BackupReminderIntervalDays;
  restTimerAutoStart: boolean;
  restTimerSoundEnabled: boolean;
  restTimerVibrationEnabled: boolean;
  automaticWeightSyncEnabled: boolean;
  lastBackupExportedAt?: IsoDateTime;
  lastBackupAppVersion?: string;
  lastBackupSchemaVersion?: number;
}
