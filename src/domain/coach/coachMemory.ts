import type { CoachPhase } from '@/domain/coach/coachPhase';
import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { CoachSafetyStatus } from '@/domain/coach/coachSafety';
import type {
  CoachNextReview,
  CoachState,
  CoachStateConfidence,
} from '@/domain/coach/coachState';
import type { IntegratedCoachAction } from '@/domain/coach/integratedCoachDecision';
import type {
  EntityId,
  EntityMetadata,
  IsoDateTime,
  LocalDate,
  NewEntity,
} from '@/domain/models/common';
import type { WeightGoal } from '@/domain/models/profile';

export const COACH_DECISION_MEMORY_STATUSES = [
  'maintained',
  'accepted',
  'rejected',
  'blocked',
] as const;

export type CoachDecisionMemoryStatus =
  (typeof COACH_DECISION_MEMORY_STATUSES)[number];

export const COACH_OBSERVED_OUTCOMES = [
  'progressOnTrack',
  'trendImproved',
  'trendUnchanged',
  'insufficientData',
] as const;

export type CoachObservedOutcomeType =
  (typeof COACH_OBSERVED_OUTCOMES)[number];

export interface CoachObservedOutcome {
  type: CoachObservedOutcomeType;
  evaluatedAt: IsoDateTime;
  reviewId: EntityId;
  summary: string;
}

export interface CoachDecisionMemoryRecord extends EntityMetadata {
  weeklyReviewId: EntityId;
  period: {
    weekStart: LocalDate;
    weekEnd: LocalDate;
  };
  decisionDate: LocalDate;
  phase: {
    id: CoachPhase['id'];
    label: string;
    objective: WeightGoal;
  };
  coachState: CoachState;
  confidence: CoachStateConfidence;
  primaryAction: IntegratedCoachAction;
  reasons: string[];
  blockingFactors: string[];
  safety: {
    status: CoachSafetyStatus;
    reasons: string[];
  };
  proposedChange?: {
    type: 'nutritionCalories';
    adjustmentKcalPerDay: number;
  };
  status: CoachDecisionMemoryStatus;
  decidedAt: IsoDateTime;
  effectiveFrom?: LocalDate;
  nextReview: CoachNextReview;
  observedOutcome?: CoachObservedOutcome;
}

export interface BuildCoachDecisionMemoryInput {
  weeklyReviewId: EntityId;
  phase: CoachPhase;
  snapshot: CoachReviewSnapshot;
  status: CoachDecisionMemoryStatus;
  decidedAt: IsoDateTime;
  effectiveFrom?: LocalDate;
}

export function coachDecisionMemoryIdForReview(
  weeklyReviewId: EntityId,
): EntityId {
  return `coach-decision:${weeklyReviewId}`;
}

export function buildCoachDecisionMemory(
  input: BuildCoachDecisionMemoryInput,
): NewEntity<CoachDecisionMemoryRecord> {
  const proposedAdjustment =
    input.snapshot.decision.proposedNutritionAdjustmentKcal;

  return {
    weeklyReviewId: input.weeklyReviewId,
    period: { ...input.snapshot.period },
    decisionDate: input.snapshot.referenceDate,
    phase: {
      id: input.phase.id,
      label: input.phase.label,
      objective: input.phase.objective,
    },
    coachState: input.snapshot.diagnostic.state,
    confidence: { ...input.snapshot.confidence },
    primaryAction: input.snapshot.decision.primaryAction,
    reasons: [...input.snapshot.primaryReasons],
    blockingFactors: [...input.snapshot.blockingFactors],
    safety: {
      status: input.snapshot.safetyAssessment.status,
      reasons: [...input.snapshot.safetyAssessment.reasons],
    },
    ...(proposedAdjustment === undefined || proposedAdjustment === 0
      ? {}
      : {
          proposedChange: {
            type: 'nutritionCalories' as const,
            adjustmentKcalPerDay: proposedAdjustment,
          },
        }),
    status: input.status,
    decidedAt: input.decidedAt,
    ...(input.effectiveFrom ? { effectiveFrom: input.effectiveFrom } : {}),
    nextReview: { ...input.snapshot.nextReview },
  };
}
