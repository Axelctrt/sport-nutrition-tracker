import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { AcceptedCalorieAdjustment, WeeklyReview } from '@/domain/models/weeklyReview';
import {
  calculateWeeklyReview,
  getAdjustmentEffectiveDate,
  resolveWeeklyReviewPeriod,
} from '@/domain/reviews/weeklyReview';
import { resolveAcceptedCalibrationAdjustment } from '@/application/daily/dailyTargetCoordinator';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeeklyReviewRepository } from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface WeeklyReviewServiceDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'listBetween'>;
  food: Pick<FoodRepository, 'listEntriesBetween' | 'listJournalStatusesBetween'>;
  steps: Pick<StepsRepository, 'listBetween'>;
  targets: Pick<TargetRepository, 'listTargetsBetween'>;
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
  weeklyReviews: repositories.weeklyReviews,
};

export interface WeeklyReviewSnapshot {
  review: WeeklyReview;
  reviews: WeeklyReview[];
  adjustments: AcceptedCalorieAdjustment[];
}

export async function loadWeeklyReview(
  referenceDate: LocalDate,
  profile: UserProfile,
  dependencies: WeeklyReviewServiceDependencies = defaultDependencies,
): Promise<WeeklyReviewSnapshot> {
  const period = resolveWeeklyReviewPeriod(referenceDate);
  const [existing, settings, currentWeights, previousWeights, foodEntries, dailyTargets, statuses, steps, adjustments] = await Promise.all([
    dependencies.weeklyReviews.getByWeekStart(period.weekStart),
    dependencies.settings.get(),
    dependencies.weight.listBetween(period.weekStart, period.weekEnd),
    dependencies.weight.listBetween(period.previousWeekStart, period.previousWeekEnd),
    dependencies.food.listEntriesBetween(period.weekStart, period.weekEnd),
    dependencies.targets.listTargetsBetween(period.weekStart, period.weekEnd),
    dependencies.food.listJournalStatusesBetween(period.weekStart, period.weekEnd),
    dependencies.steps.listBetween(period.weekStart, period.weekEnd),
    dependencies.weeklyReviews.listAdjustments(),
  ]);

  if (existing?.decisionStatus === 'accepted' || existing?.decisionStatus === 'rejected') {
    const reviews = await dependencies.weeklyReviews.listAll();
    return { review: existing, reviews, adjustments };
  }

  const effectiveFrom = getAdjustmentEffectiveDate({ weekEnd: period.weekEnd });
  const currentCumulativeAdjustmentKcal = resolveAcceptedCalibrationAdjustment(
    adjustments,
    effectiveFrom,
  );
  const calculated = calculateWeeklyReview({
    ...period,
    profile,
    settings,
    currentWeights,
    previousWeights,
    foodEntries,
    dailyTargets,
    journalStatuses: statuses,
    dailySteps: steps,
    currentCumulativeAdjustmentKcal,
  });
  const review = await dependencies.weeklyReviews.upsert(calculated);
  const reviews = await dependencies.weeklyReviews.listAll();
  return { review, reviews, adjustments };
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
