import { calculateDailyCoach } from '@/application/coach/dailyCoachService';
import { resolveCurrentCoachPhase } from '@/application/coach/coachPhaseService';
import {
  calculateImmediateCoachSafety,
  type CalculateImmediateCoachSafetyInput,
} from '@/application/coach/coachSafetyService';
import {
  calculateIntegratedCoachAnalysis,
  type CalculateIntegratedCoachDecisionInput,
  type IntegratedCoachAnalysis,
} from '@/application/coach/integratedCoachDecisionService';
import {
  buildTrainingAgenda,
  type TrainingAgendaEntry,
} from '@/application/planning/trainingAgendaService';
import { planningDateForSession } from '@/application/strength/weeklyPlanningService';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { resolveCoachReferenceWeight } from '@/application/weekly-review/weeklyReviewService';
import {
  buildCoachHubSnapshot,
  type CoachHubSnapshot,
} from '@/domain/coach/coachHub';
import { buildCoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { DailyCoachResult } from '@/domain/coach/dailyCoach';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import {
  emptyEndurancePlanningState,
  readEndurancePlanningState,
  type EndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import { resolveWeeklyReviewPeriod } from '@/domain/reviews/weeklyReview';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { DailyCoachingRepository } from '@/infrastructure/repositories/contracts/DailyCoachingRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import type { WeeklyReviewRepository } from '@/infrastructure/repositories/contracts/WeeklyReviewRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import type { CoachMemoryRepository } from '@/infrastructure/repositories/contracts/CoachMemoryRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface CoachHubServiceDependencies {
  targets: Pick<TargetRepository, 'getTargetByDate'>;
  dailyCoaching: Pick<DailyCoachingRepository, 'getCheckIn' | 'getCheckOut'>;
  weeklyReviews: Pick<WeeklyReviewRepository, 'listAll'>;
  coachMemory: Pick<CoachMemoryRepository, 'listAll'>;
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll'>;
  activities: Pick<ActivityRepository, 'listAll'>;
  readEndurancePlanningState: () => EndurancePlanningState;
  calculateDaily: (
    input: { date: LocalDate; profile: UserProfile; referenceWeightKg: number },
  ) => Promise<DailyCoachResult>;
  calculateIntegratedAnalysis: (
    input: CalculateIntegratedCoachDecisionInput,
  ) => Promise<IntegratedCoachAnalysis>;
  calculateImmediateSafety: (
    input: CalculateImmediateCoachSafetyInput,
  ) => ReturnType<typeof calculateImmediateCoachSafety>;
}

const defaultDependencies: CoachHubServiceDependencies = {
  targets: repositories.targets,
  dailyCoaching: repositories.dailyCoaching,
  weeklyReviews: repositories.weeklyReviews,
  coachMemory: repositories.coachMemory,
  workoutSessions: repositories.workoutSessions,
  activities: repositories.activities,
  readEndurancePlanningState,
  calculateDaily: calculateDailyCoach,
  calculateIntegratedAnalysis: calculateIntegratedCoachAnalysis,
  calculateImmediateSafety: calculateImmediateCoachSafety,
};

export async function loadCoachHub(
  referenceDate: LocalDate,
  profile: UserProfile,
  dependencies: CoachHubServiceDependencies = defaultDependencies,
): Promise<CoachHubSnapshot> {
  const coachPhase = resolveCurrentCoachPhase(profile);
  const [
    target,
    checkIn,
    reviews,
    memories,
    workoutSessions,
    activities,
    enduranceState,
  ] = await Promise.all([
      dependencies.targets.getTargetByDate(referenceDate),
      dependencies.dailyCoaching.getCheckIn(referenceDate),
      dependencies.weeklyReviews.listAll(),
      dependencies.coachMemory.listAll(),
      dependencies.workoutSessions.listAll(),
      dependencies.activities.listAll(),
      Promise.resolve()
        .then(() => dependencies.readEndurancePlanningState())
        .catch(() => emptyEndurancePlanningState()),
    ]);

  const referenceWeightKg = resolveCoachReferenceWeight(
    target ? [target] : [],
    referenceDate,
    profile.initialWeightKg,
  );
  const dailyCoachResult = checkIn
    ? await dependencies.calculateDaily({
        date: referenceDate,
        profile,
        referenceWeightKg,
      }).catch(() => undefined)
    : undefined;
  const period = resolveWeeklyReviewPeriod(referenceDate);
  const integratedAnalysis = await dependencies.calculateIntegratedAnalysis({
    referenceDate,
    profile,
    referenceWeightKg,
  }).catch(() => undefined);
  let safetyAssessment = integratedAnalysis?.safetyAssessment;
  if (!safetyAssessment) {
    const checkOut = await dependencies.dailyCoaching
      .getCheckOut(referenceDate)
      .catch(() => undefined);
    const immediateSafetyAssessment = dependencies.calculateImmediateSafety({
      referenceDate,
      profile,
      checkIns: checkIn ? [checkIn] : [],
      checkOuts: checkOut ? [checkOut] : [],
    });
    if (immediateSafetyAssessment.status !== 'clear') {
      safetyAssessment = immediateSafetyAssessment;
    }
  }
  const coachReview = integratedAnalysis
    ? buildCoachReviewSnapshot({
        weekStart: period.weekStart,
        weekEnd: period.weekEnd,
      }, integratedAnalysis)
    : undefined;

  const strengthSources = workoutSessions.map((session) => ({
    id: session.id,
    title: getWorkoutSessionTitle(session),
    date: planningDateForSession(session),
    status: session.status,
  }));
  const latestPlannedDate = [
    ...strengthSources.map(({ date }) => date),
    ...enduranceState.sessions.map(({ date }) => date),
  ].sort().at(-1);
  const horizonDays = latestPlannedDate && latestPlannedDate > referenceDate
    ? Math.ceil(
        (Date.parse(`${latestPlannedDate}T00:00:00Z`)
          - Date.parse(`${referenceDate}T00:00:00Z`)) / 86_400_000,
      )
    : 0;
  const plannedSessions = buildTrainingAgenda(
    strengthSources,
    enduranceState.sessions,
    activities,
    referenceDate,
    horizonDays,
  ).entries.filter((entry): entry is TrainingAgendaEntry & {
    status: Exclude<TrainingAgendaEntry['status'], 'overdue'>;
  } => entry.status !== 'overdue');

  return buildCoachHubSnapshot({
    referenceDate,
    profile,
    hasCheckIn: checkIn !== undefined,
    ...(coachPhase ? { coachPhase } : {}),
    ...(dailyCoachResult ? { dailyCoachResult } : {}),
    ...(target ? { target } : {}),
    plannedSessions,
    ...(coachReview ? { coachReview } : {}),
    ...(safetyAssessment ? { safetyAssessment } : {}),
    reviews,
    memories,
  });
}
