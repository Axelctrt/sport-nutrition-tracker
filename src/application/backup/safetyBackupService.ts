import {
  prepareBackupExport,
  type PreparedBackupExport,
} from '@/application/backup/backupApplicationService';

export type SafetyBackupReason =
  | 'before-import'
  | 'before-full-reset'
  | 'before-selective-reset';

export interface SafetyBackupResult extends PreparedBackupExport {
  safetyFileName: string;
  reason: SafetyBackupReason;
}

export type SafetyBackupDownloader = (
  content: string,
  fileName: string,
  mimeType: string,
) => void;

export class SafetyBackupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SafetyBackupError';
  }
}

const reasonFileLabels: Record<SafetyBackupReason, string> = {
  'before-import': 'avant-import',
  'before-full-reset': 'avant-effacement-complet',
  'before-selective-reset': 'avant-reinitialisation',
};

function normalizeTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.replace(/[^a-zA-Z0-9-]/g, '-');
  }

  return date
    .toISOString()
    .replace(/[:.]/g, '-');
}

export function createSafetyBackupFileName(
  exportedAt: string,
  reason: SafetyBackupReason,
): string {
  return `sportpilot-securite-${reasonFileLabels[reason]}-${normalizeTimestamp(
    exportedAt,
  )}.json`;
}

function downloadSafetyBackup(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], {
    type: `${mimeType};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function createAndDownloadSafetyBackup(
  reason: SafetyBackupReason,
  prepare: () => Promise<PreparedBackupExport> = prepareBackupExport,
  download: SafetyBackupDownloader = downloadSafetyBackup,
): Promise<SafetyBackupResult> {
  try {
    const prepared = await prepare();
    const safetyFileName = createSafetyBackupFileName(
      prepared.envelope.exportedAt,
      reason,
    );

    download(
      prepared.content,
      safetyFileName,
      'application/json',
    );

    return {
      ...prepared,
      safetyFileName,
      reason,
    };
  } catch (error) {
    throw new SafetyBackupError(
      'La sauvegarde de sécurité n’a pas pu être créée. L’opération destructive a été annulée.',
      { cause: error },
    );
  }
}
