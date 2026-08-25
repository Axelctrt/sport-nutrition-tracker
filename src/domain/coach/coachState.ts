import type { LocalDate } from '@/domain/models/common';

export const COACH_STATES = [
  'insufficientData',
  'insufficientFoodTracking',
  'onTrack',
  'temporaryWaterVariation',
  'possibleRecomposition',
  'conflictingSignals',
  'truePlateau',
  'targetTooHigh',
  'targetTooLow',
  'excessiveLoss',
  'excessiveGain',
  'activityBelowExpected',
  'degradedRecovery',
] as const;

export type CoachState = (typeof COACH_STATES)[number];

export type CoachStateConfidenceLevel =
  | 'insufficient'
  | 'uncertain'
  | 'usable'
  | 'reliable';

export interface CoachStateConfidence {
  weight: number;
  food: number;
  activity: number;
  recovery: number;
  overall: number;
  level: CoachStateConfidenceLevel;
}

export type CoachPriority = 'low' | 'medium' | 'high';

export type CoachRecommendedAction =
  | { type: 'collectMoreData' }
  | { type: 'improveFoodTracking' }
  | { type: 'maintainPlan' }
  | { type: 'monitorTrend' }
  | { type: 'reviewActivity' }
  | { type: 'prioritizeRecovery' }
  | {
      type: 'reviewNutritionTarget';
      direction: 'increase' | 'decrease' | 'reassess';
    };

export type CoachNextReview =
  | { type: 'date'; date: LocalDate }
  | {
      type: 'condition';
      condition:
        | 'moreData'
        | 'foodTrackingImproved'
        | 'temporaryContextResolved'
        | 'recoveryReassessed';
    };

export interface CoachStateResult {
  state: CoachState;
  confidence: CoachStateConfidence;
  reasons: string[];
  blockingFactors: string[];
  priority: CoachPriority;
  recommendedAction: CoachRecommendedAction;
  nextReview: CoachNextReview;
}

export type CoachStateAnalysis = Pick<
  CoachStateResult,
  'state' | 'confidence' | 'reasons' | 'blockingFactors'
>;
