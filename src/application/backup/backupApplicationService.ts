import type { BackupEnvelope } from '@/domain/models/backup';
import type { BackupReminderIntervalDays, AppSettings } from '@/domain/models/settings';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  createBackupEnvelope,
  createBackupFileName,
  parseBackupTextWithMetadata,
  replaceDatabaseFromBackup,
  serializeBackupEnvelope,
  summarizeBackup,
  type BackupSummary,
} from '@/infrastructure/backup/backupService';

export interface PreparedBackupExport {
  envelope: BackupEnvelope;
  fileName: string;
  content: string;
  summary: BackupSummary;
}

export interface PreparedBackupImport {
  envelope: BackupEnvelope;
  summary: BackupSummary;
}

export async function loadBackupSettings(): Promise<AppSettings> {
  return repositories.settings.get();
}

export async function prepareBackupExport(): Promise<PreparedBackupExport> {
  const envelope = await createBackupEnvelope();
  return {
    envelope,
    fileName: createBackupFileName(envelope.exportedAt),
    content: serializeBackupEnvelope(envelope),
    summary: summarizeBackup(envelope),
  };
}

export async function recordSuccessfulBackupExport(
  prepared: PreparedBackupExport,
): Promise<AppSettings> {
  return repositories.settings.update({
    lastBackupExportedAt: prepared.envelope.exportedAt,
    lastBackupAppVersion: prepared.envelope.appVersion ?? __APP_VERSION__,
    lastBackupSchemaVersion: prepared.envelope.schemaVersion,
  });
}

export async function updateBackupReminderInterval(
  intervalDays: BackupReminderIntervalDays,
): Promise<AppSettings> {
  return repositories.settings.update({ backupReminderIntervalDays: intervalDays });
}

export function prepareBackupImport(text: string): PreparedBackupImport {
  const parsed = parseBackupTextWithMetadata(text);
  return {
    envelope: parsed.envelope,
    summary: summarizeBackup(parsed.envelope, parsed),
  };
}

export async function applyPreparedBackupImport(prepared: PreparedBackupImport): Promise<void> {
  await replaceDatabaseFromBackup(prepared.envelope);
}
