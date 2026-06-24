import type { BackupEnvelope } from '@/domain/models/backup';
import {
  createBackupEnvelope,
  createBackupFileName,
  parseBackupText,
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

export async function prepareBackupExport(): Promise<PreparedBackupExport> {
  const envelope = await createBackupEnvelope();
  return {
    envelope,
    fileName: createBackupFileName(envelope.exportedAt),
    content: serializeBackupEnvelope(envelope),
    summary: summarizeBackup(envelope),
  };
}

export function prepareBackupImport(text: string): PreparedBackupImport {
  const envelope = parseBackupText(text);
  return {
    envelope,
    summary: summarizeBackup(envelope),
  };
}

export async function applyPreparedBackupImport(prepared: PreparedBackupImport): Promise<void> {
  await replaceDatabaseFromBackup(prepared.envelope);
}
