import { parseISO, subDays } from 'date-fns';
import { calculateDailyTarget, type DailyTargetCalculationResult } from '@/domain/calculations/dailyTarget';
import {
  calculateDailyExpenditure,
  type DailyExpenditureResult,
} from '@/domain/calculations/expenditure';
import {
  compareEnergyArchitectures,
  type EnergyArchitectureShadowComparison,
} from '@/domain/calculations/energyArchitectureShadow';
import {
  estimateExpectedSteps,
  EXPECTED_STEPS_OBSERVATION_WINDOW_DAYS,
} from '@/domain/calculations/expectedSteps';
import type { Activity } from '@/domain/models/activity';
import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import type { AppSettings } from '@/domain/models/settings';
import type { DailySteps } from '@/domain/models/steps';
import type { ExpectedStepsEstimate } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type { AcceptedCalorieAdjustment } from '@/domain/models/weeklyReview';
import {
  getPreviousCalendarWeekRange,
  resolveReferenceWeight,
  type ReferenceWeightResolution,
} from '@/domain/calculations/referenceWeight';
import type { WeightEntry } from '@/domain/models/weight';
import { buildPlannedActivityCalories } from '@/application/planning/plannedActivityCalories';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeeklyReviewRepository } from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { readEndurancePlanningState } from '@/domain/planning/endurancePlanningState';
import {
  buildDailyEnergyTransparency,
  type DailyEnergyTransparency,
} from '@/application/daily/dailyEnergyTransparency';
import { toLocalDate } from '@/shared/utils/dates';

export type CalculationWeightResolution = ReferenceWeightResolution;

export interface DailyTargetCoordinatorDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'getByDate' | 'listBetween'>;
  steps: Pick<StepsRepository, 'getByDate' | 'listBetween'>;
  dailyCoaching: Pick<DailyCoachingRepository, 'getCheckOut'>;
  activities: Pick<ActivityRepository, 'listByDate'>;
  targets: Pick<TargetRepository, 'upsertTarget'>;
  weeklyReviews: Pick<WeeklyReviewRepository, 'listAdjustments'>;
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll'>;
  listEndurancePlanningSessions: () => Promise<PlannedEnduranceSession[]> | PlannedEnduranceSession[];
}

export interface DailyTargetSnapshot {
  date: LocalDate;
  settings: AppSettings;
  calculation: DailyTargetCalculationResult;
  target: DailyTarget;
  weight: CalculationWeightResolution;
  dateWeightEntry: WeightEntry | undefined;
  stepsEntry: DailySteps | undefined;
  activities: Activity[];
  plannedActivities: PlannedActivityCalorieSnapshot[];
  energyTransparency: DailyEnergyTransparency;
  energyGuidance: DailyEnergyGuidance;
  energyArchitectureShadow: DailyEnergyArchitectureShadow;
}

export interface DailyEnergyGuidance {
  expectedSteps: ExpectedStepsEstimate;
  finalStatus: 'open' | 'missingSteps' | 'final';
  finalExpenditure?: DailyExpenditureResult;
}

export interface DailyEnergyArchitectureShadow {
  guided: EnergyArchitectureShadowComparison;
  final?: EnergyArchitectureShadowComparison;
}

const defaultDependencies: DailyTargetCoordinatorDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  steps: repositories.steps,
  dailyCoaching: repositories.dailyCoaching,
  activities: repositories.activities,
  targets: repositories.targets,
  weeklyReviews: repositories.weeklyReviews,
  workoutSessions: repositories.workoutSessions,
  listEndurancePlanningSessions: () => readEndurancePlanningState().sessions,
};

export function resolveCalculationWeight(
  date: LocalDate,
  profile: UserProfile,
  previousWeekEntries: readonly WeightEntry[],
): CalculationWeightResolution {
  return resolveReferenceWeight(
    date,
    profile.initialWeightKg,
    previousWeekEntries,
  );
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
  expectedSteps: ExpectedStepsEstimate,
): NewEntity<DailyTarget> {
  return {
    date,
    calculationWeightKg: calculation.calculationWeightKg,
    energy: calculation.energy,
    targetWeeklyWeightChangePercentUsed:
      calculation.targetWeeklyWeightChangePercentUsed,
    goalAdjustmentKcal: calculation.goalAdjustmentKcal,
    acceptedCalibrationAdjustmentKcal:
      calculation.acceptedCalibrationAdjustmentKcal,
    calorieFloorKcal: calculation.calorieFloorKcal,
    targetCaloriesKcal: calculation.targetCaloriesKcal,
    macros: calculation.macros,
    plannedActivities: calculation.plannedActivities,
    stepBasis: {
      mode: 'expected',
      steps: expectedSteps.expectedSteps,
      stepGoal: expectedSteps.stepGoal,
      source: expectedSteps.source,
      confidence: expectedSteps.confidence,
      observedDayCount: expectedSteps.observedDayCount,
      observationWindowDays: expectedSteps.observationWindowDays,
    },
    calculationVersion: calculation.calculationVersion,
  };
}

