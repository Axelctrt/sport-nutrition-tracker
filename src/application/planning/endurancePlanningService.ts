import { addDays, parseISO } from 'date-fns';

import type {
  Activity,
  ActivityIntensity,
} from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import {
  readEndurancePlanningState,
  writeEndurancePlanningState,
  type EndurancePlanningState,
  type PlannedEnduranceActivityType,
  type PlannedEnduranceSession,
  type PlannedEnduranceStatus,
} from '@/domain/planning/endurancePlanningState';
import { createEntityId } from '@/shared/utils/entities';
import { toLocalDate } from '@/shared/utils/dates';

export interface PlannedEnduranceInput {
  title: string;
  activityType: PlannedEnduranceActivityType;
  date: LocalDate;
  intensity: ActivityIntensity;
  targetDurationMinutes?: number;
  targetDistanceKm?: number;
  targetDistanceMeters?: number;
  notes?: string;
}

export type EndurancePlanningDisplayStatus =
  | 'planned'
  | 'completed'
  | 'skipped';

export interface EndurancePlanningSessionView {
  session: PlannedEnduranceSession;
  displayStatus: EndurancePlanningDisplayStatus;
  matchedActivity?: Activity;
  isOverdue: boolean;
}

export interface EndurancePlanningDay {
  date: LocalDate;
  sessions: EndurancePlanningSessionView[];
}

export interface EndurancePlanningWeek {
  weekStart: LocalDate;
  days: EndurancePlanningDay[];
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  overdueCount: number;
  targetDurationMinutes: number;
  actualDurationMinutes: number;
  adherencePercent: number;
}

function validatePositiveOptional(
  value: number | undefined,
  label: string,
): void {
  if (
    value !== undefined &&
    (!Number.isFinite(value) || value <= 0)
  ) {
    throw new Error(
      `${label} doit être strictement positif.`,
    );
  }
}

function defaultTitle(
  type: PlannedEnduranceActivityType,
): string {
  const labels: Record<
    PlannedEnduranceActivityType,
    string
  > = {
    running: 'Séance de course',
    swimming: 'Séance de natation',
    cycling: 'Sortie vélo',
    walking: 'Marche',
    otherCardio: 'Séance cardio',
  };

  return labels[type];
}

function persist(
  sessions: PlannedEnduranceSession[],
): EndurancePlanningState {
  const state: EndurancePlanningState = {
    version: 1,
    sessions,
  };

  writeEndurancePlanningState(state);
  return state;
}

export function savePlannedEnduranceSession(
  input: PlannedEnduranceInput,
  sessionId?: string,
  now = new Date(),
): PlannedEnduranceSession {
  if (!input.date) {
    throw new Error('Choisis une date prévue.');
  }

  validatePositiveOptional(
    input.targetDurationMinutes,
    'La durée cible',
  );
  validatePositiveOptional(
    input.targetDistanceKm,
    'La distance cible',
  );
  validatePositiveOptional(
    input.targetDistanceMeters,
    'La distance cible',
  );

  const state = readEndurancePlanningState();
  const existing = sessionId
    ? state.sessions.find(
        ({ id }) => id === sessionId,
      )
    : undefined;
  const timestamp = now.toISOString();

  const session: PlannedEnduranceSession = {
    id: existing?.id ?? createEntityId(),
    title:
      input.title.trim() ||
      defaultTitle(input.activityType),
    activityType: input.activityType,
    date: input.date,
    intensity: input.intensity,
    status: existing?.status ?? 'planned',
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    ...(input.targetDurationMinutes !== undefined
      ? {
          targetDurationMinutes:
            input.targetDurationMinutes,
        }
      : {}),
    ...(input.targetDistanceKm !== undefined
      ? {
          targetDistanceKm:
            input.targetDistanceKm,
        }
      : {}),
    ...(input.targetDistanceMeters !== undefined
      ? {
          targetDistanceMeters:
            input.targetDistanceMeters,
        }
      : {}),
    ...(input.notes?.trim()
      ? { notes: input.notes.trim() }
      : {}),
    ...(existing?.skippedAt
      ? { skippedAt: existing.skippedAt }
      : {}),
  };

  persist(
    existing
      ? state.sessions.map((candidate) =>
          candidate.id === existing.id
            ? session
            : candidate,
        )
      : [...state.sessions, session],
  );

  return session;
}

