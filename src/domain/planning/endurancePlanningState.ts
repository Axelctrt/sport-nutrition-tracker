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

function parseSession(
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

export function readEndurancePlanningState():
  EndurancePlanningState {
  if (typeof window === 'undefined') {
    return emptyEndurancePlanningState();
  }

  try {
    const raw = window.localStorage.getItem(
      ENDURANCE_PLANNING_STORAGE_KEY,
    );

    if (!raw) {
      return emptyEndurancePlanningState();
    }

    const parsed = JSON.parse(raw) as {
      version?: unknown;
      sessions?: unknown;
    };

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.sessions)
    ) {
      return emptyEndurancePlanningState();
    }

    return {
      version: 1,
      sessions: parsed.sessions
        .map(parseSession)
        .filter(
          (
            session,
          ): session is PlannedEnduranceSession =>
            session !== undefined,
        ),
    };
  } catch {
    return emptyEndurancePlanningState();
  }
}

export function writeEndurancePlanningState(
  state: EndurancePlanningState,
): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    ENDURANCE_PLANNING_STORAGE_KEY,
    JSON.stringify(state),
  );
  window.dispatchEvent(
    new Event(ENDURANCE_PLANNING_CHANGED_EVENT),
  );
}
