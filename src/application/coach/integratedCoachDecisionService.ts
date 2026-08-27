import { resolveAcceptedCalibrationAdjustment } from '@/application/daily/dailyTargetCoordinator';
import { getDailyCoachAnalysisPeriod } from '@/application/coach/dailyCoachService';
import {
  calculateStrengthPerformance,
  type StrengthPerformanceServiceDependencies,
} from '@/application/coach/strengthPerformanceService';
import {
  projectQualifiedCalorieObservations,
  resolveIntegratedCoachDecision,
  type IntegratedCoachDecision,
  type ResolveIntegratedCoachDecisionInput,
} from '@/domain/coach/integratedCoachDecision';
import {
  buildCoachStateObservations,
  type BuildCoachStateObservationsInput,
  type CoachStateObservation,
} from '@/domain/coach/coachStateObservations';
import {
  resolveCoachState,
  type ResolveCoachStateInput,
} from '@/domain/coach/coachStateResolver';
import {
  resolveCoachStateResult,
  type ResolveCoachStateResultInput,
} from '@/domain/coach/coachStateDecision';
import type { CoachStateResult } from '@/domain/coach/coachState';
import type { StrengthPerformanceSnapshot } from '@/domain/coach/strengthPerformance';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { CalorieAdaptationAssessment } from '@/domain/models/weeklyReview';
import {
  calculateCalorieAdaptationAssessment,
  type CalculateCalorieAdaptationAssessmentInput,
} from '@/domain/reviews/calorieAdaptationAssessment';
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
import { isValidLocalDate } from '@/shared/validation/localDate';

export interface CalculateIntegratedCoachDecisionInput {
  referenceDate: LocalDate;
  profile: UserProfile;
  referenceWeightKg: number;
}

export interface IntegratedCoachAnalysis {
  coachStateResult: CoachStateResult;
  strengthPerformance: StrengthPerformanceSnapshot;
  calorieAssessment: CalorieAdaptationAssessment;
  decision: IntegratedCoachDecision;
}

export interface IntegratedCoachDecisionServiceDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'listBetween'>;
  food: Pick<FoodRepository, 'listEntriesBetween' | 'listJournalStatusesBetween'>;
  targets: Pick<TargetRepository, 'listTargetsBetween'>;
  steps: Pick<StepsRepository, 'listBetween'>;
  dailyCoaching: Pick<
    DailyCoachingRepository,
    'listCheckInsBetween' | 'listCheckOutsBetween'
  >;
  activities: Pick<ActivityRepository, 'listBetween'>;
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll'>;
  weeklyReviews: Pick<WeeklyReviewRepository, 'listAdjustments'>;
  strengthPerformance?: StrengthPerformanceServiceDependencies;
  calculateStrength?: typeof calculateStrengthPerformance;
  buildObservations?: (
    input: BuildCoachStateObservationsInput,
  ) => CoachStateObservation[];
  resolveState?: (input: ResolveCoachStateInput) => ReturnType<typeof resolveCoachState>;
  resolveStateResult?: (
    input: ResolveCoachStateResultInput,
  ) => ReturnType<typeof resolveCoachStateResult>;
  calculateCalorieAssessment?: (
    input: CalculateCalorieAdaptationAssessmentInput,
  ) => ReturnType<typeof calculateCalorieAdaptationAssessment>;
  resolveDecision?: (
    input: ResolveIntegratedCoachDecisionInput,
  ) => IntegratedCoachDecision;
}

const defaultDependencies: IntegratedCoachDecisionServiceDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  food: repositories.food,
  targets: repositories.targets,
  steps: repositories.steps,
  dailyCoaching: repositories.dailyCoaching,
  activities: repositories.activities,
  workoutSessions: repositories.workoutSessions,
  weeklyReviews: repositories.weeklyReviews,
};

