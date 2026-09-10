import { describe, expect, it, vi } from 'vitest';
import {
  projectCoachStrategySnapshot,
  type CoachStrategyProjectionInput,
} from '@/application/coach/coachStrategyProjectionService';
import { buildCoachExplanation } from '@/domain/coach/coachExplanation';
import { buildCoachDecisionMemory } from '@/domain/coach/coachMemory';
import { resolveCoachPhase } from '@/domain/coach/coachPhase';
import { buildCoachReviewSnapshot, canAcceptCoachWeeklyReview } from '@/domain/coach/coachReview';
import { resolveCoachSafety } from '@/domain/coach/coachSafety';
import type { CoachState, CoachStateResult } from '@/domain/coach/coachState';
import type { StrategyReadonly } from '@/domain/coach/coachStrategy';
import { resolveIntegratedCoachDecision } from '@/domain/coach/integratedCoachDecision';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';
import { createCalorieAdaptationAssessment, createWeeklyReview } from '@/test/factories/weeklyReviewFactory';

function review(state: CoachState = 'truePlateau') {
  const calorieAssessment = createCalorieAdaptationAssessment();
  const safetyAssessment = createCoachSafetyAssessment();
  const coachStateResult: CoachStateResult = {
    state, confidence: calorieAssessment.confidence, reasons: ['Tendance qualifiée.'],
    blockingFactors: [], priority: 'low', recommendedAction: { type: 'collectMoreData' },
    nextReview: { type: 'date', date: '2026-09-18' },
  };
  const strengthPerformance = { referenceDate: '2026-09-11', exercises: [],
    schedule: { completedPlannedCount: 0, skippedCount: 0, overdueCount: 0, abandonedCount: 0 } };
  const decision = resolveIntegratedCoachDecision({ referenceDate: '2026-09-11',
    coachStateResult, strengthPerformance, calorieAssessment, safetyAssessment });
  return buildCoachReviewSnapshot({ weekStart: '2026-09-07', weekEnd: '2026-09-13' }, {
    coachStateResult, strengthPerformance, calorieAssessment, safetyAssessment, decision,
  });
}

