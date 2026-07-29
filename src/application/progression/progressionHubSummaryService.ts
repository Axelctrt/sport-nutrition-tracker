import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  loadPerformanceAnalytics,
  type PerformanceAnalyticsSnapshot,
} from '@/application/analytics/performanceAnalyticsService';
import {
  refreshGoalProgress,
  type GoalProgressView,
} from '@/application/goals/goalProgressService';
import type { TwelveWeekAnalytics } from '@/domain/models/analytics';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { repositories } from '@/infrastructure/repositories/repositories';

const WEIGHT_STABILITY_THRESHOLD_KG = 0.1;
const MAINTENANCE_ATTENTION_THRESHOLD_KG = 0.5;
const GOAL_DUE_SOON_DAYS = 7;

export interface ProgressionActivitySummary {
  sessionCount: number;
  totalMinutes: number;
  averageSteps?: number;
  recordedStepDays: number;
  changeMinutes?: number;
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

export type ProgressionReviewState =
  | 'empty'
  | 'insufficient'
  | 'noChange'
  | 'adjustmentProposed'
  | 'accepted'
  | 'rejected';

export interface ProgressionReviewSummary {
  state: ProgressionReviewState;
  weekStart?: LocalDate;
  proposedAdjustmentKcal?: number;
  confidenceLevel?: WeeklyReview['adaptation'] extends infer T
    ? T extends { confidence: { level: infer L } } ? L : never
    : never;
  waistTrendCmPerWeek?: number;
  completedFoodDays?: number;
  trackingSpanDays?: number;
  reasons?: string[];
  blockingFactors?: string[];
}

export interface ProgressionNutritionSummary {
  trackedDays: number;
  averageCaloriesKcal?: number;
  averageTargetCaloriesKcal?: number;
}

export interface ProgressionStrengthSummary {
  state: 'empty' | 'ready';
  exerciseName?: string;
  latestOneRepMaxKg?: number;
  changePercent?: number;
}

export interface ProgressionWeekSummary {
  plannedActivities: number;
  realizedPlannedActivities: number;
  completedActivities: number;
  confirmedRestDays: number;
  checkInDays: number;
  nutritionDays: number;
}

export interface ProgressionSeries {
  weight: number[];
  activity: number[];
  nutrition: number[];
  strength: number[];
}

export type ProgressionSignalDestination =
  | 'weeklyReview'
  | 'weight'
  | 'nutrition'
  | 'activity'
  | 'strength'
  | 'regularity';

export interface ProgressionMainSignal {
  tone: 'positive' | 'attention' | 'neutral';
  title: string;
  detail: string;
  destination: ProgressionSignalDestination;
}

export interface ProgressionHubSummary {
  activity: ProgressionActivitySummary;
  weight: ProgressionWeightSummary;
  nutrition: ProgressionNutritionSummary;
  strength: ProgressionStrengthSummary;
  week: ProgressionWeekSummary;
  series: ProgressionSeries;
  signal: ProgressionMainSignal;
  goal: ProgressionGoalSummary;
  review: ProgressionReviewSummary;
}

export interface BuildProgressionHubSummaryInput {
  analytics: TwelveWeekAnalytics;
  goalViews: readonly GoalProgressView[];
  profile: UserProfile;
  referenceDate: LocalDate;
  reviews?: readonly WeeklyReview[];
  performance?: PerformanceAnalyticsSnapshot;
}

function buildActivitySummary(
  analytics: TwelveWeekAnalytics,
): ProgressionActivitySummary {
  const currentWeek = analytics.activity.at(-1);
  const previousWeek = analytics.activity.at(-2);

  return {
    sessionCount: currentWeek?.sessionCount ?? 0,
    totalMinutes: currentWeek?.totalSportMinutes ?? 0,
    ...(currentWeek?.averageSteps !== undefined
      ? { averageSteps: currentWeek.averageSteps }
      : {}),
    recordedStepDays: currentWeek?.recordedStepDays ?? 0,
    ...(currentWeek
      && previousWeek
      && (
        currentWeek.totalSportMinutes > 0
        || previousWeek.totalSportMinutes > 0
        || currentWeek.sessionCount > 0
        || previousWeek.sessionCount > 0
      )
      ? {
          changeMinutes:
            currentWeek.totalSportMinutes - previousWeek.totalSportMinutes,
        }
      : {}),
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

function buildReviewSummary(reviews: readonly WeeklyReview[]): ProgressionReviewSummary {
  const latest = [...reviews].sort((left, right) => right.weekStart.localeCompare(left.weekStart))[0];
  if (!latest) return { state: 'empty' };

  const details = {
    weekStart: latest.weekStart,
    proposedAdjustmentKcal: latest.proposedAdjustmentKcal,
    ...(latest.adaptation?.confidence.level
      ? { confidenceLevel: latest.adaptation.confidence.level }
      : {}),
    ...(latest.adaptation?.waistTrendCmPerWeek !== undefined
      ? { waistTrendCmPerWeek: latest.adaptation.waistTrendCmPerWeek }
      : {}),
    ...(latest.adaptation?.completedFoodDays !== undefined
      ? { completedFoodDays: latest.adaptation.completedFoodDays }
      : {}),
    ...(latest.adaptation?.trackingSpanDays !== undefined
      ? { trackingSpanDays: latest.adaptation.trackingSpanDays }
      : {}),
    ...(latest.adaptation?.reasons?.length
      ? { reasons: [...latest.adaptation.reasons] }
      : {}),
    ...(latest.adaptation?.blockingFactors?.length
      ? { blockingFactors: [...latest.adaptation.blockingFactors] }
      : latest.ineligibilityReasons?.length
        ? { blockingFactors: [...latest.ineligibilityReasons] }
        : {}),
  };

  if (!latest.isCalibrationEligible || latest.decisionStatus === 'notEligible') {
    return { state: 'insufficient', ...details };
  }
  if (latest.decisionStatus === 'accepted') return { state: 'accepted', ...details };
  if (latest.decisionStatus === 'rejected') return { state: 'rejected', ...details };
  if (latest.proposedAdjustmentKcal === 0) return { state: 'noChange', ...details };
  return { state: 'adjustmentProposed', ...details };
}

function buildNutritionSummary(
  analytics: TwelveWeekAnalytics,
): ProgressionNutritionSummary {
  const currentWeek = analytics.nutrition.at(-1);
  return {
    trackedDays: currentWeek?.trackedDayCount ?? 0,
    ...(currentWeek?.averageConsumedCaloriesKcal === undefined
      ? {}
      : { averageCaloriesKcal: currentWeek.averageConsumedCaloriesKcal }),
    ...(currentWeek?.averageTargetCaloriesKcal === undefined
      ? {}
      : { averageTargetCaloriesKcal: currentWeek.averageTargetCaloriesKcal }),
  };
}

function buildStrengthSummary(
  performance?: PerformanceAnalyticsSnapshot,
): ProgressionStrengthSummary {
  const exercise = performance?.strengthExercises[0];
  if (!exercise) return { state: 'empty' };
  return {
    state: 'ready',
    exerciseName: exercise.name,
    ...(exercise.latestEstimatedOneRepMaxKg === undefined
      ? {}
      : { latestOneRepMaxKg: exercise.latestEstimatedOneRepMaxKg }),
    ...(exercise.oneRepMaxChangePercent === undefined
      ? {}
      : { changePercent: exercise.oneRepMaxChangePercent }),
  };
}

function buildWeekSummary(
  analytics: TwelveWeekAnalytics,
  performance?: PerformanceAnalyticsSnapshot,
): ProgressionWeekSummary {
  const current = performance?.plannedActual.at(-1);
  const currentActivity = analytics.activity.at(-1);
  const currentNutrition = analytics.nutrition.at(-1);
  return {
    plannedActivities: current?.plannedActivities ?? 0,
    realizedPlannedActivities: current?.realizedPlannedActivities ?? 0,
    completedActivities:
      current?.completedActivities ?? currentActivity?.sessionCount ?? 0,
    confirmedRestDays: current?.confirmedRestDays ?? 0,
    checkInDays: current?.checkInDays ?? 0,
    nutritionDays:
      current?.nutritionDays ?? currentNutrition?.trackedDayCount ?? 0,
  };
}

function definedValues(values: readonly (number | undefined)[]): number[] {
  return values.filter((value): value is number => value !== undefined);
}

function buildSeries(
  analytics: TwelveWeekAnalytics,
  performance?: PerformanceAnalyticsSnapshot,
): ProgressionSeries {
  const strength = performance?.strengthExercises[0]?.points
    .map(({ estimatedOneRepMaxKg, volumeKg }) => (
      estimatedOneRepMaxKg ?? volumeKg
    ))
    .slice(-8) ?? [];
  return {
    weight: definedValues(
      analytics.weight.weekly
        .slice(-12)
        .map(({ averageWeightKg }) => averageWeightKg),
    ),
    activity: analytics.activity
      .slice(-12)
      .map(({ totalSportMinutes }) => totalSportMinutes),
    nutrition: definedValues(
      analytics.nutrition
        .slice(-12)
        .map(({ averageConsumedCaloriesKcal }) => averageConsumedCaloriesKcal),
    ),
    strength,
  };
}

interface MainSignalInput {
  weight: ProgressionWeightSummary;
  activity: ProgressionActivitySummary;
  nutrition: ProgressionNutritionSummary;
  strength: ProgressionStrengthSummary;
  week: ProgressionWeekSummary;
  review: ProgressionReviewSummary;
}

export function selectProgressionMainSignal({
  weight,
  activity,
  nutrition,
  strength,
  week,
  review,
}: MainSignalInput): ProgressionMainSignal {
  if (review.state === 'adjustmentProposed') {
    const adjustment = review.proposedAdjustmentKcal ?? 0;
    return {
      tone: 'attention',
      title: 'Une décision nutrition est en attente',
      detail: `${adjustment > 0 ? '+' : ''}${adjustment} kcal/j sont proposés dans le bilan hebdomadaire.`,
      destination: 'weeklyReview',
    };
  }

  if (
    week.plannedActivities > 0
    && week.completedActivities < week.plannedActivities
  ) {
    return {
      tone: 'attention',
      title: 'Le prévu et le réalisé diffèrent cette semaine',
      detail: `${week.completedActivities} activité${week.completedActivities > 1 ? 's' : ''} réalisée${week.completedActivities > 1 ? 's' : ''} sur ${week.plannedActivities} planifiée${week.plannedActivities > 1 ? 's' : ''}.`,
      destination: 'activity',
    };
  }

  if (weight.state === 'attention' && weight.changeKg !== undefined) {
    return {
      tone: 'attention',
      title: 'La tendance de poids mérite un coup d’œil',
      detail: `${weight.changeKg > 0 ? '+' : ''}${weight.changeKg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg entre les deux dernières moyennes hebdomadaires.`,
      destination: 'weight',
    };
  }

  if (
    strength.state === 'ready'
    && strength.changePercent !== undefined
    && strength.changePercent > 0
  ) {
    return {
      tone: 'positive',
      title: 'La force estimée progresse',
      detail: `${strength.exerciseName ?? 'Exercice principal'} : +${strength.changePercent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % sur la période enregistrée.`,
      destination: 'strength',
    };
  }

  if (activity.changeMinutes !== undefined && activity.changeMinutes > 0) {
    return {
      tone: 'positive',
      title: 'Le temps d’activité augmente',
      detail: `${activity.totalMinutes} min cette semaine, soit +${activity.changeMinutes} min par rapport à la précédente.`,
      destination: 'activity',
    };
  }

  if (weight.state === 'aligned') {
    return {
      tone: 'positive',
      title: 'La tendance de poids va dans le sens de l’objectif',
      detail: 'Ce constat compare uniquement les deux dernières moyennes hebdomadaires.',
      destination: 'weight',
    };
  }

  if (nutrition.trackedDays >= 3) {
    return {
      tone: 'neutral',
      title: 'Le suivi nutrition est exploitable cette semaine',
      detail: `${nutrition.trackedDays} jours comportent des aliments enregistrés.`,
      destination: 'nutrition',
    };
  }

  return {
    tone: 'neutral',
    title: 'Encore un peu de suivi pour dégager un signal',
    detail: 'Ajoute quelques données de poids, nutrition ou activité pour obtenir une synthèse factuelle.',
    destination: 'regularity',
  };
}

export function buildProgressionHubSummary({
  analytics,
  goalViews,
  profile,
  referenceDate,
  reviews = [],
  performance,
}: BuildProgressionHubSummaryInput): ProgressionHubSummary {
  const activity = buildActivitySummary(analytics);
  const weight = buildWeightSummary(analytics, profile);
  const nutrition = buildNutritionSummary(analytics);
  const strength = buildStrengthSummary(performance);
  const week = buildWeekSummary(analytics, performance);
  const review = buildReviewSummary(reviews);
  return {
    activity,
    weight,
    nutrition,
    strength,
    week,
    series: buildSeries(analytics, performance),
    signal: selectProgressionMainSignal({
      weight,
      activity,
      nutrition,
      strength,
      week,
      review,
    }),
    goal: buildGoalSummary(goalViews, referenceDate),
    review,
  };
}

export async function loadProgressionHubSummary(
  referenceDate: LocalDate,
  profile: UserProfile,
): Promise<ProgressionHubSummary> {
  const [performance, goalViews, reviews] = await Promise.all([
    loadPerformanceAnalytics(referenceDate, profile),
    refreshGoalProgress(),
    repositories.weeklyReviews.listAll(),
  ]);

  return buildProgressionHubSummary({
    analytics: performance.base,
    performance,
    goalViews,
    profile,
    referenceDate,
    reviews,
  });
}
