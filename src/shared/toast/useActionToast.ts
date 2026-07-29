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
const dedicatedFeedbackSuccessKeys = new Set([
  'onboarding-profile-create',
  'weight-save',
  'progress-report-generate',
  'progress-report-delivery',
]);

export function suppressNextActionToast(key: string): void {
  suppressedActionToasts.add(key);
}

function consumeActionToastSuppression(key: string): boolean {
  if (!suppressedActionToasts.has(key)) return false;
  suppressedActionToasts.delete(key);
  return true;
}

function successToastIsSuppressed(key: string): boolean {
  return dedicatedFeedbackSuccessKeys.has(key) || consumeActionToastSuppression(key);
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
      if (successToastIsSuppressed(key) || !toast) return '';
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
      if (successToastIsSuppressed(key)) return;
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
