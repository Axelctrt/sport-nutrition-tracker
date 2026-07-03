import { useContext, useMemo } from 'react';

import { ToastContext } from '@/shared/toast/ToastContext';
import { queuePendingToast } from '@/shared/toast/pendingToast';

interface ActionSuccessInput {
  key: string;
  title: string;
  description?: string;
}

interface ActionErrorInput {
  key: string;
  title?: string;
  error: unknown;
  fallback: string;
}

export function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : fallback;
}

export function useActionToast() {
  const toast = useContext(ToastContext);

  return useMemo(() => ({
    success({ key, title, description }: ActionSuccessInput): string {
      if (!toast) return '';
      return toast.showToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
      });
    },
    successAfterReload({ key, title, description }: ActionSuccessInput): void {
      queuePendingToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
      });
    },
    error({ key, title = 'Modification impossible', error, fallback }: ActionErrorInput): string {
      if (!toast) return '';
      return toast.showToast({
        title,
        description: getActionErrorMessage(error, fallback),
        tone: 'error',
        dedupeKey: `action-error:${key}`,
      });
    },
  }), [toast]);
}
