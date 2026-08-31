import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { CoachSafetyAssessment } from '@/domain/coach/coachSafety';
import type { CoachPhase } from '@/domain/coach/coachPhase';
import type { CoachNextReview } from '@/domain/coach/coachState';
import type { DailyCoachResult } from '@/domain/coach/dailyCoach';
import type { LocalDate } from '@/domain/models/common';
import type { PlannedActivityCalorieSnapshot } from '@/domain/models/plannedActivity';
import type { UserProfile, WeightGoal } from '@/domain/models/profile';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeeklyReview, WeeklyReviewDecisionStatus } from '@/domain/models/weeklyReview';

export type CoachHubDailyVerdict =
  | { status: 'available'; result: DailyCoachResult }
  | { status: 'checkInRequired' }
  | { status: 'unavailable' };

export type CoachHubPhase =
  | { status: 'available'; phase: CoachPhase }
  | { status: 'unavailable' };

export type CoachHubNutritionPlan =
  | {
      status: 'available';
      targetCaloriesKcal: number;
      macros: DailyTarget['macros'];
    }
  | { status: 'unavailable' };

export interface CoachHubActivityPlan {
  dailyStepGoal: number;
  plannedActivities: PlannedActivityCalorieSnapshot[];
}

export interface CoachHubTrainingPlan {
  nextSession?: CoachHubTrainingSession;
  plannedSessions: CoachHubTrainingSession[];
}

export interface CoachHubTrainingSession {
  id: string;
  source: 'strength' | 'endurance';
  title: string;
  date: LocalDate;
  status: 'today' | 'upcoming' | 'inProgress';
  activityType?: string;
  targetDurationMinutes?: number;
}

export interface CoachHubPriority {
  action: CoachReviewSnapshot['plan']['action'];
  label: string;
  explanation?: string;
  blockingFactors: string[];
}

export interface CoachHubReviewSummary {
  id: string;
  weekStart: LocalDate;
  weekEnd: LocalDate;
  decisionStatus: WeeklyReviewDecisionStatus;
}

export interface CoachHubSnapshot {
  referenceDate: LocalDate;
  dailyVerdict: CoachHubDailyVerdict;
  orientation: WeightGoal;
  coachPhase: CoachHubPhase;
  nutritionPlan: CoachHubNutritionPlan;
  activityPlan: CoachHubActivityPlan;
  trainingPlan: CoachHubTrainingPlan;
  priority?: CoachHubPriority;
  monitoredPoints: string[];
  safetyAssessment?: CoachSafetyAssessment;
  lastReview?: CoachHubReviewSummary;
  nextReview?: CoachNextReview;
}

export interface BuildCoachHubSnapshotInput {
  referenceDate: LocalDate;
  profile: UserProfile;
  hasCheckIn: boolean;
  dailyCoachResult?: DailyCoachResult;
  coachPhase?: CoachPhase;
  target?: DailyTarget;
  plannedSessions: CoachHubTrainingSession[];
  coachReview?: CoachReviewSnapshot;
  safetyAssessment?: CoachSafetyAssessment;
  reviews: WeeklyReview[];
}

function resolveDailyVerdict(
  input: Pick<
    BuildCoachHubSnapshotInput,
    'hasCheckIn' | 'dailyCoachResult'
  >,
): CoachHubDailyVerdict {
  if (!input.hasCheckIn) return { status: 'checkInRequired' };
  if (input.dailyCoachResult) {
    return { status: 'available', result: input.dailyCoachResult };
  }
  return { status: 'unavailable' };
}

function latestReview(reviews: readonly WeeklyReview[]): WeeklyReview | undefined {
  return [...reviews].sort((left, right) => (
    left.weekEnd.localeCompare(right.weekEnd)
    || left.updatedAt.localeCompare(right.updatedAt)
  )).at(-1);
}

export function buildCoachHubSnapshot(
  input: BuildCoachHubSnapshotInput,
): CoachHubSnapshot {
  const lastReview = latestReview(input.reviews);
  const monitoredPoints = input.coachReview
    ? [...new Set(input.coachReview.primaryReasons.slice(1))]
    : [];

  return {
    referenceDate: input.referenceDate,
    dailyVerdict: resolveDailyVerdict(input),
    orientation: input.profile.goal,
    coachPhase: input.coachPhase
      ? { status: 'available', phase: { ...input.coachPhase } }
      : { status: 'unavailable' },
    nutritionPlan: input.target
      ? {
          status: 'available',
          targetCaloriesKcal: input.target.targetCaloriesKcal,
          macros: { ...input.target.macros },
        }
      : { status: 'unavailable' },
    activityPlan: {
      dailyStepGoal: input.profile.dailyStepGoal,
      plannedActivities: input.target?.plannedActivities?.map((activity) => ({
        ...activity,
      })) ?? [],
    },
    trainingPlan: {
      ...(input.plannedSessions[0]
        ? { nextSession: { ...input.plannedSessions[0] } }
        : {}),
      plannedSessions: input.plannedSessions.map((session) => ({ ...session })),
    },
    ...(input.coachReview
      ? {
          priority: {
            action: input.coachReview.plan.action,
            label: input.coachReview.plan.label,
            ...(input.coachReview.primaryReasons[0]
              ? { explanation: input.coachReview.primaryReasons[0] }
              : {}),
            blockingFactors: [...input.coachReview.blockingFactors],
          },
          nextReview: input.coachReview.nextReview,
        }
      : {}),
    monitoredPoints,
    ...(input.safetyAssessment
      ? { safetyAssessment: { ...input.safetyAssessment } }
      : {}),
    ...(lastReview
      ? {
          lastReview: {
            id: lastReview.id,
            weekStart: lastReview.weekStart,
            weekEnd: lastReview.weekEnd,
            decisionStatus: lastReview.decisionStatus,
          },
        }
      : {}),
  };
}