export async function calculateIntegratedCoachAnalysis(
  input: CalculateIntegratedCoachDecisionInput,
  dependencies: IntegratedCoachDecisionServiceDependencies = defaultDependencies,
): Promise<IntegratedCoachAnalysis> {
  if (!isValidLocalDate(input.referenceDate)) {
    throw new Error('La date de référence de la décision Coach intégrée est invalide.');
  }
  if (!Number.isFinite(input.referenceWeightKg) || input.referenceWeightKg <= 0) {
    throw new Error('Le poids de référence de la décision Coach intégrée est invalide.');
  }

  const { analysisStart, analysisEnd } = getDailyCoachAnalysisPeriod(input.referenceDate);
  const [
    settings,
    weights,
    foodEntries,
    journalStatuses,
    dailyTargets,
    dailySteps,
    checkIns,
    checkOuts,
    activities,
    allWorkoutSessions,
    adjustments,
    strengthPerformance,
  ] = await Promise.all([
    dependencies.settings.get(),
    dependencies.weight.listBetween(analysisStart, analysisEnd),
    dependencies.food.listEntriesBetween(analysisStart, analysisEnd),
    dependencies.food.listJournalStatusesBetween(analysisStart, analysisEnd),
    dependencies.targets.listTargetsBetween(analysisStart, analysisEnd),
    dependencies.steps.listBetween(analysisStart, analysisEnd),
    dependencies.dailyCoaching.listCheckInsBetween(analysisStart, analysisEnd),
    dependencies.dailyCoaching.listCheckOutsBetween(analysisStart, analysisEnd),
    dependencies.activities.listBetween(analysisStart, analysisEnd),
    dependencies.workoutSessions.listAll(),
    dependencies.weeklyReviews.listAdjustments(),
    (dependencies.calculateStrength ?? calculateStrengthPerformance)(
      input.referenceDate,
      dependencies.strengthPerformance,
    ),
  ]);
  const workoutSessions = allWorkoutSessions.filter(({ date }) => (
    date >= analysisStart && date <= analysisEnd
  ));
  const observations = (dependencies.buildObservations ?? buildCoachStateObservations)({
    analysisStart,
    analysisEnd,
    fallbackExpectedSteps: input.profile.dailyStepGoal,
    weights,
    foodEntries,
    journalStatuses,
    dailyTargets,
    dailySteps,
    checkIns,
    checkOuts,
    activities,
    workoutSessions,
  });
  const targetWeeklyWeightChangeKg = input.referenceWeightKg
    * (input.profile.targetWeeklyWeightChangePercent / 100);
  const analysis = (dependencies.resolveState ?? resolveCoachState)({
    observations,
    goal: input.profile.goal,
    targetWeeklyWeightChangeKg,
  });
  const coachStateResult = (
    dependencies.resolveStateResult ?? resolveCoachStateResult
  )({
    analysis,
    referenceDate: input.referenceDate,
  });
  const applicableAdjustments = adjustments.filter(({ effectiveFrom }) => (
    effectiveFrom <= input.referenceDate
  ));
  const latestAcceptedAdjustmentDate = applicableAdjustments
    .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom))
    .at(-1)?.effectiveFrom;
  const calorieAssessment = (
    dependencies.calculateCalorieAssessment ?? calculateCalorieAdaptationAssessment
  )({
    analysisStart,
    analysisEnd,
    observations: projectQualifiedCalorieObservations(observations),
    goal: input.profile.goal,
    targetWeeklyWeightChangeKg,
    currentCumulativeAdjustmentKcal: resolveAcceptedCalibrationAdjustment(
      adjustments,
      input.referenceDate,
    ),
    maximumWeeklyAdjustmentKcal: settings.maximumWeeklyAdjustmentKcal,
    maximumCumulativeAdjustmentKcal: settings.maximumCumulativeAdjustmentKcal,
    ...(latestAcceptedAdjustmentDate ? { latestAcceptedAdjustmentDate } : {}),
  });

  const decision = (dependencies.resolveDecision ?? resolveIntegratedCoachDecision)({
    referenceDate: input.referenceDate,
    coachStateResult,
    strengthPerformance,
    calorieAssessment,
  });
  return { coachStateResult, strengthPerformance, calorieAssessment, decision };
}

export async function calculateIntegratedCoachDecision(
  input: CalculateIntegratedCoachDecisionInput,
  dependencies: IntegratedCoachDecisionServiceDependencies = defaultDependencies,
): Promise<IntegratedCoachDecision> {
  return (await calculateIntegratedCoachAnalysis(input, dependencies)).decision;
}
