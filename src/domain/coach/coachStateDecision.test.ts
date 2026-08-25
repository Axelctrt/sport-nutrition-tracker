import { describe, expect, it, vi } from 'vitest';
import { resolveCoachStateResult } from '@/domain/coach/coachStateDecision';
import type {
  CoachNextReview,
  CoachPriority,
  CoachRecommendedAction,
  CoachState,
  CoachStateAnalysis,
} from '@/domain/coach/coachState';

const REFERENCE_DATE = '2026-08-25';
const WEEK_LATER = { type: 'date', date: '2026-09-01' } as const;

const baseAnalysis: CoachStateAnalysis = {
  state: 'onTrack',
  confidence: {
    weight: 100,
    food: 100,
    activity: 100,
    recovery: 100,
    overall: 100,
    level: 'reliable',
  },
  reasons: ['Tendance cohérente.'],
  blockingFactors: [],
};

interface MappingExpectation {
  state: CoachState;
  priority: CoachPriority;
  recommendedAction: CoachRecommendedAction;
  nextReview: CoachNextReview;
}

describe('resolveCoachStateResult', () => {
  it.each([
    {
      state: 'insufficientData',
      priority: 'low',
      recommendedAction: { type: 'collectMoreData' },
      nextReview: { type: 'condition', condition: 'moreData' },
    },
    {
      state: 'insufficientFoodTracking',
      priority: 'medium',
      recommendedAction: { type: 'improveFoodTracking' },
      nextReview: { type: 'condition', condition: 'foodTrackingImproved' },
    },
    {
      state: 'onTrack',
      priority: 'low',
      recommendedAction: { type: 'maintainPlan' },
      nextReview: WEEK_LATER,
    },
    {
      state: 'temporaryWaterVariation',
      priority: 'low',
      recommendedAction: { type: 'monitorTrend' },
      nextReview: {
        type: 'condition',
        condition: 'temporaryContextResolved',
      },
    },
    {
      state: 'possibleRecomposition',
      priority: 'low',
      recommendedAction: { type: 'maintainPlan' },
      nextReview: WEEK_LATER,
    },
    {
      state: 'conflictingSignals',
      priority: 'medium',
      recommendedAction: { type: 'monitorTrend' },
      nextReview: WEEK_LATER,
    },
    {
      state: 'truePlateau',
      priority: 'medium',
      recommendedAction: {
        type: 'reviewNutritionTarget',
        direction: 'reassess',
      },
      nextReview: WEEK_LATER,
    },
    {
      state: 'targetTooHigh',
      priority: 'medium',
      recommendedAction: {
        type: 'reviewNutritionTarget',
        direction: 'decrease',
      },
      nextReview: WEEK_LATER,
    },
    {
      state: 'targetTooLow',
      priority: 'medium',
      recommendedAction: {
        type: 'reviewNutritionTarget',
        direction: 'increase',
      },
      nextReview: WEEK_LATER,
    },
    {
      state: 'excessiveLoss',
      priority: 'high',
      recommendedAction: {
        type: 'reviewNutritionTarget',
        direction: 'increase',
      },
      nextReview: WEEK_LATER,
    },
    {
      state: 'excessiveGain',
      priority: 'high',
      recommendedAction: {
        type: 'reviewNutritionTarget',
        direction: 'decrease',
      },
      nextReview: WEEK_LATER,
    },
    {
      state: 'activityBelowExpected',
      priority: 'medium',
      recommendedAction: { type: 'reviewActivity' },
      nextReview: WEEK_LATER,
    },
    {
      state: 'degradedRecovery',
      priority: 'high',
      recommendedAction: { type: 'prioritizeRecovery' },
      nextReview: { type: 'condition', condition: 'recoveryReassessed' },
    },
  ] satisfies MappingExpectation[])('$state produit la décision validée', ({
    state,
    priority,
    recommendedAction,
    nextReview,
  }) => {
    expect(resolveCoachStateResult({
      analysis: { ...baseAnalysis, state },
      referenceDate: REFERENCE_DATE,
    })).toMatchObject({ state, priority, recommendedAction, nextReview });
  });

  it('préserve maintainPlan comme décision sans mutation ni ajustement', () => {
    const analysis = Object.freeze({
      ...baseAnalysis,
      reasons: Object.freeze([...baseAnalysis.reasons]),
      blockingFactors: Object.freeze([...baseAnalysis.blockingFactors]),
    }) as CoachStateAnalysis;
    const result = resolveCoachStateResult({ analysis, referenceDate: REFERENCE_DATE });

    expect(result.recommendedAction).toEqual({ type: 'maintainPlan' });
    expect(result).not.toHaveProperty('proposedAdjustmentKcal');
    expect(result).not.toHaveProperty('acceptedCalibrationAdjustmentKcal');
    expect(result.reasons).toEqual(['Tendance cohérente.']);
  });

  it('est déterministe et indépendant de l’horloge système', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2000-01-01T00:00:00.000Z'));
      const first = resolveCoachStateResult({
        analysis: baseAnalysis,
        referenceDate: REFERENCE_DATE,
      });
      vi.setSystemTime(new Date('2040-12-31T23:59:59.000Z'));
      const second = resolveCoachStateResult({
        analysis: baseAnalysis,
        referenceDate: REFERENCE_DATE,
      });

      expect(second).toEqual(first);
      expect(second.nextReview).toEqual(WEEK_LATER);
    } finally {
      vi.useRealTimers();
    }
  });
});
