import { parseISO, subDays } from 'date-fns';
import type { LocalDate } from '@/domain/models/common';
import type { Activity } from '@/domain/models/activity';
import type { UserProfile } from '@/domain/models/profile';
import type { WorkoutSession } from '@/domain/models/strength';

import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import {
  calculateWeeklyReview,
  getAdjustmentEffectiveDate,
  resolveWeeklyReviewPeriod,
} from '@/domain/reviews/weeklyReview';
import { resolveAcceptedCalibrationAdjustment } from '@/application/daily/dailyTargetCoordinator';
import { buildEndurancePlanningWeek } from '@/application/planning/endurancePlanningService';
import { buildWeeklyReviewInsights, type WeeklyReviewInsights } from '@/domain/reviews/weeklyReviewInsights';
import { emptyEndurancePlanningState, readEndurancePlanningState, type EndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import {
  calculateCalorieAdaptationAssessment,
  CALORIE_ADAPTATION_WINDOW_DAYS,
} from '@/domain/reviews/calorieAdaptationAssessment';
import { buildCalorieAdaptationObservations } from '@/domain/reviews/calorieAdaptationObservations';
import {
  loadEnergyArchitectureRetrospective,
} from '@/application/daily/energyArchitectureRetrospectiveService';
import type {
  EnergyArchitectureRetrospectiveReport,
} from '@/domain/calculations/energyArchitectureRetrospective';

import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';

import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeeklyReviewRepository } from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';

import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export interface WeeklyReviewServiceDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'listBetween'>;
  food: Pick<FoodRepository, 'listEntriesBetween' | 'listJournalStatusesBetween'>;
  steps: Pick<StepsRepository, 'listBetween'>;
  targets: Pick<TargetRepository, 'listTargetsBetween'>;
  dailyCoaching: Pick<
    DailyCoachingRepository,
    'listCheckInsBetween' | 'listCheckOutsBetween'
  >;
  activities?: Pick<ActivityRepository, 'listBetween'>;
  workoutSessions?: Pick<WorkoutSessionRepository, 'listAll'>;
  readEndurancePlanningState?: () => EndurancePlanningState;
  loadEnergyRetrospective: (
    analysisEnd: LocalDate,
    profile: UserProfile,
  ) => Promise<EnergyArchitectureRetrospectiveReport>;

  weeklyReviews: Pick<
    WeeklyReviewRepository,
    'getByWeekStart' | 'upsert' | 'listAll' | 'listAdjustments' | 'accept' | 'reject'
  >;
}

const defaultDependencies: WeeklyReviewServiceDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  food: repositories.food,
  steps: repositories.steps,
  targets: repositories.targets,
  dailyCoaching: repositories.dailyCoaching,
  activities: repositories.activities,
  workoutSessions: repositories.workoutSessions,
  readEndurancePlanningState,
  loadEnergyRetrospective: loadEnergyArchitectureRetrospective,

  weeklyReviews: repositories.weeklyReviews,
};

export interface WeeklyReviewSnapshot {
  review: WeeklyReview;
  reviews: WeeklyReview[];
  adjustments: AcceptedCalorieAdjustment[];
  insights?: WeeklyReviewInsights;
  energyRetrospective?: EnergyArchitectureRetrospectiveReport;
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle];
}

