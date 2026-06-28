import {
  addDays,
  parseISO,
} from 'date-fns';

import type {
  Activity,
} from '@/domain/models/activity';
import type {
  EntityId,
  LocalDate,
} from '@/domain/models/common';
import type {
  WorkoutSessionStatus,
} from '@/domain/models/strength';
import type {
  PlannedEnduranceActivityType,
  PlannedEnduranceSession,
} from '@/domain/planning/endurancePlanningState';
import { toLocalDate } from '@/shared/utils/dates';

export interface TrainingAgendaStrengthSource {
  id: EntityId;
  title: string;
  date: LocalDate;
  status: WorkoutSessionStatus;
}

export type TrainingAgendaEntryStatus =
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'inProgress';

export interface TrainingAgendaEntry {
  id: string;
  source: 'strength' | 'endurance';
  title: string;
  date: LocalDate;
  status: TrainingAgendaEntryStatus;
  activityType?: PlannedEnduranceActivityType;
  targetDurationMinutes?: number;
  targetDistanceKm?: number;
  targetDistanceMeters?: number;
}

export interface TrainingAgendaSnapshot {
  today: LocalDate;
  endDate: LocalDate;
  entries: TrainingAgendaEntry[];
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
}

export function trainingAgendaEndDate(
  today: LocalDate,
  horizonDays = 7,
): LocalDate {
  return toLocalDate(
    addDays(parseISO(today), horizonDays),
  );
}

function isEnduranceCompleted(
  session: PlannedEnduranceSession,
  activities: Activity[],
  usedActivityIds: Set<EntityId>,
): boolean {
  const matching = activities.find(
    (activity) =>
      !usedActivityIds.has(activity.id) &&
      activity.date === session.date &&
      activity.type === session.activityType,
  );

  if (!matching) {
    return false;
  }

  usedActivityIds.add(matching.id);
  return true;
}

function entryStatus(
  date: LocalDate,
  today: LocalDate,
): TrainingAgendaEntryStatus {
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  return 'upcoming';
}

function statusOrder(
  status: TrainingAgendaEntryStatus,
): number {
  if (status === 'inProgress') return 0;
  if (status === 'overdue') return 1;
  if (status === 'today') return 2;
  return 3;
}

export function buildTrainingAgenda(
  strengthSessions: TrainingAgendaStrengthSource[],
  enduranceSessions: PlannedEnduranceSession[],
  activities: Activity[],
  today: LocalDate,
  horizonDays = 7,
): TrainingAgendaSnapshot {
  const endDate = trainingAgendaEndDate(
    today,
    horizonDays,
  );
  const entries: TrainingAgendaEntry[] = [];

  for (const session of strengthSessions) {
    if (session.status === 'inProgress') {
      entries.push({
        id: session.id,
        source: 'strength',
        title: session.title,
        date: session.date,
        status: 'inProgress',
      });
      continue;
    }

    if (
      session.status !== 'planned' ||
      session.date > endDate
    ) {
      continue;
    }

    entries.push({
      id: session.id,
      source: 'strength',
      title: session.title,
      date: session.date,
      status: entryStatus(
        session.date,
        today,
      ),
    });
  }

  const usedActivityIds = new Set<EntityId>();

  for (const session of enduranceSessions) {
    if (
      session.status !== 'planned' ||
      session.date > endDate ||
      isEnduranceCompleted(
        session,
        activities,
        usedActivityIds,
      )
    ) {
      continue;
    }

    entries.push({
      id: session.id,
      source: 'endurance',
      title: session.title,
      date: session.date,
      status: entryStatus(
        session.date,
        today,
      ),
      activityType: session.activityType,
      ...(session.targetDurationMinutes !==
      undefined
        ? {
            targetDurationMinutes:
              session.targetDurationMinutes,
          }
        : {}),
      ...(session.targetDistanceKm !==
      undefined
        ? {
            targetDistanceKm:
              session.targetDistanceKm,
          }
        : {}),
      ...(session.targetDistanceMeters !==
      undefined
        ? {
            targetDistanceMeters:
              session.targetDistanceMeters,
          }
        : {}),
    });
  }

  entries.sort((left, right) => {
    const statusDifference =
      statusOrder(left.status) -
      statusOrder(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const dateDifference =
      left.date.localeCompare(right.date);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return left.title.localeCompare(
      right.title,
      'fr',
    );
  });

  return {
    today,
    endDate,
    entries,
    overdueCount: entries.filter(
      ({ status }) => status === 'overdue',
    ).length,
    todayCount: entries.filter(
      ({ status }) =>
        status === 'today' ||
        status === 'inProgress',
    ).length,
    upcomingCount: entries.filter(
      ({ status }) => status === 'upcoming',
    ).length,
  };
}
