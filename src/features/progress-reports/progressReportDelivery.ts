import {
  createProgressReportFileName,
  formatProgressReportText,
  type ProgressReport,
} from '@/application/reports/progressReportService';

export type ReportDeliveryResult =
  | 'done'
  | 'cancelled'
  | 'unsupported';

export interface ReportShareNavigator {
  share?: (data?: {
    title?: string;
    text?: string;
  }) => Promise<void>;
}

export interface ReportClipboard {
  writeText?: (text: string) => Promise<void>;
}

export type TextDownloader = (
  content: string,
  fileName: string,
  mimeType: string,
) => void;

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

export function downloadProgressReport(
  report: ProgressReport,
  download: TextDownloader = defaultDownload,
): void {
  download(
    formatProgressReportText(report),
    createProgressReportFileName(report),
    'text/plain',
  );
}

export async function copyProgressReport(
  report: ProgressReport,
  clipboard: ReportClipboard | undefined =
    typeof navigator === 'undefined'
      ? undefined
      : navigator.clipboard,
): Promise<ReportDeliveryResult> {
  if (!clipboard?.writeText) return 'unsupported';

  await clipboard.writeText(formatProgressReportText(report));
  return 'done';
}

export async function shareProgressReport(
  report: ProgressReport,
  navigatorLike: ReportShareNavigator | undefined =
    typeof navigator === 'undefined' ? undefined : navigator,
): Promise<ReportDeliveryResult> {
  if (!navigatorLike?.share) return 'unsupported';

  try {
    await navigatorLike.share({
      title: 'Rapport de progression SportPilot',
      text: formatProgressReportText(report),
    });
    return 'done';
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

export function printProgressReport(
  print: (() => void) | undefined =
    typeof window === 'undefined'
      ? undefined
      : () => window.print(),
): ReportDeliveryResult {
  if (!print) return 'unsupported';
  print();
  return 'done';
}