export async function calculateAndPersistDailyTarget(
  date: LocalDate,
  profile: UserProfile,
  dependencies: DailyTargetCoordinatorDependencies = defaultDependencies,
): Promise<DailyTargetSnapshot> {
  const referencePeriod = getPreviousCalendarWeekRange(date);
  const stepHistoryStart = toLocalDate(
    subDays(parseISO(date), EXPECTED_STEPS_OBSERVATION_WINDOW_DAYS),
  );
  const stepHistoryEnd = toLocalDate(subDays(parseISO(date), 1));
  const [
    settings,
    previousWeekEntries,
    dateWeightEntry,
    stepsEntry,
    activities,
    adjustments,
    strengthSessions,
    enduranceSessions,
    stepHistory,
    checkOut,
  ] = await Promise.all([
    dependencies.settings.get(),
    dependencies.weight.listBetween(referencePeriod.start, referencePeriod.end),
    dependencies.weight.getByDate(date),
    dependencies.steps.getByDate(date),
    dependencies.activities.listByDate(date),
    dependencies.weeklyReviews.listAdjustments(),
    dependencies.workoutSessions.listAll(),
    dependencies.listEndurancePlanningSessions(),
    dependencies.steps.listBetween(stepHistoryStart, stepHistoryEnd),
    dependencies.dailyCoaching.getCheckOut(date),
  ]);

  const weight = resolveCalculationWeight(date, profile, previousWeekEntries);
  const acceptedCalibrationAdjustmentKcal = resolveAcceptedCalibrationAdjustment(
    adjustments,
    date,
  );
  const plannedActivities = buildPlannedActivityCalories({
    date,
    weightKg: weight.weightKg,
    settings,
    activities,
    strengthSessions,
    enduranceSessions,
  });
  const expectedSteps = estimateExpectedSteps({
    date,
    occupationalActivity: profile.occupationalActivity,
    stepGoal: profile.dailyStepGoal,
    includedBaseSteps: settings.includedBaseSteps,
    history: stepHistory,
  });
  const calculation = calculateDailyTarget({
    date,
    profile,
    settings,
    weightKg: weight.weightKg,
    totalSteps: expectedSteps.expectedSteps,
    activities,
    plannedActivities,
    acceptedCalibrationAdjustmentKcal,
  });
  const guidedEnergyArchitectureShadow = compareEnergyArchitectures({
    date,
    profile,
    settings,
    weightKg: weight.weightKg,
    totalSteps: expectedSteps.expectedSteps,
    activities,
    plannedActivities,
  });
  const target = await dependencies.targets.upsertTarget(
    toDailyTargetInput(date, calculation, expectedSteps),
  );
  const energyTransparency = buildDailyEnergyTransparency({
    date,
    calculation,
    activities,
    plannedActivities,
    strengthSessions,
    enduranceSessions,
    settings,
    weightKg: weight.weightKg,
  });
  const finalStepsEntry = checkOut?.stepsEntryId === stepsEntry?.id
    ? stepsEntry
    : undefined;
  const finalExpenditure = checkOut && finalStepsEntry
    ? calculateDailyExpenditure({
        date,
        profile,
        settings,
        weightKg: weight.weightKg,
        totalSteps: finalStepsEntry.totalSteps,
        activities,
      })
    : undefined;
  const finalEnergyArchitectureShadow = checkOut && finalStepsEntry
    ? compareEnergyArchitectures({
        date,
        profile,
        settings,
        weightKg: weight.weightKg,
        totalSteps: finalStepsEntry.totalSteps,
        activities,
      })
    : undefined;
  const energyGuidance: DailyEnergyGuidance = {
    expectedSteps,
    finalStatus: !checkOut
      ? 'open'
      : finalExpenditure
        ? 'final'
        : 'missingSteps',
    ...(finalExpenditure ? { finalExpenditure } : {}),
  };

  return {
    date,
    settings,
    calculation,
    target,
    weight,
    dateWeightEntry,
    stepsEntry,
    activities,
    plannedActivities,
    energyTransparency,
    energyGuidance,
    energyArchitectureShadow: {
      guided: guidedEnergyArchitectureShadow,
      ...(finalEnergyArchitectureShadow
        ? { final: finalEnergyArchitectureShadow }
        : {}),
    },
  };
}
