import { useContext, useMemo } from 'react';

import { ToastContext, type ToastAction } from '@/shared/toast/ToastContext';
import { queuePendingToast } from '@/shared/toast/pendingToast';

interface ActionSuccessInput {
  key: string;
  title: string;
  description?: string;
  action?: ToastAction;
  durationMs?: number;
}

interface ActionErrorInput {
  key: string;
  title?: string;
  error: unknown;
  fallback: string;
}

const suppressedActionToasts = new Set<string>();

export function suppressNextActionToast(key: string): void {
  suppressedActionToasts.add(key);
}

function consumeActionToastSuppression(key: string): boolean {
  if (!suppressedActionToasts.has(key)) return false;
  suppressedActionToasts.delete(key);
  return true;
}

export function getActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : fallback;
}

export function useActionToast() {
  const toast = useContext(ToastContext);

  return useMemo(() => ({
    success({ key, title, description, action, durationMs }: ActionSuccessInput): string {
      if (consumeActionToastSuppression(key) || !toast) return '';
      return toast.showToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
        ...(action === undefined ? {} : { action }),
        ...(durationMs === undefined ? {} : { durationMs }),
      });
    },
    successAfterReload({ key, title, description }: ActionSuccessInput): void {
      if (consumeActionToastSuppression(key)) return;
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