function input() {
  const currentReview = review();
  const data = buildCoachDecisionMemory({ weeklyReviewId: 'prior-review',
    phase: resolveCoachPhase('loss')!, snapshot: currentReview, status: 'accepted',
    decidedAt: '2026-09-01T12:00:00Z', effectiveFrom: '2026-09-02' });
  return {
    referenceDate: '2026-09-11', profile: { id: 'profile-a', goal: 'loss' as const },
    currentReview,
    memories: [{ ...data, id: 'memory-1', createdAt: data.decidedAt, updatedAt: data.decidedAt,
      period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' } }],
    plans: {
      nutritionPlan: { status: 'available' as const, targetCaloriesKcal: 2300,
        macros: { proteinGrams: 150, fatGrams: 70, carbohydratesGrams: 267 } },
      activityPlan: { dailyStepGoal: 8000, plannedActivities: [] },
      trainingPlan: { plannedSessions: [{ id: 'session-1', source: 'strength' as const,
        title: 'Séance prévue', date: '2026-09-12', status: 'upcoming' as const }] },
    },
  } satisfies CoachStrategyProjectionInput;
}

function freezeDeep<T>(value: T): StrategyReadonly<T> {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value as StrategyReadonly<T>;
}

describe('projectCoachStrategySnapshot', () => {
  it('copie le même contexte C4/C5, le plan courant et la mémoire, sans activation', () => {
    const source = input();
    const result = projectCoachStrategySnapshot(freezeDeep(source));
    expect(result.currentReview).toStrictEqual({ status: 'available', origin: 'c4c5', value: {
      referenceDate: source.currentReview.referenceDate, period: source.currentReview.period,
      decision: source.currentReview.decision, reasons: source.currentReview.reasons,
      primaryReasons: source.currentReview.primaryReasons, blockingFactors: source.currentReview.blockingFactors,
      confidence: source.currentReview.confidence, plan: source.currentReview.plan,
      nextReview: source.currentReview.nextReview,
    } });
    expect(result.plans).toStrictEqual(source.plans);
    expect(result.memories).toStrictEqual(source.memories);
    expect(result.strategy.status).toBe('legacyProjected');
    expect(result.phase.status).toBe('unavailable');
    expect(result.memories[0]).not.toHaveProperty('observedOutcome');
    expect(result.explanation).toStrictEqual(buildCoachExplanation({
      currentReview: source.currentReview, memories: source.memories,
    }));
    expect(source.currentReview.decision.proposedNutritionAdjustmentKcal).toBe(-100);
    const pending = createWeeklyReview({ proposedAdjustmentKcal: -100 });
    expect(canAcceptCoachWeeklyReview(source.currentReview, pending)).toBe(true);
    expect(canAcceptCoachWeeklyReview(source.currentReview, { ...pending, decisionStatus: 'accepted' })).toBe(false);
  });

  it.each(['insufficientData', 'possibleRecomposition', 'activityBelowExpected', 'degradedRecovery'] as const)(
    'préserve le résultat C4/C5/C10.1 pour %s sans décider de stratégie', (state) => {
      const currentReview = review(state);
      const result = projectCoachStrategySnapshot({ referenceDate: '2026-09-11', currentReview, memories: [] });
      expect(result.currentReview.status === 'available' && result.currentReview.value.decision)
        .toStrictEqual(currentReview.decision);
      expect(result.explanation).toStrictEqual(buildCoachExplanation({ currentReview, memories: [] }));
      expect(result.objective.status).toBe('unavailable');
      expect(result.strategy.status).toBe('unavailable');
      expect(result.phase.status).toBe('unavailable');
    },
  );

  it('ne réutilise pas une mémoire acceptée pour inventer une décision ou une phase', () => {
    const result = projectCoachStrategySnapshot({ referenceDate: '2026-09-11', memories: input().memories });
    expect(result.currentReview).toEqual({ status: 'unavailable' });
    expect(result.safety).toEqual({ status: 'unavailable', scope: 'c8CalorieDecreaseOnly' });
    expect(result.plans).toBeUndefined();
    expect(result.phase.status).toBe('unavailable');
    expect(result.explanation.availability).toBe('unavailable');
    expect(result.explanation.comparison.status).toBe('unavailable');
  });

  it.each(['clear', 'caution', 'doNotIntensify'] as const)(
    'conserve Safety %s et son origine sans en étendre le périmètre', (status) => {
      const assessment = createCoachSafetyAssessment({ status });
      for (const origin of ['integratedC8', 'immediateC8'] as const) {
        const result = projectCoachStrategySnapshot({ ...input(), currentSafety: { origin, assessment } });
        expect(result.safety).toStrictEqual({ status: 'available', origin,
          scope: 'c8CalorieDecreaseOnly', assessment });
      }
    },
  );

  it('distingue la Safety immédiate de la décision source sans altérer les gardes C5', () => {
    const source = input();
    const assessment = resolveCoachSafety({ referenceDate: '2026-09-12', contextFlags: ['painOrInjury'] });
    const result = projectCoachStrategySnapshot({ ...source,
      currentSafety: { origin: 'immediateC8', assessment } });
    expect(result.currentReview.status === 'available' && result.currentReview.value.decision)
      .toStrictEqual(source.currentReview.decision);
    expect(result.safety).toMatchObject({ origin: 'immediateC8', assessment: { status: 'doNotIntensify' } });
    expect(result.explanation).toStrictEqual(buildCoachExplanation({
      currentReview: source.currentReview, safetyAssessment: assessment, memories: source.memories,
    }));
    expect(canAcceptCoachWeeklyReview({ ...source.currentReview, safetyAssessment: assessment },
      createWeeklyReview({ proposedAdjustmentKcal: -100 }))).toBe(false);
  });

  it('identifie la Safety de C5, sans actualiser sa date', () => {
    const source = input();
    expect(projectCoachStrategySnapshot(source).safety).toStrictEqual({ status: 'available',
      scope: 'c8CalorieDecreaseOnly', origin: 'c5Snapshot', assessment: source.currentReview.safetyAssessment });
  });

  it('est déterministe, sans horloge ni mutation, et détache tous les objets imbriqués', () => {
    const source = input();
    const before = structuredClone(source);
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Clock forbidden'); });
    try {
      const first = projectCoachStrategySnapshot(freezeDeep(source));
      const second = projectCoachStrategySnapshot(source);
      expect(first).toStrictEqual(second);
      expect(source).toStrictEqual(before);
      expect(first.memories[0]?.phase).not.toBe(source.memories[0]?.phase);
      expect(first.plans?.nutritionPlan).not.toBe(source.plans.nutritionPlan);
      expect(first.explanation.reasons).not.toBe(second.explanation.reasons);
      if (first.currentReview.status === 'available') {
        expect(first.currentReview.value.decision.safetyAssessment.concerns)
          .not.toBe(source.currentReview.decision.safetyAssessment.concerns);
        expect(first.currentReview.value.confidence).not.toBe(source.currentReview.confidence);
      }
      expect(now).not.toHaveBeenCalled();
    } finally { now.mockRestore(); }
  });

  it('ne partage pas les valeurs sources ni celles de deux espaces successifs', () => {
    const source = input();
    const first = projectCoachStrategySnapshot(source);
    source.plans.nutritionPlan.macros.proteinGrams = 999;
    source.currentReview.reasons.push('modification externe');
    source.memories[0]!.phase.label = 'modification externe';
    expect(first.plans?.nutritionPlan).toMatchObject({ macros: { proteinGrams: 150 } });
    expect(first.currentReview.status === 'available' && first.currentReview.value.reasons)
      .not.toContain('modification externe');
    expect(first.memories[0]?.phase.label).toBe('Déficit actif');
    const second = projectCoachStrategySnapshot({ referenceDate: source.referenceDate,
      profile: { id: 'profile-b', goal: 'gain' }, memories: [] });
    expect(second.objective).toMatchObject({ profileId: 'profile-b', objective: 'gain' });
    expect(second.memories).toEqual([]);
    expect(second.plans).toBeUndefined();
    expect(second.explanation.availability).toBe('unavailable');
  });
});
