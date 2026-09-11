import type { CoachExplanation } from '@/domain/coach/coachExplanation';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import type { CoachPhase } from '@/domain/coach/coachPhase';
import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { CoachSafetyAssessment } from '@/domain/coach/coachSafety';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { WeightGoal } from '@/domain/models/profile';

/** Contract version only: never an acceptance, data revision or causal clock. */
export const COACH_STRATEGY_CONTRACT_VERSION = 1;

export const COACH_STRATEGY_KINDS = [
  'activeDeficit', 'stabilization', 'activeConstruction',
] as const;
export type CoachStrategyKind = (typeof COACH_STRATEGY_KINDS)[number];

export type StrategyReadonly<T> = T extends object
  ? { readonly [K in keyof T]: StrategyReadonly<T[K]> }
  : T;

type VersionedContext = { readonly contractVersion: 1 };

export type ObjectiveContext = VersionedContext & (
  | {
      readonly status: 'available';
      readonly objective: WeightGoal;
      readonly origin: 'userProfile';
      readonly profileId: EntityId;
      readonly sourceVersion?: string;
    }
  | {
      readonly status: 'unavailable';
      readonly origin: 'missing' | 'invalid';
    }
);

export type LegacyStrategyContext = VersionedContext & (
  | {
      readonly status: 'legacyProjected';
      readonly strategy: CoachStrategyKind;
      readonly origin: 'c7ObjectiveProjection';
    }
  | { readonly status: 'unavailable'; readonly origin: 'missingObjective' }
);

/** Explicit forms are descriptive contracts, not commands or legacy inferences. */
export type StrategyContext = LegacyStrategyContext | (VersionedContext & {
  readonly strategy: CoachStrategyKind;
  readonly strategyRef: EntityId;
  readonly origin: 'explicit';
  readonly sourceVersion?: string;
} & (
  | { readonly status: 'proposed'; readonly proposalRef: EntityId }
  | { readonly status: 'active'; readonly acceptanceRef: EntityId }
));

export type UnavailablePhaseContext = VersionedContext & {
  readonly status: 'unavailable';
  readonly origin: 'noExplicitEpisode';
};

export type PhaseContext = UnavailablePhaseContext | (VersionedContext & {
  readonly status: 'available';
  readonly origin: 'explicit';
  readonly phaseId: EntityId;
  readonly parentStrategyRef: EntityId;
  readonly acceptanceRef: EntityId;
  readonly state: 'active';
  readonly temporal: {
    readonly startedOn?: LocalDate;
    readonly nextReview?: StrategyReadonly<CoachReviewSnapshot['nextReview']>;
  };
});

export interface CoachStrategyLegacyContext {
  readonly objective: ObjectiveContext;
  readonly strategy: LegacyStrategyContext;
  readonly phase: UnavailablePhaseContext;
  readonly legacyPhase: StrategyReadonly<CoachPhase> | undefined;
}

export type CoachStrategyPlans = StrategyReadonly<Pick<
  CoachHubSnapshot, 'nutritionPlan' | 'activityPlan' | 'trainingPlan'
>>;

export type StrategySafetyContext = {
  readonly scope: 'c8CalorieDecreaseOnly';
} & (
  | { readonly status: 'unavailable' }
  | {
      readonly status: 'available';
      readonly origin: 'integratedC8' | 'immediateC8' | 'c5Snapshot';
      readonly assessment: StrategyReadonly<CoachSafetyAssessment>;
    }
);

export type StrategyReviewContext =
  | { readonly status: 'unavailable' }
  | {
      readonly status: 'available';
      readonly origin: 'c4c5';
      readonly value: StrategyReadonly<Pick<CoachReviewSnapshot,
        'referenceDate' | 'period' | 'decision' | 'reasons' | 'primaryReasons'
        | 'blockingFactors' | 'confidence' | 'plan' | 'nextReview'
      >>;
    };

export interface StrategyDecisionSnapshot {
  readonly contractVersion: 1;
  readonly referenceDate: LocalDate;
  readonly objective: ObjectiveContext;
  readonly strategy: StrategyContext;
  readonly phase: PhaseContext;
  readonly legacyPhase: StrategyReadonly<CoachPhase> | undefined;
  readonly currentReview: StrategyReviewContext;
  readonly safety: StrategySafetyContext;
  readonly plans: CoachStrategyPlans | undefined;
  readonly memories: readonly StrategyReadonly<CoachDecisionMemoryRecord>[];
  readonly explanation: StrategyReadonly<CoachExplanation>;
}
