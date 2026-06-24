import { calculateDailyTarget, type DailyTargetCalculationResult } from '@/domain/calculations/dailyTarget';
import type { Activity } from '@/domain/models/activity';
import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { AppSettings } from '@/domain/models/settings';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type { AcceptedCalorieAdjustment } from '@/domain/models/weeklyReview';
import type { WeightEntry } from '@/domain/models/weight';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeeklyReviewRepository } from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export type CalculationWeightResolution =
  | {
      weightKg: number;
      source: 'weightEntry';
      weightEntry: WeightEntry;
    }
  | {
      weightKg: number;
      source: 'profile';
    };

export interface DailyTargetCoordinatorDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'getLatestOnOrBefore'>;
  steps: Pick<StepsRepository, 'getByDate'>;
  activities: Pick<ActivityRepository, 'listByDate'>;
  targets: Pick<TargetRepository, 'upsertTarget'>;
  weeklyReviews: Pick<WeeklyReviewRepository, 'listAdjustments'>;
}

export interface DailyTargetSnapshot {
  date: LocalDate;
  settings: AppSettings;
  calculation: DailyTargetCalculationResult;
  target: DailyTarget;
  weight: CalculationWeightResolution;
  stepsEntry: DailySteps | undefined;
  activities: Activity[];
}

const defaultDependencies: DailyTargetCoordinatorDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  steps: repositories.steps,
  activities: repositories.activities,
  targets: repositories.targets,
  weeklyReviews: repositories.weeklyReviews,
};

export function resolveCalculationWeight(
  profile: UserProfile,
  weightEntry: WeightEntry | undefined,
): CalculationWeightResolution {
  if (weightEntry) {
    return {
      weightKg: weightEntry.weightKg,
      source: 'weightEntry',
      weightEntry,
    };
  }

  return {
    weightKg: profile.initialWeightKg,
    source: 'profile',
  };
}

function isAdjustmentActiveOnDate(
  adjustment: AcceptedCalorieAdjustment,
  date: LocalDate,
): boolean {
  if (adjustment.effectiveFrom > date) {
    return false;
  }

  if (adjustment.status === 'active') {
    return true;
  }

  if (!adjustment.revertedAt) {
    return false;
  }

  return date < adjustment.revertedAt.slice(0, 10);
}

export function resolveAcceptedCalibrationAdjustment(
  adjustments: readonly AcceptedCalorieAdjustment[],
  date: LocalDate,
): number {
  const applicable = adjustments
    .filter((adjustment) => isAdjustmentActiveOnDate(adjustment, date))
    .sort((left, right) => {
      const dateComparison = left.effectiveFrom.localeCompare(right.effectiveFrom);
      return dateComparison !== 0
        ? dateComparison
        : left.createdAt.localeCompare(right.createdAt);
    });

  return applicable.at(-1)?.resultingCumulativeAdjustmentKcal ?? 0;
}

function toDailyTargetInput(
  date: LocalDate,
  calculation: DailyTargetCalculationResult,
): NewEntity<DailyTarget> {
  return {
    date,
    calculationWeightKg: calculation.calculationWeightKg,
    energy: calculation.energy,
    goalAdjustmentKcal: calculation.goalAdjustmentKcal,
    acceptedCalibrationAdjustmentKcal:
      calculation.acceptedCalibrationAdjustmentKcal,
    calorieFloorKcal: calculation.calorieFloorKcal,
    targetCaloriesKcal: calculation.targetCaloriesKcal,
    macros: calculation.macros,
    calculationVersion: calculation.calculationVersion,
  };
}

export async function calculateAndPersistDailyTarget(
  date: LocalDate,
  profile: UserProfile,
  dependencies: DailyTargetCoordinatorDependencies = defaultDependencies,
): Promise<DailyTargetSnapshot> {
  const [settings, weightEntry, stepsEntry, activities, adjustments] = await Promise.all([
    dependencies.settings.get(),
    dependencies.weight.getLatestOnOrBefore(date),
    dependencies.steps.getByDate(date),
    dependencies.activities.listByDate(date),
    dependencies.weeklyReviews.listAdjustments(),
  ]);

  const weight = resolveCalculationWeight(profile, weightEntry);
  const acceptedCalibrationAdjustmentKcal = resolveAcceptedCalibrationAdjustment(
    adjustments,
    date,
  );
  const calculation = calculateDailyTarget({
    date,
    profile,
    settings,
    weightKg: weight.weightKg,
    totalSteps: stepsEntry?.totalSteps ?? 0,
    activities,
    acceptedCalibrationAdjustmentKcal,
  });
  const target = await dependencies.targets.upsertTarget(
    toDailyTargetInput(date, calculation),
  );

  return {
    date,
    settings,
    calculation,
    target,
    weight,
    stepsEntry,
    activities,
  };
}
