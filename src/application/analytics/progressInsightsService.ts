import { calculateEnduranceRecords } from '@/domain/calculations/endurance';
import { createTwelveWeekWindow } from '@/domain/aggregations/analytics';
import type { Activity } from '@/domain/models/activity';
import type { CalendarWeek } from '@/domain/models/analytics';
import type { LocalDate } from '@/domain/models/common';
import type { WorkoutSession } from '@/domain/models/strength';
import type {
  DisciplineAdherence,
  PlanningAdherenceWeek,
  ProgressInsights,
} from '@/domain/analytics/progressInsights';
import {
  buildEndurancePlanningWeek,
} from '@/application/planning/endurancePlanningService';
import {
  planningDateForSession,
} from '@/application/strength/weeklyPlanningService';
import {
  readEndurancePlanningState,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import { repositories } from '@/infrastructure/repositories/repositories';

const EARLIEST_SUPPORTED_DATE = '1970-01-01' as LocalDate;

function percentage(completedCount: number, plannedCount: number): number | undefined {
  return plannedCount === 0
    ? undefined
    : Math.round((completedCount / plannedCount) * 100);
}

function discipline(
  completedCount: number,
  skippedCount: number,
  pendingCount: number,
): DisciplineAdherence {
  const plannedCount = completedCount + skippedCount + pendingCount;

  return {
    plannedCount,
    completedCount,
    skippedCount,
    pendingCount,
    ...(plannedCount > 0
      ? {
          adherencePercent: Math.round(
            (completedCount / plannedCount) * 100,
          ),
        }
      : {}),
  };
}

function inRange(date: LocalDate, from: LocalDate, to: LocalDate): boolean {
  return date >= from && date <= to;
}

function calculateStreak(
  values: readonly boolean[],
): { current: number; best: number } {
  let current = 0;
  let best = 0;
  let running = 0;

  for (const value of values) {
    if (value) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (!values[index]) break;
    current += 1;
  }

  return { current, best };
}

function aggregate(
  weeks: readonly PlanningAdherenceWeek[],
): DisciplineAdherence {
  const plannedCount = weeks.reduce(
    (total, week) => total + week.plannedCount,
    0,
  );
  const completedCount = weeks.reduce(
    (total, week) => total + week.completedCount,
    0,
  );
  const skippedCount = weeks.reduce(
    (total, week) => total + week.skippedCount,
    0,
  );
  const pendingCount = weeks.reduce(
    (total, week) => total + week.pendingCount,
    0,
  );

  return {
    plannedCount,
    completedCount,
    skippedCount,
    pendingCount,
    ...(plannedCount > 0
      ? {
          adherencePercent: Math.round(
            (completedCount / plannedCount) * 100,
          ),
        }
      : {}),
  };
}

function recordedActivityCount(
  activities: readonly Activity[],
  completedStrengthSessions: readonly WorkoutSession[],
  from: LocalDate,
  to: LocalDate,
): number {
  const completedStrengthDates = new Set(
    completedStrengthSessions.map((session) => planningDateForSession(session)),
  );

  const genericActivities = activities.filter((activity) => (
    inRange(activity.date, from, to)
    && (
      activity.type !== 'strengthTraining'
      || !completedStrengthDates.has(activity.date)
    )
  ));

  return genericActivities.length + completedStrengthSessions.length;
}

function buildWeek(
  week: CalendarWeek,
  activities: readonly Activity[],
  workoutSessions: readonly WorkoutSession[],
  endurancePlanningState: EndurancePlanningState,
  referenceDate: LocalDate,
): PlanningAdherenceWeek {
  const cutoff = week.weekEnd < referenceDate
    ? week.weekEnd
    : referenceDate;

  const strengthSessions = workoutSessions.filter((session) => {
    const date = planningDateForSession(session);

    return inRange(date, week.weekStart, cutoff)
      && (
        session.status === 'planned'
        || session.status === 'inProgress'
        || session.status === 'completed'
        || session.status === 'abandoned'
        || session.status === 'skipped'
      );
  });

  const completedStrengthSessions = strengthSessions.filter(
    ({ status }) => status === 'completed',
  );
  const strengthSkippedCount = strengthSessions.filter(
    ({ status }) => status === 'skipped' || status === 'abandoned',
  ).length;
  const strengthPendingCount = strengthSessions.filter(
    ({ status }) => status === 'planned' || status === 'inProgress',
  ).length;

  const enduranceWeek = buildEndurancePlanningWeek(
    endurancePlanningState,
    [...activities],
    week.weekStart,
    referenceDate,
  );
  const enduranceSessions = enduranceWeek.days
    .filter(({ date }) => date <= cutoff)
    .flatMap(({ sessions }) => sessions);

  const enduranceCompletedCount = enduranceSessions.filter(
    ({ displayStatus }) => displayStatus === 'completed',
  ).length;
  const enduranceSkippedCount = enduranceSessions.filter(
    ({ displayStatus }) => displayStatus === 'skipped',
  ).length;
  const endurancePendingCount = enduranceSessions.filter(
    ({ displayStatus }) => displayStatus === 'planned',
  ).length;

  const strength = discipline(
    completedStrengthSessions.length,
    strengthSkippedCount,
    strengthPendingCount,
  );
  const endurance = discipline(
    enduranceCompletedCount,
    enduranceSkippedCount,
    endurancePendingCount,
  );
  const plannedCount = strength.plannedCount + endurance.plannedCount;
  const completedCount = strength.completedCount + endurance.completedCount;
  const skippedCount = strength.skippedCount + endurance.skippedCount;
  const pendingCount = strength.pendingCount + endurance.pendingCount;

  return {
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    label: week.label,
    plannedCount,
    completedCount,
    skippedCount,
    pendingCount,
    ...(plannedCount > 0
      ? {
          adherencePercent: Math.round(
            (completedCount / plannedCount) * 100,
          ),
        }
      : {}),
    strength,
    endurance,
    recordedActivityCount: recordedActivityCount(
      activities,
      completedStrengthSessions,
      week.weekStart,
      cutoff,
    ),
    isClosed: week.weekEnd < referenceDate,
  };
}

function weightedAdherence(
  weeks: readonly PlanningAdherenceWeek[],
): number | undefined {
  const plannedCount = weeks.reduce(
    (total, week) => total + week.plannedCount,
    0,
  );
  const completedCount = weeks.reduce(
    (total, week) => total + week.completedCount,
    0,
  );

  return percentage(completedCount, plannedCount);
}

export interface BuildProgressInsightsInput {
  weeks: CalendarWeek[];
  periodActivities: Activity[];
  allActivities: Activity[];
  workoutSessions: WorkoutSession[];
  endurancePlanningState: EndurancePlanningState;
  referenceDate: LocalDate;
}

export function buildProgressInsights({
  weeks,
  periodActivities,
  allActivities,
  workoutSessions,
  endurancePlanningState,
  referenceDate,
}: BuildProgressInsightsInput): ProgressInsights {
  const weekInsights = weeks.map((week) => buildWeek(
    week,
    periodActivities,
    workoutSessions,
    endurancePlanningState,
    referenceDate,
  ));
  const closedPlannedWeeks = weekInsights.filter(
    (week) => week.isClosed && week.plannedCount > 0,
  );
  const recentWeeks = closedPlannedWeeks.slice(-4);
  const previousWeeks = closedPlannedWeeks.slice(-8, -4);
  const recentPercent = weightedAdherence(recentWeeks);
  const previousPercent = weightedAdherence(previousWeeks);

  const activeStreak = calculateStreak(
    weekInsights.map(({ recordedActivityCount: count }) => count > 0),
  );
  const perfectStreak = calculateStreak(
    weekInsights
      .filter((week) => week.isClosed && week.plannedCount > 0)
      .map((week) => week.completedCount === week.plannedCount),
  );
  const bestAdherenceWeek = [...closedPlannedWeeks]
    .sort((left, right) => (
      (right.adherencePercent ?? -1) - (left.adherencePercent ?? -1)
      || right.completedCount - left.completedCount
      || right.weekStart.localeCompare(left.weekStart)
    ))[0];

  return {
    weeks: weekInsights,
    overall: aggregate(weekInsights),
    trend: {
      ...(recentPercent !== undefined ? { recentPercent } : {}),
      ...(previousPercent !== undefined ? { previousPercent } : {}),
      ...(recentPercent !== undefined && previousPercent !== undefined
        ? { deltaPoints: recentPercent - previousPercent }
        : {}),
      recentWeekCount: recentWeeks.length,
      previousWeekCount: previousWeeks.length,
    },
    consistency: {
      currentActiveWeekStreak: activeStreak.current,
      bestActiveWeekStreak: activeStreak.best,
      currentPerfectPlanningStreak: perfectStreak.current,
      bestPerfectPlanningStreak: perfectStreak.best,
      ...(bestAdherenceWeek ? { bestAdherenceWeek } : {}),
    },
    personalRecords: calculateEnduranceRecords(allActivities),
  };
}

export async function loadProgressInsights(
  referenceDate: LocalDate,
): Promise<ProgressInsights> {
  const weeks = createTwelveWeekWindow(referenceDate);
  const from = weeks[0]?.weekStart ?? referenceDate;
  const to = weeks.at(-1)?.weekEnd ?? referenceDate;

  const [
    periodActivities,
    allActivities,
    workoutSessions,
  ] = await Promise.all([
    repositories.activities.listBetween(from, to),
    repositories.activities.listBetween(
      EARLIEST_SUPPORTED_DATE,
      referenceDate,
    ),
    repositories.workoutSessions.listAll(),
  ]);

  return buildProgressInsights({
    weeks,
    periodActivities,
    allActivities,
    workoutSessions,
    endurancePlanningState: readEndurancePlanningState(),
    referenceDate,
  });
}
