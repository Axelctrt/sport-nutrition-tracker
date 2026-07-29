import { useContext, useMemo } from 'react';

import { routePaths } from '@/app/routePaths';
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
const defaultSuccessDestinations: Partial<Record<string, ToastDestination>> = {
  'guest-data-import': {
    path: routePaths.accountDevices,
    label: 'Voir le compte et les appareils',
  },
  'cloud-account-restore': {
    path: routePaths.dashboard,
    label: 'Ouvrir l’accueil',
  },
};

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

function destinationFor(key: string, destination?: ToastDestination): ToastDestination | undefined {
  return destination ?? defaultSuccessDestinations[key];
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
      const resolvedDestination = destinationFor(key, destination);
      return toast.showToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
        ...(action === undefined ? {} : { action }),
        ...(resolvedDestination === undefined ? {} : { destination: resolvedDestination }),
        ...(durationMs === undefined ? {} : { durationMs }),
      });
    },
    successAfterReload({ key, title, description, destination }: ActionSuccessInput): void {
      if (successToastIsSuppressed(key)) return;
      const resolvedDestination = destinationFor(key, destination);
      queuePendingToast({
        title,
        tone: 'success',
        dedupeKey: `action-success:${key}`,
        ...(description === undefined ? {} : { description }),
        ...(resolvedDestination === undefined ? {} : { destination: resolvedDestination }),
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
