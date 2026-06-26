import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastItem,
  type ToastTone,
} from '@/shared/toast/ToastContext';
import { ToastViewport } from '@/shared/toast/ToastViewport';
import { createEntityId } from '@/shared/utils/entities';

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 3_500,
  info: 5_000,
  error: 8_000,
};

function createDedupeKey(input: ToastInput, tone: ToastTone): string {
  return input.dedupeKey ?? `${tone}:${input.title}:${input.description ?? ''}`;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastsRef = useRef<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const commit = useCallback((next: ToastItem[]) => {
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    commit(toastsRef.current.filter((toast) => toast.id !== id));
  }, [commit]);

  const scheduleDismiss = useCallback((id: string, durationMs: number | null) => {
    const currentTimer = timersRef.current.get(id);
    if (currentTimer) clearTimeout(currentTimer);
    timersRef.current.delete(id);

    if (durationMs === null) return;

    timersRef.current.set(
      id,
      setTimeout(() => dismissToast(id), durationMs),
    );
  }, [dismissToast]);

  const showToast = useCallback((input: ToastInput): string => {
    const tone = input.tone ?? 'info';
    const dedupeKey = createDedupeKey(input, tone);
    const durationMs = input.durationMs === undefined ? DEFAULT_DURATION[tone] : input.durationMs;
    const duplicate = toastsRef.current.find((toast) => toast.dedupeKey === dedupeKey);

    if (duplicate) {
      const { description: _previousDescription, ...duplicateWithoutDescription } = duplicate;
      const refreshed: ToastItem = {
        ...duplicateWithoutDescription,
        title: input.title,
        tone,
        durationMs,
        ...(input.description === undefined ? {} : { description: input.description }),
      };
      commit(toastsRef.current.map((toast) => toast.id === duplicate.id ? refreshed : toast));
      scheduleDismiss(duplicate.id, durationMs);
      return duplicate.id;
    }

    const item: ToastItem = {
      id: createEntityId(),
      title: input.title,
      tone,
      durationMs,
      dedupeKey,
      ...(input.description === undefined ? {} : { description: input.description }),
    };
    const next = [...toastsRef.current, item].slice(-MAX_VISIBLE_TOASTS);
    const nextIds = new Set(next.map((toast) => toast.id));
    for (const toast of toastsRef.current) {
      if (!nextIds.has(toast.id)) {
        const timer = timersRef.current.get(toast.id);
        if (timer) clearTimeout(timer);
        timersRef.current.delete(toast.id);
      }
    }
    commit(next);
    scheduleDismiss(item.id, durationMs);
    return item.id;
  }, [commit, scheduleDismiss]);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
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
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
