export type ShareBackupResult =
  | 'shared'
  | 'unsupported'
  | 'cancelled';

type FileShareNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError';

  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

export async function shareBackupFile(
  content: string,
  fileName: string,
): Promise<ShareBackupResult> {
  const shareNavigator = navigator as FileShareNavigator;

  if (typeof shareNavigator.share !== 'function') {
    return 'unsupported';
  }

  const file = new File([content], fileName, {
    type: 'application/json;charset=utf-8',
  });
  const shareData: ShareData = {
    files: [file],
    title: 'Sauvegarde SportPilot',
    text: 'Sauvegarde locale de mes données SportPilot.',
  };

  if (typeof shareNavigator.canShare === 'function') {
    try {
      if (!shareNavigator.canShare(shareData)) {
        return 'unsupported';
      }
    } catch {
      return 'unsupported';
    }
  }

  try {
    await shareNavigator.share(shareData);
    return 'shared';
  } catch (error) {
    if (isAbortError(error)) {
      return 'cancelled';
    }

    throw error;
  }
}
