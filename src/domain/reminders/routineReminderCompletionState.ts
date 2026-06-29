import type { LocalDate } from '@/domain/models/common';
import type { RoutineReminderType } from '@/domain/reminders/routineReminder';

export const ROUTINE_REMINDER_DEVICE_STORAGE_KEY =
  'sportpilot:routine-reminders:v1';

export const ROUTINE_REMINDER_COMPLETION_STORAGE_KEY =
  'sportpilot:routine-reminder-completions:v1';

export interface RoutineReminderCompletion {
  date: LocalDate;
  type: RoutineReminderType;
  completedAt: string;
}

export interface RoutineReminderCompletionState {
  version: 1;
  completions: RoutineReminderCompletion[];
}

export type RoutineReminderCompletionPersistence = (
  state: RoutineReminderCompletionState,
) => Promise<void>;

interface RoutineReminderCompletionRuntime {
  state: RoutineReminderCompletionState;
  persist: RoutineReminderCompletionPersistence;
}

let runtime: RoutineReminderCompletionRuntime | undefined;
let persistenceQueue: Promise<void> = Promise.resolve();
let latestFallback: string | undefined;

function isLocalDate(value: unknown): value is LocalDate {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

function isRoutineReminderType(
  value: unknown,
): value is RoutineReminderType {
  return (
    value === 'training' ||
    value === 'nutrition' ||
    value === 'weighIn' ||
    value === 'weeklyPlanning'
  );
}

function completionKey(
  completion: Pick<RoutineReminderCompletion, 'date' | 'type'>,
): string {
  return `${completion.date}:${completion.type}`;
}

export function emptyRoutineReminderCompletionState(): RoutineReminderCompletionState {
  return { version: 1, completions: [] };
}

export function parseRoutineReminderCompletionState(
  value: unknown,
): RoutineReminderCompletionState | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as {
    version?: unknown;
    completions?: unknown;
  };

  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.completions)
  ) {
    return undefined;
  }

  const byKey = new Map<string, RoutineReminderCompletion>();

  for (const value of candidate.completions) {
    if (!value || typeof value !== 'object') continue;

    const completion = value as Record<string, unknown>;

    if (
      !isLocalDate(completion.date) ||
      !isRoutineReminderType(completion.type) ||
      typeof completion.completedAt !== 'string' ||
      completion.completedAt.length === 0
    ) {
      continue;
    }

    const normalized: RoutineReminderCompletion = {
      date: completion.date,
      type: completion.type,
      completedAt: completion.completedAt,
    };
    const key = completionKey(normalized);
    const existing = byKey.get(key);

    if (
      !existing ||
      normalized.completedAt.localeCompare(existing.completedAt) < 0
    ) {
      byKey.set(key, normalized);
    }
  }

  return {
    version: 1,
    completions: [...byKey.values()].sort((left, right) =>
      left.date.localeCompare(right.date) ||
      left.type.localeCompare(right.type),
    ),
  };
}

function cloneState(
  state: RoutineReminderCompletionState,
): RoutineReminderCompletionState {
  return {
    version: 1,
    completions: state.completions.map((completion) => ({
      ...completion,
    })),
  };
}

function readLegacyState(): RoutineReminderCompletionState | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(
      ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
    );

    return raw === null
      ? undefined
      : parseRoutineReminderCompletionState(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function writeFallback(serialized: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
      serialized,
    );
  } catch {
    // Dexie reste prioritaire lorsque le fallback est indisponible.
  }
}

function removeFallback(serialized: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (
      latestFallback === serialized &&
      window.localStorage.getItem(
        ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
      ) === serialized
    ) {
      window.localStorage.removeItem(
        ROUTINE_REMINDER_COMPLETION_STORAGE_KEY,
      );
    }
  } catch {
    // La clé sera réévaluée au prochain démarrage.
  }
}

function persistState(state: RoutineReminderCompletionState): void {
  const snapshot = cloneState(state);
  const serialized = JSON.stringify(snapshot);

  if (!runtime) {
    writeFallback(serialized);
    return;
  }

  const persist = runtime.persist;
  runtime.state = snapshot;
  latestFallback = serialized;
  writeFallback(serialized);

  persistenceQueue = persistenceQueue
    .catch(() => undefined)
    .then(() => persist(snapshot))
    .then(() => removeFallback(serialized))
    .catch((error: unknown) => {
      console.error(
        'La persistance Dexie des complétions de rappels a échoué.',
        error,
      );
    });
}

export function hydrateRoutineReminderCompletionRuntime(
  state: RoutineReminderCompletionState,
  persist: RoutineReminderCompletionPersistence,
): void {
  runtime = { state: cloneState(state), persist };
  persistenceQueue = Promise.resolve();
  latestFallback = undefined;
}

export function resetRoutineReminderCompletionRuntimeForTests(): void {
  runtime = undefined;
  persistenceQueue = Promise.resolve();
  latestFallback = undefined;
}

export async function flushRoutineReminderCompletionPersistence(): Promise<void> {
  await persistenceQueue;
}

export function readRoutineReminderCompletionState(): RoutineReminderCompletionState {
  if (runtime) return cloneState(runtime.state);

  return readLegacyState() ?? emptyRoutineReminderCompletionState();
}

export function isRoutineReminderCompleted(
  date: LocalDate,
  type: RoutineReminderType,
): boolean {
  return readRoutineReminderCompletionState().completions.some(
    (completion) =>
      completion.date === date && completion.type === type,
  );
}

export function recordRoutineReminderCompletion(
  date: LocalDate,
  type: RoutineReminderType,
  completedAt: string = new Date().toISOString(),
): RoutineReminderCompletionState {
  const current = readRoutineReminderCompletionState();

  if (
    current.completions.some(
      (completion) =>
        completion.date === date && completion.type === type,
    )
  ) {
    return current;
  }

  const next: RoutineReminderCompletionState = {
    version: 1,
    completions: [
      ...current.completions,
      { date, type, completedAt },
    ].sort((left, right) =>
      left.date.localeCompare(right.date) ||
      left.type.localeCompare(right.type),
    ),
  };

  persistState(next);
  return next;
}
