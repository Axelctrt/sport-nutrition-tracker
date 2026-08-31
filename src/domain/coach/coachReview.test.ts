import { describe, expect, it } from 'vitest';
import {
  buildCoachReviewSnapshot,
  canAcceptCoachWeeklyReview,
  COACH_REVIEW_ACTION_LABELS,
} from '@/domain/coach/coachReview';
import {
  INTEGRATED_COACH_ACTIONS,
  type IntegratedCoachAction,
} from '@/domain/coach/integratedCoachDecision';
import type { CoachNextReview } from '@/domain/coach/coachState';
import type { StrengthPerformanceSnapshot } from '@/domain/coach/strengthPerformance';
import { createCalorieAdaptationAssessment, createWeeklyReview } from '@/test/factories/weeklyReviewFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';

const PERIOD = { weekStart: '2026-08-17' as const, weekEnd: '2026-08-23' as const };

function analysis(
  action: IntegratedCoachAction = 'maintainPlan',
  nextReview: CoachNextReview = { type: 'date', date: '2026-08-30' },
  candidate?: number,
) {
  const strengthPerformance: StrengthPerformanceSnapshot = {
    referenceDate: PERIOD.weekEnd,
    exercises: [],
    schedule: {
      completedPlannedCount: 0,
      skippedCount: 0,
      overdueCount: 0,
      abandonedCount: 0,
    },
  };
  const assessmentWithFactoryDefaults = createCalorieAdaptationAssessment({
    recoverySignalDays: 0,
    recoveryConcernDays: 0,
    proposedAdjustmentKcal: candidate ?? 0,
    reasons: ['Raison utile.', 'Raison utile.', 'coachState:truePlateau'],
  });
  const {
    weightTrendKgPerWeek: _weightTrendKgPerWeek,
    waistTrendCmPerWeek: _waistTrendCmPerWeek,
    actualToExpectedStepsPercent: _actualToExpectedStepsPercent,
    ...calorieAssessment
  } = assessmentWithFactoryDefaults;
  return {
    coachStateResult: {
      state: 'truePlateau' as const,
      confidence: {
        weight: 80,
        food: 90,
        activity: 70,
        recovery: 60,
        overall: 75,
        level: 'usable' as const,
      },
      reasons: ['Analyse longitudinale disponible.', 'strengthContext:stable', ' coachState:truePlateau'],
      blockingFactors: [],
      priority: 'medium' as const,
      recommendedAction: { type: 'reviewNutritionTarget' as const, direction: 'decrease' as const },
      nextReview,
    },
    strengthPerformance,
    calorieAssessment,
    safetyAssessment: createCoachSafetyAssessment({ referenceDate: PERIOD.weekEnd }),
    decision: {
      referenceDate: PERIOD.weekEnd,
      primaryAction: action,
      priority: 'medium' as const,
      coachState: 'truePlateau' as const,
      strengthContext: 'insufficient' as const,
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: PERIOD.weekEnd }),
      reasons: ['coachState:truePlateau', 'strengthContext:insufficient'],
      blockingFactors: [],
      ...(candidate === undefined ? {} : { proposedNutritionAdjustmentKcal: candidate }),
      requiresUserAcceptance: action === 'reviewNutritionTarget' && candidate !== undefined,
      nextReview,
    },
  };
}

