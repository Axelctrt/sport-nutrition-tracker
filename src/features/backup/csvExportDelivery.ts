import type { CsvExportFile } from '@/infrastructure/backup/csvExportService';

export type CsvExportShareResult =
  | 'shared'
  | 'cancelled'
  | 'unsupported';

export type CsvFileDownloader = (
  content: string,
  fileName: string,
  mimeType: string,
) => void;

export interface CsvShareNavigator {
  canShare?: (data?: { files?: File[] }) => boolean;
  share?: (data?: {
    files?: File[];
    title?: string;
    text?: string;
  }) => Promise<void>;
}

function browserNavigator(): CsvShareNavigator | undefined {
  return typeof navigator === 'undefined'
    ? undefined
    : navigator;
}

function defaultDownload(
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

export function downloadCsvExportFile(
  file: CsvExportFile,
  download: CsvFileDownloader = defaultDownload,
): void {
  download(file.content, file.fileName, 'text/csv');
}

export function downloadCsvExportFiles(
  files: readonly CsvExportFile[],
  download: CsvFileDownloader = defaultDownload,
): number {
  for (const file of files) {
    downloadCsvExportFile(file, download);
  }

  return files.length;
}

export async function shareCsvExportFiles(
  files: readonly CsvExportFile[],
  navigatorLike: CsvShareNavigator | undefined =
    browserNavigator(),
): Promise<CsvExportShareResult> {
  if (
    files.length === 0 ||
    !navigatorLike?.share ||
    !navigatorLike.canShare
  ) {
    return 'unsupported';
  }

  const shareFiles = files.map(
    (file) =>
      new File([file.content], file.fileName, {
        type: 'text/csv;charset=utf-8',
      }),
  );

  if (!navigatorLike.canShare({ files: shareFiles })) {
    return 'unsupported';
  }

  try {
    await navigatorLike.share({
      files: shareFiles,
      title: 'Exports CSV SportPilot',
      text: `${files.length} fichier(s) de données SportPilot.`,
    });
    return 'shared';
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      return 'cancelled';
    }

    throw error;
  }
}
