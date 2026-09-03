import { describe, expect, it } from 'vitest';
import {
  buildCoachDecisionMemory,
  coachDecisionMemoryIdForReview,
} from '@/domain/coach/coachMemory';
import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';

function snapshot(adjustment?: number): CoachReviewSnapshot {
  return {
    referenceDate: '2026-08-30',
    period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' },
    diagnostic: { state: 'truePlateau', label: 'Plateau probable' },
    confidence: { weight: 80, food: 70, activity: 90, recovery: 60, overall: 75, level: 'usable' },
    reasons: ['La tendance est stable.'],
    primaryReasons: ['La tendance est stable.'],
    blockingFactors: [],
    signals: {
      body: { weighInCount: 4 },
      nutrition: { completedFoodDays: 6, comparableFoodDays: 5 },
      activity: { recordedStepDays: 7 },
      recovery: { signalDays: 2, concernDays: 0 },
      strength: { context: 'stable', exploitableExerciseCount: 3, schedule: { completedPlannedCount: 3, skippedCount: 0, overdueCount: 0, abandonedCount: 0 } },
    },
    decision: {
      referenceDate: '2026-08-30', primaryAction: adjustment ? 'reviewNutritionTarget' : 'maintainPlan',
      priority: 'medium', coachState: 'truePlateau', strengthContext: 'stable',
      safetyAssessment: { referenceDate: '2026-08-30', status: 'clear', reasons: [], concerns: [], blockingFactors: [] },
      reasons: [], blockingFactors: [], ...(adjustment ? { proposedNutritionAdjustmentKcal: adjustment } : {}),
      requiresUserAcceptance: adjustment !== undefined,
      nextReview: { type: 'date', date: '2026-09-06' },
    },
    safetyAssessment: { referenceDate: '2026-08-30', status: 'clear', reasons: [], concerns: [], blockingFactors: [] },
    plan: { action: adjustment ? 'reviewNutritionTarget' : 'maintainPlan', label: 'Maintenir le plan', ...(adjustment ? { proposedNutritionAdjustmentKcal: adjustment } : {}), requiresUserAcceptance: adjustment !== undefined },
    nextReview: { type: 'date', date: '2026-09-06' },
    calorieAssessment: {} as CoachReviewSnapshot['calorieAssessment'],
  };
}

describe('Coach Memory', () => {
  it('conserve le contexte explicable et laisse le résultat observé absent', () => {
    const memory = buildCoachDecisionMemory({
      weeklyReviewId: 'review-1',
      phase: { id: 'deficit', label: 'Déficit actif', description: 'Perte', objective: 'loss' },
      snapshot: snapshot(100),
      status: 'accepted',
      decidedAt: '2026-08-30T12:00:00.000Z',
      effectiveFrom: '2026-08-31',
    });
    expect(coachDecisionMemoryIdForReview('review-1')).toBe('coach-decision:review-1');
    expect(memory).toMatchObject({
      weeklyReviewId: 'review-1',
      period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' },
      decisionDate: '2026-08-30',
      phase: { id: 'deficit', label: 'Déficit actif', objective: 'loss' },
      coachState: 'truePlateau',
      confidence: {
        weight: 80,
        food: 70,
        activity: 90,
        recovery: 60,
        overall: 75,
        level: 'usable',
      },
      primaryAction: 'reviewNutritionTarget',
      reasons: ['La tendance est stable.'], status: 'accepted',
      blockingFactors: [],
      safety: { status: 'clear', reasons: [] },
      proposedChange: { type: 'nutritionCalories', adjustmentKcalPerDay: 100 },
      effectiveFrom: '2026-08-31',
      nextReview: { type: 'date', date: '2026-09-06' },
      decidedAt: '2026-08-30T12:00:00.000Z',
    });
    expect(memory.observedOutcome).toBeUndefined();
  });

  it('ne fabrique aucun changement durable pour un maintien', () => {
    const memory = buildCoachDecisionMemory({
      weeklyReviewId: 'review-2',
      phase: { id: 'stabilization', label: 'Stabilisation', description: 'Maintien', objective: 'maintenance' },
      snapshot: snapshot(), status: 'maintained', decidedAt: '2026-08-30T12:00:00.000Z',
    });
    expect(memory.proposedChange).toBeUndefined();
    expect(memory.effectiveFrom).toBeUndefined();
  });
});
