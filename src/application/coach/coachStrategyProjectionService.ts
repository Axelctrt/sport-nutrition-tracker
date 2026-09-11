import { buildCoachExplanation } from '@/domain/coach/coachExplanation';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { CoachSafetyAssessment } from '@/domain/coach/coachSafety';
import {
  COACH_STRATEGY_CONTRACT_VERSION,
  type CoachStrategyPlans,
  type StrategyDecisionSnapshot,
  type StrategyReadonly,
  type StrategySafetyContext,
} from '@/domain/coach/coachStrategy';
import { projectLegacyCoachStrategy } from '@/domain/coach/coachStrategyCompatibility';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export interface CoachStrategyProjectionInput {
  readonly referenceDate: LocalDate;
  readonly profile?: Readonly<Pick<UserProfile, 'id' | 'goal'>>;
  readonly currentReview?: StrategyReadonly<CoachReviewSnapshot>;
  readonly currentSafety?: {
    readonly origin: 'integratedC8' | 'immediateC8';
    readonly assessment: StrategyReadonly<CoachSafetyAssessment>;
  };
  readonly plans?: CoachStrategyPlans;
  readonly memories: readonly StrategyReadonly<CoachDecisionMemoryRecord>[];
}

/** All contracts here contain plain structured data. Clone before calling legacy APIs. */
function detached<T>(value: StrategyReadonly<T>): T {
  return structuredClone(value) as T;
}

/** No I/O, clock, identifiers, rule evaluation or acceptance. Not wired to the Hub UI. */
export function projectCoachStrategySnapshot(
  input: CoachStrategyProjectionInput,
): StrategyDecisionSnapshot {
  const review = input.currentReview
    ? detached<CoachReviewSnapshot>(input.currentReview)
    : undefined;
  const memories = input.memories.map((memory) => detached<CoachDecisionMemoryRecord>(memory));
  const assessment = input.currentSafety
    ? detached<CoachSafetyAssessment>(input.currentSafety.assessment)
    : review?.safetyAssessment;
  const safety: StrategySafetyContext = assessment
    ? {
        status: 'available',
        scope: 'c8CalorieDecreaseOnly',
        origin: input.currentSafety?.origin ?? 'c5Snapshot',
        assessment,
      }
    : { status: 'unavailable', scope: 'c8CalorieDecreaseOnly' };

  return {
    contractVersion: COACH_STRATEGY_CONTRACT_VERSION,
    referenceDate: input.referenceDate,
    ...projectLegacyCoachStrategy(input.profile),
    currentReview: review
      ? {
          status: 'available',
          origin: 'c4c5',
          value: {
            referenceDate: review.referenceDate,
            period: review.period,
            decision: review.decision,
            reasons: review.reasons,
            primaryReasons: review.primaryReasons,
            blockingFactors: review.blockingFactors,
            confidence: review.confidence,
            plan: review.plan,
            nextReview: review.nextReview,
          },
        }
      : { status: 'unavailable' },
    safety,
    plans: input.plans ? structuredClone({
      nutritionPlan: input.plans.nutritionPlan,
      activityPlan: input.plans.activityPlan,
      trainingPlan: input.plans.trainingPlan,
    }) : undefined,
    memories,
    explanation: buildCoachExplanation({
      ...(review ? { currentReview: review } : {}),
      ...(assessment ? { safetyAssessment: assessment } : {}),
      memories,
    }),
  };
}
