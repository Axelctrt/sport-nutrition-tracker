import { endOfWeek, parseISO, startOfWeek } from 'date-fns';

import type {
  TrainingAgendaEntry,
  TrainingAgendaSnapshot,
} from '@/application/planning/trainingAgendaService';
import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import type { Activity, ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import { toLocalDate } from '@/shared/utils/dates';

const DEFAULT_ACTIVITY_TYPE_ORDER: ActivityType[] = [
  'running',
  'strengthTraining',
  'walking',
  'cycling',
  'swimming',
  'otherCardio',
];

export interface SportHubWeekSummary {
  startDate: LocalDate;
  endDate: LocalDate;
  activityCount: number;
  totalDurationMinutes: number;
  totalCaloriesKcal: number;
  distanceKm: number;
  swimmingDistanceMeters: number;
}

export interface SportHubSnapshot {
  today: LocalDate;
  currentSession?: TrainingAgendaEntry;
  plannedEntries: TrainingAgendaEntry[];
  latestActivity?: Activity;
  recentActivities: Activity[];
  activityTypeOrder: ActivityType[];
  week: SportHubWeekSummary;
}

function activitySortKey(activity: Activity): string {
  const time = activity.time ?? '00:00';
  return `${activity.date}T${time}|${activity.updatedAt}`;
}

export function sortActivitiesMostRecentFirst(activities: Activity[]): Activity[] {
  return [...activities].sort((left, right) =>
    activitySortKey(right).localeCompare(activitySortKey(left)),
  );
}

export function orderActivityTypesByFrequency(activities: Activity[]): ActivityType[] {
  const counts = new Map<ActivityType, number>();
  for (const type of DEFAULT_ACTIVITY_TYPE_ORDER) counts.set(type, 0);
  for (const activity of activities) {
    counts.set(activity.type, (counts.get(activity.type) ?? 0) + 1);
  }

  return [...DEFAULT_ACTIVITY_TYPE_ORDER].sort((left, right) => {
    const countDifference = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
    if (countDifference !== 0) return countDifference;
    return DEFAULT_ACTIVITY_TYPE_ORDER.indexOf(left) - DEFAULT_ACTIVITY_TYPE_ORDER.indexOf(right);
  });
}

function buildWeekSummary(activities: Activity[], today: LocalDate): SportHubWeekSummary {
  const date = parseISO(today);
  const startDate = toLocalDate(startOfWeek(date, { weekStartsOn: 1 }));
  const endDate = toLocalDate(endOfWeek(date, { weekStartsOn: 1 }));
  const weeklyActivities = activities.filter(
    (activity) => activity.date >= startDate && activity.date <= endDate,
  );

  let distanceKm = 0;
  let swimmingDistanceMeters = 0;

  for (const activity of weeklyActivities) {
    if (activity.type === 'running') distanceKm += activity.distanceKm;
    if (activity.type === 'cycling') distanceKm += activity.distanceKm ?? 0;
    if (activity.type === 'swimming') swimmingDistanceMeters += activity.distanceMeters;
  }

  return {
    startDate,
    endDate,
    activityCount: weeklyActivities.length,
    totalDurationMinutes: weeklyActivities.reduce(
      (total, activity) => total + activity.durationMinutes,
      0,
    ),
    totalCaloriesKcal: weeklyActivities.reduce(
      (total, activity) => total + getEffectiveActivityCalories(activity),
      0,
    ),
    distanceKm,
    swimmingDistanceMeters,
  };
}

export function buildSportHubSnapshot(
  activities: Activity[],
  agenda: TrainingAgendaSnapshot,
  today: LocalDate,
): SportHubSnapshot {
  const sortedActivities = sortActivitiesMostRecentFirst(activities);
  const currentSession = agenda.entries.find(({ status }) => status === 'inProgress');
  const plannedEntries = agenda.entries
    .filter(({ status }) => status !== 'inProgress')
    .slice(0, 3);

  return {
    today,
    ...(currentSession ? { currentSession } : {}),
    plannedEntries,
    ...(sortedActivities[0] ? { latestActivity: sortedActivities[0] } : {}),
    recentActivities: sortedActivities.slice(0, 3),
    activityTypeOrder: orderActivityTypesByFrequency(activities),
    week: buildWeekSummary(activities, today),
  };
}
