import type {
  ActivityIntensity,
} from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';

export type PlannedEnduranceActivityType =
  | 'running'
  | 'swimming'
  | 'cycling'
  | 'walking'
  | 'otherCardio';

export type PlannedEnduranceStatus =
  | 'planned'
  | 'skipped';

export interface PlannedEnduranceSession {
  id: string;
  title: string;
  activityType: PlannedEnduranceActivityType;
  date: LocalDate;
  intensity: ActivityIntensity;
  targetDurationMinutes?: number;
  targetDistanceKm?: number;
  targetDistanceMeters?: number;
  notes?: string;
  status: PlannedEnduranceStatus;
  createdAt: string;
  updatedAt: string;
  skippedAt?: string;
}

export interface EndurancePlanningState {
  version: 1;
  sessions: PlannedEnduranceSession[];
}

export const ENDURANCE_PLANNING_STORAGE_KEY =
  'sportpilot:endurance-planning:v1';

export const ENDURANCE_PLANNING_CHANGED_EVENT =
  'sportpilot:endurance-planning-changed';

export function emptyEndurancePlanningState():
  EndurancePlanningState {
  return {
    version: 1,
    sessions: [],
  };
}

function isActivityType(
  value: unknown,
): value is PlannedEnduranceActivityType {
  return (
    value === 'running' ||
    value === 'swimming' ||
    value === 'cycling' ||
    value === 'walking' ||
    value === 'otherCardio'
  );
}

function isIntensity(
  value: unknown,
): value is ActivityIntensity {
  return (
    value === 'low' ||
    value === 'moderate' ||
    value === 'high'
  );
}

function isStatus(
  value: unknown,
): value is PlannedEnduranceStatus {
  return value === 'planned' || value === 'skipped';
}

function optionalPositiveNumber(
  value: unknown,
): number | undefined {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
    ? value
    : undefined;
}

export function parseSession(
  value: unknown,
): PlannedEnduranceSession | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    !isActivityType(candidate.activityType) ||
    typeof candidate.date !== 'string' ||
    !isIntensity(candidate.intensity) ||
    !isStatus(candidate.status) ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    activityType: candidate.activityType,
    date: candidate.date,
    intensity: candidate.intensity,
    status: candidate.status,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    ...(optionalPositiveNumber(
      candidate.targetDurationMinutes,
    ) !== undefined
      ? {
          targetDurationMinutes:
            candidate.targetDurationMinutes as number,
        }
      : {}),
    ...(optionalPositiveNumber(
      candidate.targetDistanceKm,
    ) !== undefined
      ? {
          targetDistanceKm:
            candidate.targetDistanceKm as number,
        }
      : {}),
    ...(optionalPositiveNumber(
      candidate.targetDistanceMeters,
    ) !== undefined
      ? {
          targetDistanceMeters:
            candidate.targetDistanceMeters as number,
        }
      : {}),
    ...(typeof candidate.notes === 'string'
      ? { notes: candidate.notes }
      : {}),
    ...(typeof candidate.skippedAt === 'string'
      ? { skippedAt: candidate.skippedAt }
      : {}),
  };
}

export type EndurancePlanningPersistence = (
  state: EndurancePlanningState,
) => Promise<void>;

interface EndurancePlanningRuntime {
  state: EndurancePlanningState;
  persist: EndurancePlanningPersistence;
}

let endurancePlanningRuntime:
  EndurancePlanningRuntime | undefined;
let endurancePersistenceQueue: Promise<void> =
  Promise.resolve();
let latestEnduranceFallback: string | undefined;

function cloneEndurancePlanningState(
  state: EndurancePlanningState,
): EndurancePlanningState {
  return {
    version: 1,
    sessions: state.sessions.map((session) => ({ ...session })),
  };
}

export function parseEndurancePlanningState(
  value: unknown,
): EndurancePlanningState | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    version?: unknown;
    sessions?: unknown;
  };

  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.sessions)
  ) {
    return undefined;
  }

  return {
    version: 1,
    sessions: candidate.sessions
      .map(parseSession)
      .filter(
        (session): session is PlannedEnduranceSession =>
          session !== undefined,
      ),
  };
}

export function readLegacyEndurancePlanningState():
  EndurancePlanningState | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(
      ENDURANCE_PLANNING_STORAGE_KEY,
    );

    return raw === null
      ? undefined
      : parseEndurancePlanningState(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function writeEnduranceFallback(serialized: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      ENDURANCE_PLANNING_STORAGE_KEY,
      serialized,
    );
  } catch {
    // Dexie reste prioritaire lorsque le stockage de secours est indisponible.
  }
}

function removeEnduranceFallback(serialized: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (
      latestEnduranceFallback === serialized &&
      window.localStorage.getItem(
        ENDURANCE_PLANNING_STORAGE_KEY,
      ) === serialized
    ) {
      window.localStorage.removeItem(
        ENDURANCE_PLANNING_STORAGE_KEY,
      );
    }
  } catch {
    // La clé de secours sera réévaluée au prochain démarrage.
  }
}

function dispatchEndurancePlanningChanged(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new Event(ENDURANCE_PLANNING_CHANGED_EVENT),
  );
}

export function hydrateEndurancePlanningRuntime(
  state: EndurancePlanningState,
  persist: EndurancePlanningPersistence,
): void {
  endurancePlanningRuntime = {
    state: cloneEndurancePlanningState(state),
    persist,
  };
  endurancePersistenceQueue = Promise.resolve();
  latestEnduranceFallback = undefined;
}

export function resetEndurancePlanningRuntimeForTests(): void {
  endurancePlanningRuntime = undefined;
  endurancePersistenceQueue = Promise.resolve();
  latestEnduranceFallback = undefined;
}

export async function flushEndurancePlanningPersistence():
  Promise<void> {
  await endurancePersistenceQueue;
}

export function readEndurancePlanningState():
  EndurancePlanningState {
  if (endurancePlanningRuntime) {
    return cloneEndurancePlanningState(
      endurancePlanningRuntime.state,
    );
  }

  return (
    readLegacyEndurancePlanningState() ??
    emptyEndurancePlanningState()
  );
}

export function writeEndurancePlanningState(
  state: EndurancePlanningState,
): void {
  const snapshot = cloneEndurancePlanningState(state);
  const serialized = JSON.stringify(snapshot);

  if (!endurancePlanningRuntime) {
    writeEnduranceFallback(serialized);
    dispatchEndurancePlanningChanged();
    return;
  }

  const persist = endurancePlanningRuntime.persist;
  endurancePlanningRuntime.state = snapshot;
  latestEnduranceFallback = serialized;
  writeEnduranceFallback(serialized);
  dispatchEndurancePlanningChanged();

  endurancePersistenceQueue = endurancePersistenceQueue
    .catch(() => undefined)
    .then(() => persist(snapshot))
    .then(() => removeEnduranceFallback(serialized))
    .catch((error: unknown) => {
      console.error(
        'La persistance Dexie du planning d’endurance a échoué.',
        error,
      );
    });
}
