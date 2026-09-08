import { describe, expect, it } from 'vitest';
import {
  buildCoachExplanation,
  type BuildCoachExplanationInput,
} from '@/domain/coach/coachExplanation';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import {
  COACH_REVIEW_ACTION_LABELS,
  COACH_REVIEW_STATE_LABELS,
  type CoachReviewSnapshot,
} from '@/domain/coach/coachReview';
import type { CoachSafetyAssessment } from '@/domain/coach/coachSafety';
import type { CoachState, CoachStateConfidenceLevel } from '@/domain/coach/coachState';
import type { IntegratedCoachAction } from '@/domain/coach/integratedCoachDecision';
import { createEntity } from '@/shared/utils/entities';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';
import { createCalorieAdaptationAssessment } from '@/test/factories/weeklyReviewFactory';

const CONFIDENCE = {
  weight: 80,
  food: 80,
  activity: 80,
  recovery: 80,
  overall: 80,
  level: 'reliable' as const,
};

function review(options: {
  action?: IntegratedCoachAction;
  state?: CoachState;
  confidenceLevel?: CoachStateConfidenceLevel;
  reasons?: string[];
  safety?: CoachSafetyAssessment;
  weekStart?: '2026-08-17' | '2026-08-24';
  weekEnd?: '2026-08-23' | '2026-08-30';
} = {}): CoachReviewSnapshot {
  const action = options.action ?? 'maintainPlan';
  const state = options.state ?? 'onTrack';
  const safety = options.safety ?? createCoachSafetyAssessment({ referenceDate: '2026-08-30' });
  const confidence = { ...CONFIDENCE, level: options.confidenceLevel ?? CONFIDENCE.level };
  const reasons = options.reasons ?? [
    'La progression reste cohérente avec le plan.',
    'La récupération reste stable.',
  ];
  const proposesAdjustment = action === 'reviewNutritionTarget';

  return {
    referenceDate: '2026-08-30',
    period: {
      weekStart: options.weekStart ?? '2026-08-24',
      weekEnd: options.weekEnd ?? '2026-08-30',
    },
    diagnostic: { state, label: COACH_REVIEW_STATE_LABELS[state] },
    confidence,
    reasons,
    primaryReasons: reasons.slice(0, 3),
    blockingFactors: [],
    signals: {
      body: { weighInCount: 4 },
      nutrition: { completedFoodDays: 6, comparableFoodDays: 5 },
      activity: { recordedStepDays: 7 },
      recovery: { signalDays: 5, concernDays: 0 },
      strength: {
        context: 'stable',
        exploitableExerciseCount: 3,
        schedule: {
          completedPlannedCount: 3,
          skippedCount: 0,
          overdueCount: 0,
          abandonedCount: 0,
        },
      },
    },
    decision: {
      referenceDate: '2026-08-30',
      primaryAction: action,
      priority: action === 'collectMoreData' ? 'low' : 'medium',
      coachState: state,
      strengthContext: 'stable',
      safetyAssessment: safety,
      reasons,
      blockingFactors: [],
      ...(proposesAdjustment ? { proposedNutritionAdjustmentKcal: -100 } : {}),
      requiresUserAcceptance: proposesAdjustment,
      nextReview: { type: 'date', date: '2026-09-06' },
    },
    safetyAssessment: safety,
    plan: {
      action,
      label: COACH_REVIEW_ACTION_LABELS[action],
      ...(proposesAdjustment ? { proposedNutritionAdjustmentKcal: -100 } : {}),
      requiresUserAcceptance: proposesAdjustment,
    },
    nextReview: { type: 'date', date: '2026-09-06' },
    calorieAssessment: createCalorieAdaptationAssessment(),
  };
}

