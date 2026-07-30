import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastItem,
  type ToastTone,
} from '@/shared/toast/ToastContext';
import { ToastViewport } from '@/shared/toast/ToastViewport';
import { consumePendingToast } from '@/shared/toast/pendingToast';
import { createEntityId } from '@/shared/utils/entities';

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 3_500,
  info: 5_000,
  error: 10_000,
};

export const TOAST_HIGHLIGHT_STORAGE_KEY = 'sportpilot:toast-highlight:v1';

function createDedupeKey(input: ToastInput, tone: ToastTone): string {
  return input.dedupeKey ?? `${tone}:${input.title}:${input.description ?? ''}`;
}

function refreshToast(item: ToastItem, input: ToastInput, tone: ToastTone, durationMs: number | null): ToastItem {
  return {
    id: item.id,
    dedupeKey: item.dedupeKey,
    title: input.title,
    tone,
    durationMs,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.action === undefined ? {} : { action: input.action }),
    ...(input.destination === undefined ? {} : { destination: input.destination }),
  };
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastsRef = useRef<ToastItem[]>([]);
  const queueRef = useRef<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const dismissToastRef = useRef<(id: string) => void>(() => undefined);

  const commit = useCallback((next: ToastItem[]) => {
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const scheduleDismiss = useCallback((id: string, durationMs: number | null) => {
    clearTimer(id);
    if (durationMs === null) return;

    timersRef.current.set(
      id,
      setTimeout(() => dismissToastRef.current(id), durationMs),
    );
  }, [clearTimer]);

  const activateNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      commit([]);
      return;
    }

    commit([next]);
    scheduleDismiss(next.id, next.durationMs);
  }, [commit, scheduleDismiss]);

  const dismissToast = useCallback((id: string) => {
    const visible = toastsRef.current.some((toast) => toast.id === id);
    clearTimer(id);

    if (!visible) {
      queueRef.current = queueRef.current.filter((toast) => toast.id !== id);
      return;
    }

    commit([]);
    activateNext();
  }, [activateNext, clearTimer, commit]);
  dismissToastRef.current = dismissToast;

  const showToast = useCallback((input: ToastInput): string => {
    const tone = input.tone ?? 'info';
    const dedupeKey = createDedupeKey(input, tone);
    const durationMs = input.durationMs === undefined ? DEFAULT_DURATION[tone] : input.durationMs;
    const visibleDuplicate = toastsRef.current.find((toast) => toast.dedupeKey === dedupeKey);

    if (visibleDuplicate) {
      const refreshed = refreshToast(visibleDuplicate, input, tone, durationMs);
      commit([refreshed]);
      scheduleDismiss(refreshed.id, durationMs);
      return refreshed.id;
    }

    const queuedIndex = queueRef.current.findIndex((toast) => toast.dedupeKey === dedupeKey);
    if (queuedIndex >= 0) {
      const queued = queueRef.current[queuedIndex];
      if (!queued) return '';
      const refreshed = refreshToast(queued, input, tone, durationMs);
      queueRef.current = queueRef.current.map((toast, index) => index === queuedIndex ? refreshed : toast);
      return refreshed.id;
    }

    const item: ToastItem = {
      id: createEntityId(),
      title: input.title,
      tone,
      durationMs,
      dedupeKey,
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.action === undefined ? {} : { action: input.action }),
      ...(input.destination === undefined ? {} : { destination: input.destination }),
    };

    if (toastsRef.current.length === 0) {
      commit([item]);
      scheduleDismiss(item.id, durationMs);
    } else if (input.enqueue) {
      queueRef.current.push(item);
    } else {
      for (const toast of toastsRef.current) clearTimer(toast.id);
      commit([item]);
      scheduleDismiss(item.id, durationMs);
    }

    return item.id;
  }, [clearTimer, commit, scheduleDismiss]);

  useEffect(() => {
    const pendingToast = consumePendingToast();
    if (pendingToast) showToast(pendingToast);
  }, [showToast]);

  const runToastAction = useCallback((toast: ToastItem) => {
    if (!toast.action && !toast.destination) return;

    dismissToast(toast.id);

    if (toast.destination) {
      if (toast.destination.highlightId) {
        try {
          window.sessionStorage.setItem(
            TOAST_HIGHLIGHT_STORAGE_KEY,
            JSON.stringify({
              id: toast.destination.highlightId,
              createdAt: Date.now(),
            }),
          );
        } catch {
          // La navigation reste disponible si le stockage temporaire est bloqué.
        }
      }
      window.location.hash = toast.destination.path;
      return;
    }

    try {
      void Promise.resolve(toast.action?.onClick()).catch(() => undefined);
    } catch {
      // L’action métier publie son propre message d’erreur.
    }
  }, [dismissToast]);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
    queueRef.current = [];
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    dismissToast,
    success: (title, description) => showToast({
      title,
      tone: 'success',
      ...(description === undefined ? {} : { description }),
    }),
    error: (title, description) => showToast({
      title,
      tone: 'error',
      ...(description === undefined ? {} : { description }),
    }),
    info: (title, description) => showToast({
      title,
      tone: 'info',
      ...(description === undefined ? {} : { description }),
    }),
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismissToast}
        onAction={runToastAction}
      />
    </ToastContext.Provider>
  );
}