describe('buildCoachReviewSnapshot', () => {
  it.each(INTEGRATED_COACH_ACTIONS)('%s produit un unique plan principal', (action) => {
    const snapshot = buildCoachReviewSnapshot(PERIOD, analysis(action));
    expect(snapshot.plan).toMatchObject({
      action,
      label: COACH_REVIEW_ACTION_LABELS[action],
    });
    expect(Object.keys(snapshot.plan).filter((key) => key === 'action')).toHaveLength(1);
  });

  it('maintainPlan ne demande aucune acceptation', () => {
    expect(buildCoachReviewSnapshot(PERIOD, analysis('maintainPlan')).plan)
      .toMatchObject({ requiresUserAcceptance: false });
  });

  it('conserve exactement le candidat C4 -50', () => {
    expect(buildCoachReviewSnapshot(
      PERIOD,
      analysis('reviewNutritionTarget', { type: 'date', date: '2026-08-30' }, -50),
    ).plan).toMatchObject({
      proposedNutritionAdjustmentKcal: -50,
      requiresUserAcceptance: true,
    });
  });

  it('filtre et déduplique les tokens techniques des raisons utilisateur', () => {
    const snapshot = buildCoachReviewSnapshot(PERIOD, analysis());
    expect(snapshot.reasons).toContain('Raison utile.');
    expect(snapshot.reasons.filter((reason) => reason === 'Raison utile.')).toHaveLength(1);
    expect(snapshot.reasons.join(' ')).not.toMatch(/coachState:|strengthContext:|strengthSchedule/);
    expect(snapshot.primaryReasons.length).toBeLessThanOrEqual(3);
  });

  it('conserve une réévaluation datée', () => {
    expect(buildCoachReviewSnapshot(PERIOD, analysis()).nextReview).toEqual({
      type: 'date',
      date: '2026-08-30',
    });
  });

  it.each([
    'moreData',
    'foodTrackingImproved',
    'temporaryContextResolved',
    'recoveryReassessed',
  ] as const)('conserve la condition de réévaluation %s', (condition) => {
    expect(buildCoachReviewSnapshot(
      PERIOD,
      analysis('collectMoreData', { type: 'condition', condition }),
    ).nextReview).toEqual({ type: 'condition', condition });
  });

  it('n’invente ni poids, ni taille, ni activité, ni récupération', () => {
    const snapshot = buildCoachReviewSnapshot(PERIOD, analysis());
    expect(snapshot.signals.body).not.toHaveProperty('weightTrendKgPerWeek');
    expect(snapshot.signals.body).not.toHaveProperty('waistTrendCmPerWeek');
    expect(snapshot.signals.activity).not.toHaveProperty('actualToExpectedStepsPercent');
    expect(snapshot.signals.recovery).toEqual({ signalDays: 0, concernDays: 0 });
  });

  it('affiche Strength insufficient comme données insuffisantes, jamais stable', () => {
    const snapshot = buildCoachReviewSnapshot(PERIOD, analysis());
    expect(snapshot.signals.strength.context).toBe('insufficient');
    expect(snapshot.signals.strength.exploitableExerciseCount).toBe(0);
  });
});

describe('canAcceptCoachWeeklyReview', () => {
  it('autorise seulement un candidat C4 non nul, matching et pending', () => {
    const snapshot = buildCoachReviewSnapshot(
      PERIOD,
      analysis('reviewNutritionTarget', { type: 'date', date: '2026-08-30' }, -50),
    );
    expect(canAcceptCoachWeeklyReview(snapshot, createWeeklyReview({
      decisionStatus: 'pending',
      proposedAdjustmentKcal: -50,
    }))).toBe(true);
    expect(canAcceptCoachWeeklyReview(snapshot, createWeeklyReview({
      decisionStatus: 'pending',
      proposedAdjustmentKcal: -100,
    }))).toBe(false);
    expect(canAcceptCoachWeeklyReview(snapshot, createWeeklyReview({
      decisionStatus: 'accepted',
      proposedAdjustmentKcal: -50,
    }))).toBe(false);
  });

  it('refuse défensivement une baisse avec une perte excessive Safety', () => {
    const snapshot = buildCoachReviewSnapshot(
      PERIOD,
      analysis('reviewNutritionTarget', { type: 'date', date: '2026-08-30' }, -50),
    );
    snapshot.safetyAssessment = createCoachSafetyAssessment({
      status: 'caution',
      concerns: [{ domain: 'bodyTrend', reasons: ['Perte excessive.'], immediateVeto: false }],
      reasons: ['Perte excessive.'],
    });
    expect(canAcceptCoachWeeklyReview(snapshot, createWeeklyReview({
      decisionStatus: 'pending',
      proposedAdjustmentKcal: -50,
    }))).toBe(false);
  });
});
