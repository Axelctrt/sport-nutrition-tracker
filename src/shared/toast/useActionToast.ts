import { useContext, useMemo } from 'react';

import {
  ToastContext,
  type ToastAction,
  type ToastDestination,
} from '@/shared/toast/ToastContext';
import { queuePendingToast } from '@/shared/toast/pendingToast';

interface ActionSuccessInput {
  key: string;
  title: string;
  description?: string;
  action?: ToastAction;
  destination?: ToastDestination;
  durationMs?: number;
}

interface ActionErrorInput {
  key: string;
  title?: string;
  error: unknown;
  fallback: string;
  destination?: ToastDestination;
}

const suppressedActionToasts = new Set<string>();
const celebrationOnlySuccessKeys = new Set([
  'onboarding-profile-create',
]);

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
    success({ key, title, description, action, destination, durationMs }: ActionSuccessInput): string {
      if (
        celebrationOnlySuccessKeys.has(key)
        || consumeActionToastSuppression(key)
        || !toast
      ) return '';
      return toast.showToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
        ...(action === undefined ? {} : { action }),
        ...(destination === undefined ? {} : { destination }),
        ...(durationMs === undefined ? {} : { durationMs }),
      });
    },
    successAfterReload({ key, title, description, destination }: ActionSuccessInput): void {
      if (celebrationOnlySuccessKeys.has(key) || consumeActionToastSuppression(key)) return;
      queuePendingToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
        ...(destination === undefined ? {} : { destination }),
      });
    },
    error({ key, title = 'Modification impossible', error, fallback, destination }: ActionErrorInput): string {
      if (!toast) return '';
      return toast.showToast({
        title,
        description: getActionErrorMessage(error, fallback),
        tone: 'error',
        dedupeKey: `action-error:${key}`,
        ...(destination === undefined ? {} : { destination }),
      });
    },
  }), [toast]);
}
