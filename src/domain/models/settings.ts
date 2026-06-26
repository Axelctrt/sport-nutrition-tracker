import type { EntityMetadata, IsoDateTime } from '@/domain/models/common';
import type { SwimmingSessionType } from '@/domain/models/activity';

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
  lastBackupExportedAt?: IsoDateTime;
  lastBackupAppVersion?: string;
  lastBackupSchemaVersion?: number;
}
