import { parseISO, subDays } from 'date-fns';
import {
  projectDailyCoach,
  type DailyCoachResult,
} from '@/domain/coach/dailyCoach';
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
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import { CALORIE_ADAPTATION_WINDOW_DAYS } from '@/domain/reviews/calorieAdaptationAssessment';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { StepsRepository } from '@/infrastructure/repositories/contracts/StepsRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

export interface CalculateDailyCoachInput {
  date: LocalDate;
  profile: UserProfile;
  referenceWeightKg: number;
}

export interface DailyCoachServiceDependencies {
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
  buildObservations?: (
    input: BuildCoachStateObservationsInput,
  ) => CoachStateObservation[];
  resolveState?: (input: ResolveCoachStateInput) => ReturnType<typeof resolveCoachState>;
  resolveStateResult?: (
    input: ResolveCoachStateResultInput,
  ) => ReturnType<typeof resolveCoachStateResult>;
  project?: typeof projectDailyCoach;
}

const defaultDependencies: DailyCoachServiceDependencies = {
  weight: repositories.weight,
  food: repositories.food,
  targets: repositories.targets,
  steps: repositories.steps,
  dailyCoaching: repositories.dailyCoaching,
  activities: repositories.activities,
  workoutSessions: repositories.workoutSessions,
};

export function getDailyCoachAnalysisPeriod(date: LocalDate): {
  analysisStart: LocalDate;
  analysisEnd: LocalDate;
} {
  return {
    analysisStart: toLocalDate(subDays(
      parseISO(date),
      CALORIE_ADAPTATION_WINDOW_DAYS - 1,
    )),
    analysisEnd: date,
  };
}

export async function calculateDailyCoach(
  input: CalculateDailyCoachInput,
  dependencies: DailyCoachServiceDependencies = defaultDependencies,
): Promise<DailyCoachResult> {
  if (!isValidLocalDate(input.date)) {
    throw new Error('La date du Coach du jour est invalide.');
  }
  if (!Number.isFinite(input.referenceWeightKg) || input.referenceWeightKg <= 0) {
    throw new Error('Le poids de référence du Coach du jour est invalide.');
  }

  const { analysisStart, analysisEnd } = getDailyCoachAnalysisPeriod(input.date);
  const [
    weights,
    foodEntries,
    journalStatuses,
    dailyTargets,
    dailySteps,
    checkIns,
    checkOuts,
    activities,
    allWorkoutSessions,
  ] = await Promise.all([
    dependencies.weight.listBetween(analysisStart, analysisEnd),
    dependencies.food.listEntriesBetween(analysisStart, analysisEnd),
    dependencies.food.listJournalStatusesBetween(analysisStart, analysisEnd),
    dependencies.targets.listTargetsBetween(analysisStart, analysisEnd),
    dependencies.steps.listBetween(analysisStart, analysisEnd),
    dependencies.dailyCoaching.listCheckInsBetween(analysisStart, analysisEnd),
    dependencies.dailyCoaching.listCheckOutsBetween(analysisStart, analysisEnd),
    dependencies.activities.listBetween(analysisStart, analysisEnd),
    dependencies.workoutSessions.listAll(),
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
  const analysis = (dependencies.resolveState ?? resolveCoachState)({
    observations,
    goal: input.profile.goal,
    targetWeeklyWeightChangeKg:
      input.referenceWeightKg
      * (input.profile.targetWeeklyWeightChangePercent / 100),
  });
  const coachStateResult = (
    dependencies.resolveStateResult ?? resolveCoachStateResult
  )({
    analysis,
    referenceDate: input.date,
  });

  const todayObservation = observations.find(({ date }) => date === input.date);
  return (dependencies.project ?? projectDailyCoach)({
    coachStateResult,
    ...(todayObservation ? { todayObservation } : {}),
  });
}
