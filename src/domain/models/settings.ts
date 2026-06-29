import type { EntityMetadata, IsoDateTime } from '@/domain/models/common';
import type { EnduranceTemplate, SwimmingSessionType } from '@/domain/models/activity';
import type { DashboardPreferences } from '@/domain/dashboard/dashboardPreferences';
import type { RoutineReminderPreferences } from '@/domain/reminders/routineReminder';

export type ThemePreference = 'system' | 'light' | 'dark';
export type BackupReminderIntervalDays = 0 | 7 | 14 | 30;

export interface AppSettings extends EntityMetadata {
  theme: ThemePreference;
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
  requestPersistentStorage: boolean;
  backupReminderIntervalDays: BackupReminderIntervalDays;
  restTimerAutoStart: boolean;
  restTimerSoundEnabled: boolean;
  restTimerVibrationEnabled: boolean;
  enduranceTemplates?: EnduranceTemplate[];
  enduranceTemplatesVersion?: number;
  dashboardPreferences?: DashboardPreferences;
  routineReminderPreferences?: RoutineReminderPreferences;
  lastBackupExportedAt?: IsoDateTime;
  lastBackupAppVersion?: string;
  lastBackupSchemaVersion?: number;
}
