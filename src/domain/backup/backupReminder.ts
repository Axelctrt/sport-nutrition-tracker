import type { AppSettings } from '@/domain/models/settings';

export interface BackupReminderStatus {
  enabled: boolean;
  due: boolean;
  referenceDate: string;
  daysSinceReference: number;
  intervalDays: number;
}

function wholeDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

export function getBackupReminderStatus(
  settings: AppSettings,
  now: Date = new Date(),
): BackupReminderStatus {
  const intervalDays = settings.backupReminderIntervalDays;
  const referenceDate = settings.lastBackupExportedAt ?? settings.createdAt;
  const parsedReference = new Date(referenceDate);
  const daysSinceReference = Number.isNaN(parsedReference.getTime())
    ? 0
    : wholeDaysBetween(parsedReference, now);

  return {
    enabled: intervalDays > 0,
    due: intervalDays > 0 && daysSinceReference >= intervalDays,
    referenceDate,
    daysSinceReference,
    intervalDays,
  };
}