export async function loadWeeklyReview(
  referenceDate: LocalDate,
  profile: UserProfile,
  dependencies: WeeklyReviewServiceDependencies = defaultDependencies,
): Promise<WeeklyReviewSnapshot> {
  const period = resolveWeeklyReviewPeriod(referenceDate);
  const analysisStart = toLocalDate(subDays(
    parseISO(period.weekEnd),
    CALORIE_ADAPTATION_WINDOW_DAYS - 1,
  ));
  const [
    existing,
    settings,
    analysisWeights,
    foodEntries,
    dailyTargets,
    statuses,
    steps,
    adjustments,
    activities,
    workoutSessions,
    endurancePlanningState,
    checkIns,
    checkOuts,
    energyRetrospective,
  ] = await Promise.all([
    dependencies.weeklyReviews.getByWeekStart(period.weekStart),
    dependencies.settings.get(),
    dependencies.weight.listBetween(analysisStart, period.weekEnd),
    dependencies.food.listEntriesBetween(analysisStart, period.weekEnd),
    dependencies.targets.listTargetsBetween(analysisStart, period.weekEnd),
    dependencies.food.listJournalStatusesBetween(analysisStart, period.weekEnd),
    dependencies.steps.listBetween(analysisStart, period.weekEnd),
    dependencies.weeklyReviews.listAdjustments(),
    dependencies.activities?.listBetween(analysisStart, period.weekEnd)
      ?? Promise.resolve([] as Activity[]),
    dependencies.workoutSessions?.listAll()
      ?? Promise.resolve([] as WorkoutSession[]),
    Promise.resolve(
      dependencies.readEndurancePlanningState?.()
        ?? emptyEndurancePlanningState(),
    ),
    dependencies.dailyCoaching.listCheckInsBetween(analysisStart, period.weekEnd),
    dependencies.dailyCoaching.listCheckOutsBetween(analysisStart, period.weekEnd),
    dependencies.loadEnergyRetrospective(period.weekEnd, profile)
      .catch(() => undefined),
  ]);
  const inPeriod = (date: LocalDate, from: LocalDate, to: LocalDate) => (
    date >= from && date <= to
  );
  const currentWeights = analysisWeights.filter(({ date }) => (
    inPeriod(date, period.weekStart, period.weekEnd)
  ));
  const previousWeights = analysisWeights.filter(({ date }) => (
    inPeriod(date, period.previousWeekStart, period.previousWeekEnd)
  ));
  const currentFoodEntries = foodEntries.filter(({ date }) => (
    inPeriod(date, period.weekStart, period.weekEnd)
  ));
  const currentTargets = dailyTargets.filter(({ date }) => (
    inPeriod(date, period.weekStart, period.weekEnd)
  ));
  const currentStatuses = statuses.filter(({ date }) => (
    inPeriod(date, period.weekStart, period.weekEnd)
  ));
  const currentSteps = steps.filter(({ date }) => (
    inPeriod(date, period.weekStart, period.weekEnd)
  ));
  const endurancePlanning = buildEndurancePlanningWeek(
    endurancePlanningState,
    activities,
    period.weekStart,
  );
  const insightsFor = (review: WeeklyReview) => buildWeeklyReviewInsights({
    review,
    activities,
    workoutSessions,
    endurancePlanning,
  });
  if (existing?.decisionStatus === 'accepted' || existing?.decisionStatus === 'rejected') {
    const reviews = await dependencies.weeklyReviews.listAll();
    return {
      review: existing,
      reviews,
      adjustments,
      insights: insightsFor(existing),
      ...(energyRetrospective ? { energyRetrospective } : {}),
    };
  }

  const effectiveFrom = getAdjustmentEffectiveDate({ weekEnd: period.weekEnd });
  const currentCumulativeAdjustmentKcal = resolveAcceptedCalibrationAdjustment(
    adjustments,
    effectiveFrom,
  );
  const referenceWeightKg = median(
    analysisWeights.map(({ weightKg }) => weightKg),
  ) ?? profile.initialWeightKg;
  const latestAcceptedAdjustmentDate = adjustments
    .filter(({ effectiveFrom: date }) => date <= period.weekEnd)
    .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom))
    .at(-1)?.effectiveFrom;
  const adaptation = calculateCalorieAdaptationAssessment({
    analysisStart,
    analysisEnd: period.weekEnd,
    observations: buildCalorieAdaptationObservations({
      analysisStart,
      analysisEnd: period.weekEnd,
      fallbackExpectedSteps: profile.dailyStepGoal,
      weights: analysisWeights,
      foodEntries,
      dailyTargets,
      journalStatuses: statuses,
      dailySteps: steps,
      checkIns,
      checkOuts,
      activities,
      workoutSessions,
    }),
    goal: profile.goal,
    targetWeeklyWeightChangeKg:
      referenceWeightKg * (profile.targetWeeklyWeightChangePercent / 100),
    currentCumulativeAdjustmentKcal,
    maximumWeeklyAdjustmentKcal: settings.maximumWeeklyAdjustmentKcal,
    maximumCumulativeAdjustmentKcal: settings.maximumCumulativeAdjustmentKcal,
    ...(latestAcceptedAdjustmentDate ? { latestAcceptedAdjustmentDate } : {}),
  });
  const calculated = calculateWeeklyReview({
    ...period,
    profile,
    settings,
    currentWeights,
    previousWeights,
    foodEntries: currentFoodEntries,
    dailyTargets: currentTargets,
    journalStatuses: currentStatuses,
    dailySteps: currentSteps,
    currentCumulativeAdjustmentKcal,
    adaptation,
  });
  const review = await dependencies.weeklyReviews.upsert(calculated);
  const reviews = await dependencies.weeklyReviews.listAll();
  return {
    review,
    reviews,
    adjustments,
    insights: insightsFor(review),
    ...(energyRetrospective ? { energyRetrospective } : {}),
  };
}

export async function acceptWeeklyReview(
  weekStart: LocalDate,
  dependencies: WeeklyReviewServiceDependencies = defaultDependencies,
): Promise<WeeklyReview> {
  const review = await dependencies.weeklyReviews.getByWeekStart(weekStart);
  if (!review) throw new Error('Bilan hebdomadaire introuvable.');
  if (!review.isCalibrationEligible || review.decisionStatus === 'notEligible') {
    throw new Error('Ce bilan ne remplit pas les conditions minimales de calibration.');
  }
  if (review.decisionStatus === 'rejected') {
    throw new Error('Ce bilan a déjà été refusé.');
  }

  const adjustment = review.proposedAdjustmentKcal === 0
    ? undefined
    : {
        weeklyReviewId: review.id,
        effectiveFrom: getAdjustmentEffectiveDate(review),
        adjustmentKcalPerDay: review.proposedAdjustmentKcal,
        resultingCumulativeAdjustmentKcal: review.resultingCumulativeAdjustmentKcal,
        status: 'active' as const,
      };
  const result = await dependencies.weeklyReviews.accept(weekStart, adjustment);
  return result.review;
}

export async function rejectWeeklyReview(
  weekStart: LocalDate,
  dependencies: WeeklyReviewServiceDependencies = defaultDependencies,
): Promise<WeeklyReview> {
  const review = await dependencies.weeklyReviews.getByWeekStart(weekStart);
  if (!review) throw new Error('Bilan hebdomadaire introuvable.');
  if (review.decisionStatus === 'accepted') {
    throw new Error('Ce bilan a déjà été accepté.');
  }
  return dependencies.weeklyReviews.reject(weekStart);
}