function memoryFor(snapshot: CoachReviewSnapshot): CoachDecisionMemoryRecord {
  return createEntity({
    weeklyReviewId: `review:${snapshot.period.weekEnd}`,
    period: { ...snapshot.period },
    decisionDate: snapshot.referenceDate,
    phase: { id: 'stabilization', label: 'Stabilisation', objective: 'maintenance' },
    coachState: snapshot.diagnostic.state,
    confidence: { ...snapshot.confidence },
    primaryAction: snapshot.plan.action,
    reasons: [...snapshot.primaryReasons],
    blockingFactors: [...snapshot.blockingFactors],
    safety: {
      status: snapshot.safetyAssessment.status,
      reasons: [...snapshot.safetyAssessment.reasons],
    },
    status: snapshot.plan.action === 'maintainPlan' ? 'maintained' : 'accepted',
    decidedAt: `${snapshot.referenceDate}T12:00:00.000Z`,
    nextReview: { ...snapshot.nextReview },
  }, 'coach-memory');
}

describe('buildCoachExplanation', () => {
  it('explique une décision de maintien sans prendre une nouvelle décision', () => {
    const explanation = buildCoachExplanation({
      currentReview: review(),
      memories: [],
    });

    expect(explanation).toMatchObject({
      availability: 'available',
      title: 'Maintenir le plan',
      confidence: { level: 'reliable', label: 'Fiable' },
      reasons: ['La progression reste cohérente avec le plan.', 'La récupération reste stable.'],
      comparison: { status: 'firstDecision' },
      nextReview: { type: 'date', date: '2026-09-06' },
    });
  });

  it('décrit uniquement les différences structurées avec la décision précédente', () => {
    const previous = review({
      weekStart: '2026-08-17',
      weekEnd: '2026-08-23',
    });
    const current = review({
      action: 'reviewNutritionTarget',
      state: 'truePlateau',
      confidenceLevel: 'usable',
    });

    const explanation = buildCoachExplanation({
      currentReview: current,
      memories: [memoryFor(previous)],
    });

    expect(explanation.comparison.status).toBe('changed');
    expect(explanation.comparison.changes).toEqual(expect.arrayContaining([
      'Action principale : Maintenir le plan → Revoir la cible nutritionnelle.',
      'État Coach : Progression conforme → Plateau probable.',
      'Confiance : Fiable → Exploitable.',
    ]));
  });

  it('conserve une Safety active sans en minimiser les raisons', () => {
    const safety = createCoachSafetyAssessment({
      referenceDate: '2026-08-30',
      status: 'doNotIntensify',
      concerns: [{
        domain: 'acuteContext',
        reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
        immediateVeto: true,
      }],
      reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
      blockingFactors: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
    });

    const explanation = buildCoachExplanation({
      currentReview: review({ safety }),
      safetyAssessment: safety,
      memories: [],
    });

    expect(explanation.safety).toEqual({
      status: 'doNotIntensify',
      title: 'Pas d’intensification pour le moment.',
      reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
    });
  });

  it('ne compare pas une première décision sans historique', () => {
    const explanation = buildCoachExplanation({
      currentReview: review(),
      memories: [],
    });

    expect(explanation.comparison).toEqual({
      status: 'firstDecision',
      summary: 'C’est la première décision enregistrée : aucune comparaison historique n’est disponible.',
      changes: [],
    });
  });

  it('signale les données insuffisantes sans fabriquer de justification', () => {
    const explanation = buildCoachExplanation({
      currentReview: review({
        action: 'collectMoreData',
        state: 'insufficientData',
        confidenceLevel: 'insufficient',
        reasons: [],
      }),
      memories: [],
    });

    expect(explanation).toMatchObject({
      availability: 'insufficientData',
      summary: 'Le Coach manque encore d’éléments fiables pour expliquer une décision plus précise.',
      reasons: [],
    });
  });

  it('reste sans effet de bord sur les entrées C5, C8 et C9', () => {
    const currentReview = review();
    const safetyAssessment = createCoachSafetyAssessment({ referenceDate: '2026-08-30' });
    const memories = [memoryFor(review({
      weekStart: '2026-08-17',
      weekEnd: '2026-08-23',
    }))];
    const input: BuildCoachExplanationInput = {
      currentReview,
      safetyAssessment,
      memories,
    };
    const before = structuredClone(input);

    buildCoachExplanation(input);

    expect(input).toStrictEqual(before);
  });
});
