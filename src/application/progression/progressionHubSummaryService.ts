import { differenceInCalendarDays, parseISO } from 'date-fns';
import { loadTwelveWeekAnalytics } from '@/application/analytics/analyticsService';
import {
  refreshGoalProgress,
  type GoalProgressView,
} from '@/application/goals/goalProgressService';
import type { TwelveWeekAnalytics } from '@/domain/models/analytics';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

const WEIGHT_STABILITY_THRESHOLD_KG = 0.1;
const MAINTENANCE_ATTENTION_THRESHOLD_KG = 0.5;
const GOAL_DUE_SOON_DAYS = 7;

export interface ProgressionActivitySummary {
  sessionCount: number;
  totalMinutes: number;
  averageSteps?: number;
  recordedStepDays: number;
}

export type ProgressionWeightState =
  | 'empty'
  | 'insufficient'
  | 'aligned'
  | 'stable'
  | 'attention';

export interface ProgressionWeightSummary {
  state: ProgressionWeightState;
  latestAverageKg?: number;
  changeKg?: number;
}

export type ProgressionGoalState =
  | 'empty'
  | 'active'
  | 'dueSoon'
  | 'overdue';

export interface ProgressionGoalSummary {
  state: ProgressionGoalState;
  title?: string;
  progressPercent?: number;
  daysRemaining?: number;
}

export interface ProgressionHubSummary {
  activity: ProgressionActivitySummary;
  weight: ProgressionWeightSummary;
  goal: ProgressionGoalSummary;
}

export interface BuildProgressionHubSummaryInput {
  analytics: TwelveWeekAnalytics;
  goalViews: readonly GoalProgressView[];
  profile: UserProfile;
  referenceDate: LocalDate;
}

function buildActivitySummary(
  analytics: TwelveWeekAnalytics,
): ProgressionActivitySummary {
  const currentWeek = analytics.activity.at(-1);

  return {
    sessionCount: currentWeek?.sessionCount ?? 0,
    totalMinutes: currentWeek?.totalSportMinutes ?? 0,
    ...(currentWeek?.averageSteps !== undefined
      ? { averageSteps: currentWeek.averageSteps }
      : {}),
    recordedStepDays: currentWeek?.recordedStepDays ?? 0,
  };
}

function buildWeightSummary(
  analytics: TwelveWeekAnalytics,
  profile: UserProfile,
): ProgressionWeightSummary {
  const weeks = analytics.weight.weekly.filter(
    (week) => week.averageWeightKg !== undefined,
  );
  const latest = weeks.at(-1);

  if (latest?.averageWeightKg === undefined) {
    return { state: 'empty' };
  }

  const previous = weeks.at(-2);
  if (previous?.averageWeightKg === undefined) {
    return {
      state: 'insufficient',
      latestAverageKg: latest.averageWeightKg,
    };
  }

  const changeKg = latest.averageWeightKg - previous.averageWeightKg;
  const absoluteChange = Math.abs(changeKg);

  if (absoluteChange < WEIGHT_STABILITY_THRESHOLD_KG) {
    return {
      state: profile.goal === 'maintenance' ? 'aligned' : 'stable',
      latestAverageKg: latest.averageWeightKg,
      changeKg,
    };
  }

  const isAligned = profile.goal === 'loss'
    ? changeKg < 0
    : profile.goal === 'gain'
      ? changeKg > 0
      : absoluteChange <= MAINTENANCE_ATTENTION_THRESHOLD_KG;

  return {
    state: isAligned ? 'aligned' : 'attention',
    latestAverageKg: latest.averageWeightKg,
    changeKg,
  };
}

function priorityForGoal(
  view: GoalProgressView,
  referenceDate: LocalDate,
): number {
  if (view.isOverdue) return 0;
  if (!view.goal.deadline) return 2;

  const days = differenceInCalendarDays(
    parseISO(view.goal.deadline),
    parseISO(referenceDate),
  );

  return days <= GOAL_DUE_SOON_DAYS ? 1 : 2;
}

function buildGoalSummary(
  goalViews: readonly GoalProgressView[],
  referenceDate: LocalDate,
): ProgressionGoalSummary {
  const activeGoals = goalViews
    .filter(({ goal }) => goal.status === 'active')
    .sort((left, right) => (
      priorityForGoal(left, referenceDate) - priorityForGoal(right, referenceDate)
      || (left.daysRemaining ?? Number.POSITIVE_INFINITY)
        - (right.daysRemaining ?? Number.POSITIVE_INFINITY)
      || left.progressPercent - right.progressPercent
      || left.goal.updatedAt.localeCompare(right.goal.updatedAt)
    ));
  const selected = activeGoals[0];

  if (!selected) return { state: 'empty' };

  if (selected.isOverdue) {
    return {
      state: 'overdue',
      title: selected.goal.title,
      progressPercent: selected.progressPercent,
      daysRemaining: 0,
    };
  }

  const daysRemaining = selected.goal.deadline
    ? differenceInCalendarDays(
        parseISO(selected.goal.deadline),
        parseISO(referenceDate),
      )
    : undefined;

  return {
    state: daysRemaining !== undefined && daysRemaining <= GOAL_DUE_SOON_DAYS
      ? 'dueSoon'
      : 'active',
    title: selected.goal.title,
    progressPercent: selected.progressPercent,
    ...(daysRemaining !== undefined ? { daysRemaining } : {}),
  };
}

export function buildProgressionHubSummary({
  analytics,
  goalViews,
  profile,
  referenceDate,
}: BuildProgressionHubSummaryInput): ProgressionHubSummary {
  return {
    activity: buildActivitySummary(analytics),
    weight: buildWeightSummary(analytics, profile),
    goal: buildGoalSummary(goalViews, referenceDate),
  };
}

export async function loadProgressionHubSummary(
  referenceDate: LocalDate,
  profile: UserProfile,
): Promise<ProgressionHubSummary> {
  const [analytics, goalViews] = await Promise.all([
    loadTwelveWeekAnalytics(referenceDate, profile),
    refreshGoalProgress(),
  ]);

  return buildProgressionHubSummary({
    analytics,
    goalViews,
    profile,
    referenceDate,
  });
}
