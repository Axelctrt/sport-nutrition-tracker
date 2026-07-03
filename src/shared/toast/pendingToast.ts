import type { ToastInput, ToastTone } from "@/shared/toast/ToastContext";

const PENDING_TOAST_STORAGE_KEY = "sportpilot:pending-toast:v1";

interface PendingToastPayload {
  title: string;
  description?: string;
  tone: ToastTone;
  durationMs?: number | null;
  dedupeKey?: string;
}

function isToastTone(value: unknown): value is ToastTone {
  return value === "success" || value === "error" || value === "info";
}

function getSessionStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function queuePendingToast(input: ToastInput): void {
  const storage = getSessionStorage();
  if (!storage) return;

  const payload: PendingToastPayload = {
    title: input.title,
    tone: input.tone ?? "info",
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
    ...(input.dedupeKey === undefined ? {} : { dedupeKey: input.dedupeKey }),
  };

  try {
    storage.setItem(PENDING_TOAST_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Une notification ne doit jamais bloquer l’action métier.
  }
}

export function consumePendingToast(): ToastInput | undefined {
  const storage = getSessionStorage();
  if (!storage) return undefined;

  let serialized: string | null = null;
  try {
    serialized = storage.getItem(PENDING_TOAST_STORAGE_KEY);
    storage.removeItem(PENDING_TOAST_STORAGE_KEY);
  } catch {
    return undefined;
  }

  if (!serialized) return undefined;

  try {
    const payload = JSON.parse(serialized) as Partial<PendingToastPayload>;
    if (typeof payload.title !== "string" || payload.title.trim() === "")
      return undefined;
    if (!isToastTone(payload.tone)) return undefined;
    if (
      payload.description !== undefined &&
      typeof payload.description !== "string"
    )
      return undefined;
    if (
      payload.durationMs !== undefined &&
      payload.durationMs !== null &&
      (typeof payload.durationMs !== "number" || payload.durationMs < 0)
    )
      return undefined;
    if (
      payload.dedupeKey !== undefined &&
      typeof payload.dedupeKey !== "string"
    )
      return undefined;

    return {
      title: payload.title,
      tone: payload.tone,
      ...(payload.description === undefined
        ? {}
        : { description: payload.description }),
      ...(payload.durationMs === undefined
        ? {}
        : { durationMs: payload.durationMs }),
      ...(payload.dedupeKey === undefined
        ? {}
        : { dedupeKey: payload.dedupeKey }),
    };
  } catch {
    return undefined;
  }
}

export const pendingToastStorageKey = PENDING_TOAST_STORAGE_KEY;