function withoutSkippedAt(
  session: PlannedEnduranceSession,
): PlannedEnduranceSession {
  const clone = { ...session };
  delete clone.skippedAt;
  return clone;
}

export function reschedulePlannedEnduranceSession(
  sessionId: string,
  date: LocalDate,
  now = new Date(),
): void {
  if (!date) {
    throw new Error('Choisis une nouvelle date.');
  }

  const state = readEndurancePlanningState();

  persist(
    state.sessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      return withoutSkippedAt({
        ...session,
        date,
        status: 'planned',
        updatedAt: now.toISOString(),
      });
    }),
  );
}

export function setPlannedEnduranceStatus(
  sessionId: string,
  status: PlannedEnduranceStatus,
  now = new Date(),
): void {
  const state = readEndurancePlanningState();

  persist(
    state.sessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      if (status === 'skipped') {
        return {
          ...session,
          status,
          skippedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
      }

      return withoutSkippedAt({
        ...session,
        status,
        updatedAt: now.toISOString(),
      });
    }),
  );
}

export function deletePlannedEnduranceSession(
  sessionId: string,
): void {
  const state = readEndurancePlanningState();

  persist(
    state.sessions.filter(
      ({ id }) => id !== sessionId,
    ),
  );
}

function activityMatches(
  session: PlannedEnduranceSession,
  activity: Activity,
): boolean {
  return (
    session.date === activity.date &&
    session.activityType === activity.type
  );
}

export function buildEndurancePlanningWeek(
  state: EndurancePlanningState,
  activities: Activity[],
  weekStart: LocalDate,
  today = toLocalDate(),
): EndurancePlanningWeek {
  const dates = Array.from({ length: 7 }, (_, index) =>
    toLocalDate(addDays(parseISO(weekStart), index)),
  );
  const dateSet = new Set(dates);
  const usedActivityIds = new Set<string>();

  const sessionViews = state.sessions
    .filter(({ date }) => dateSet.has(date))
    .sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    )
    .map((session): EndurancePlanningSessionView => {
      if (session.status === 'skipped') {
        return {
          session,
          displayStatus: 'skipped',
          isOverdue: false,
        };
      }

      const matchedActivity = activities.find(
        (activity) =>
          !usedActivityIds.has(activity.id) &&
          activityMatches(session, activity),
      );

      if (matchedActivity) {
        usedActivityIds.add(matchedActivity.id);

        return {
          session,
          displayStatus: 'completed',
          matchedActivity,
          isOverdue: false,
        };
      }

      return {
        session,
        displayStatus: 'planned',
        isOverdue: session.date < today,
      };
    });

  const days = dates.map((date) => ({
    date,
    sessions: sessionViews.filter(
      ({ session }) => session.date === date,
    ),
  }));

  const plannedCount = sessionViews.filter(
    ({ displayStatus }) =>
      displayStatus === 'planned',
  ).length;
  const completedCount = sessionViews.filter(
    ({ displayStatus }) =>
      displayStatus === 'completed',
  ).length;
  const skippedCount = sessionViews.filter(
    ({ displayStatus }) =>
      displayStatus === 'skipped',
  ).length;
  const overdueCount = sessionViews.filter(
    ({ isOverdue }) => isOverdue,
  ).length;
  const targetDurationMinutes = sessionViews.reduce(
    (total, { session }) =>
      total + (session.targetDurationMinutes ?? 0),
    0,
  );
  const actualDurationMinutes = sessionViews.reduce(
    (total, { matchedActivity }) =>
      total + (matchedActivity?.durationMinutes ?? 0),
    0,
  );
  const decidedCount = completedCount + skippedCount;
  const adherencePercent =
    sessionViews.length > 0
      ? Math.round(
          (completedCount / sessionViews.length) *
            100,
        )
      : 0;

  return {
    weekStart,
    days,
    plannedCount,
    completedCount,
    skippedCount,
    overdueCount,
    targetDurationMinutes,
    actualDurationMinutes,
    adherencePercent:
      decidedCount === 0 && plannedCount > 0
        ? 0
        : adherencePercent,
  };
}
