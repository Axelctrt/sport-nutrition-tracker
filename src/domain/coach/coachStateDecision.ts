import { addDays, parseISO } from 'date-fns';
import type {
  CoachNextReview,
  CoachPriority,
  CoachRecommendedAction,
  CoachState,
  CoachStateAnalysis,
  CoachStateResult,
} from '@/domain/coach/coachState';
import type { LocalDate } from '@/domain/models/common';
import { toLocalDate } from '@/shared/utils/dates';

export const COACH_DEFAULT_REVIEW_INTERVAL_DAYS = 7;

export interface ResolveCoachStateResultInput {
  analysis: CoachStateAnalysis;
  referenceDate: LocalDate;
}

interface CoachStateDecision {
  priority: CoachPriority;
  recommendedAction: CoachRecommendedAction;
  nextReview: CoachNextReview;
}

function reviewInSevenDays(referenceDate: LocalDate): CoachNextReview {
  return {
    type: 'date',
    date: toLocalDate(addDays(
      parseISO(referenceDate),
      COACH_DEFAULT_REVIEW_INTERVAL_DAYS,
    )),
  };
}

function resolveDecision(
  state: CoachState,
  referenceDate: LocalDate,
): CoachStateDecision {
  switch (state) {
    case 'insufficientData':
      return {
        priority: 'low',
        recommendedAction: { type: 'collectMoreData' },
        nextReview: { type: 'condition', condition: 'moreData' },
      };
    case 'insufficientFoodTracking':
      return {
        priority: 'medium',
        recommendedAction: { type: 'improveFoodTracking' },
        nextReview: { type: 'condition', condition: 'foodTrackingImproved' },
      };
    case 'onTrack':
    case 'possibleRecomposition':
      return {
        priority: 'low',
        recommendedAction: { type: 'maintainPlan' },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'temporaryWaterVariation':
      return {
        priority: 'low',
        recommendedAction: { type: 'monitorTrend' },
        nextReview: {
          type: 'condition',
          condition: 'temporaryContextResolved',
        },
      };
    case 'conflictingSignals':
      return {
        priority: 'medium',
        recommendedAction: { type: 'monitorTrend' },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'truePlateau':
      return {
        priority: 'medium',
        recommendedAction: {
          type: 'reviewNutritionTarget',
          direction: 'reassess',
        },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'targetTooHigh':
      return {
        priority: 'medium',
        recommendedAction: {
          type: 'reviewNutritionTarget',
          direction: 'decrease',
        },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'targetTooLow':
      return {
        priority: 'medium',
        recommendedAction: {
          type: 'reviewNutritionTarget',
          direction: 'increase',
        },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'excessiveLoss':
      return {
        priority: 'high',
        recommendedAction: {
          type: 'reviewNutritionTarget',
          direction: 'increase',
        },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'excessiveGain':
      return {
        priority: 'high',
        recommendedAction: {
          type: 'reviewNutritionTarget',
          direction: 'decrease',
        },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'activityBelowExpected':
      return {
        priority: 'medium',
        recommendedAction: { type: 'reviewActivity' },
        nextReview: reviewInSevenDays(referenceDate),
      };
    case 'degradedRecovery':
      return {
        priority: 'high',
        recommendedAction: { type: 'prioritizeRecovery' },
        nextReview: {
          type: 'condition',
          condition: 'recoveryReassessed',
        },
      };
  }
}

export function resolveCoachStateResult({
  analysis,
  referenceDate,
}: ResolveCoachStateResultInput): CoachStateResult {
  return {
    ...analysis,
    ...resolveDecision(analysis.state, referenceDate),
  };
}
