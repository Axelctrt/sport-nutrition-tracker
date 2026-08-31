import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildCoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { IntegratedCoachAction } from '@/domain/coach/integratedCoachDecision';
import type { CoachNextReview } from '@/domain/coach/coachState';
import type { CalorieAdaptationAssessment } from '@/domain/models/weeklyReview';
import { CoachReviewOverview } from '@/features/weekly-review/components/CoachReviewOverview';
import { createCalorieAdaptationAssessment, createWeeklyReview } from '@/test/factories/weeklyReviewFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';
import type { CoachSafetyAssessment } from '@/domain/coach/coachSafety';

function snapshot(
  action: IntegratedCoachAction,
  candidate?: number,
  nextReview: CoachNextReview = { type: 'condition', condition: 'moreData' },
  assessmentOverrides: Partial<CalorieAdaptationAssessment> = {},
  safetyAssessment: CoachSafetyAssessment = createCoachSafetyAssessment({
    referenceDate: '2026-08-23',
  }),
  includeDecisionCandidate = true,
) {
  const calorieAssessment = createCalorieAdaptationAssessment({
    analysisStart: '2026-08-03',
    analysisEnd: '2026-08-23',
    proposedAdjustmentKcal: candidate ?? 0,
    reasons: ['Tendance longitudinale exploitable.', 'coachState:truePlateau'],
    ...assessmentOverrides,
  });
  return buildCoachReviewSnapshot({
    weekStart: '2026-08-17',
    weekEnd: '2026-08-23',
  }, {
    coachStateResult: {
      state: action === 'maintainPlan' ? 'onTrack' : 'truePlateau',
      confidence: {
        weight: 90,
        food: 90,
        activity: 80,
        recovery: 70,
        overall: 85,
        level: 'reliable',
      },
      reasons: ['Les signaux sont cohérents.', 'strengthContext:stable'],
      blockingFactors: [],
      priority: 'medium',
      recommendedAction: { type: 'maintainPlan' },
      nextReview,
    },
    strengthPerformance: {
      referenceDate: '2026-08-23',
      exercises: [],
      schedule: {
        completedPlannedCount: 0,
        skippedCount: 0,
        overdueCount: 0,
        abandonedCount: 0,
      },
    },
    calorieAssessment,
    safetyAssessment,
    decision: {
      referenceDate: '2026-08-23',
      primaryAction: action,
      priority: 'medium',
      coachState: action === 'maintainPlan' ? 'onTrack' : 'truePlateau',
      strengthContext: 'insufficient',
      safetyAssessment,
      reasons: ['coachState:truePlateau', 'strengthContext:insufficient'],
      blockingFactors: [],
      ...(candidate === undefined || !includeDecisionCandidate
        ? {}
        : { proposedNutritionAdjustmentKcal: candidate }),
      requiresUserAcceptance: action === 'reviewNutritionTarget' && candidate !== undefined,
      nextReview,
    },
  });
}

function renderOverview(action: IntegratedCoachAction, candidate?: number) {
  const review = createWeeklyReview({
    decisionStatus: 'pending',
    proposedAdjustmentKcal: candidate ?? 0,
  });
  render(
    <CoachReviewOverview
      snapshot={snapshot(action, candidate)}
      review={review}
      actionStatus="idle"
      onAccept={vi.fn()}
      onReject={vi.fn()}
    />,
  );
}

describe('CoachReviewOverview', () => {
  it('rend le récit C5 complet et mobile-first sans tokens techniques', () => {
    renderOverview('maintainPlan');

    for (const heading of [
      'Diagnostic',
      'Confiance',
      'Pourquoi',
      'Corps',
      'Nutrition',
      'Activité',
      'Récupération',
      'Performance musculation',
      'Décision du Coach',
      'Plan de la prochaine période',
      'Réévaluation',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/Semaine observée/)).toBeInTheDocument();
    expect(screen.getByText(/Tendance Coach analysée/)).toBeInTheDocument();
    expect(screen.queryByText(/coachState:|strengthContext:/)).not.toBeInTheDocument();
  });

  it('maintainPlan ne propose ni acceptation, ni refus, ni proposition calorique', () => {
    renderOverview('maintainPlan');

    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refuser' })).not.toBeInTheDocument();
    expect(screen.queryByText('Proposition calorique')).not.toBeInTheDocument();
  });

  it('affiche le candidat C4 exact et les deux actions uniquement lorsqu’il est applicable', () => {
    renderOverview('reviewNutritionTarget', -50);

    expect(screen.getByText('Ajuster la cible de -50 kcal/j')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accepter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument();
  });

  it('affiche les raisons Safety sans CTA pour une baisse bloquée', () => {
    const safetyAssessment = createCoachSafetyAssessment({
      referenceDate: '2026-08-23',
      status: 'doNotIntensify',
      concerns: [{
        domain: 'acuteContext',
        reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
        immediateVeto: true,
      }],
      reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
      blockingFactors: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
    });
    const review = createWeeklyReview({
      decisionStatus: 'pending',
      proposedAdjustmentKcal: -50,
    });
    render(
      <CoachReviewOverview
        snapshot={snapshot(
          'maintainPlan',
          -50,
          { type: 'condition', condition: 'recoveryReassessed' },
          {},
          safetyAssessment,
          false,
        )}
        review={review}
        actionStatus="idle"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Pas d’intensification pour le moment.' }))
      .toBeInTheDocument();
    expect(screen.getByText(/douleur ou blessure est signalée/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument();
  });

  it('distingue les tendances signées, les pourcentages absolus et les journées alimentaires', () => {
    const review = createWeeklyReview({ decisionStatus: 'pending', proposedAdjustmentKcal: 0 });
    render(
      <CoachReviewOverview
        snapshot={snapshot(
          'maintainPlan',
          undefined,
          { type: 'condition', condition: 'moreData' },
          {
            weightTrendKgPerWeek: 0.2,
            waistTrendCmPerWeek: -0.3,
            averageCalorieDeviationPercent: 5,
            proteinAdherencePercent: 90,
            actualToExpectedStepsPercent: 100,
            completedFoodDays: 12,
            comparableFoodDays: 10,
          },
        )}
        review={review}
        actionStatus="idle"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText('Poids : +0,2 kg/semaine')).toBeInTheDocument();
    expect(screen.getByText('Tour de taille : -0,3 cm/semaine')).toBeInTheDocument();
    expect(screen.getByText('Écart calorique : +5 %')).toBeInTheDocument();
    expect(screen.getByText('Adhérence protéines : 90 %')).toBeInTheDocument();
    expect(screen.getByText('Niveau réel/attendu : 100 %')).toBeInTheDocument();
    expect(screen.queryByText('Adhérence protéines : +90 %')).not.toBeInTheDocument();
    expect(screen.queryByText('Niveau réel/attendu : +100 %')).not.toBeInTheDocument();
    expect(screen.getByText('12 journée(s) complète(s)')).toBeInTheDocument();
    expect(screen.getByText('10 journée(s) comparable(s)')).toBeInTheDocument();
    expect(screen.queryByText('12/10 journée(s) complète(s)')).not.toBeInTheDocument();
  });

  it.each([
    ['moreData', 'Lorsque davantage de données seront disponibles'],
    ['foodTrackingImproved', 'Lorsque le suivi alimentaire sera suffisamment complet'],
    ['temporaryContextResolved', 'Lorsque le contexte temporaire sera résolu'],
    ['recoveryReassessed', 'Après réévaluation de la récupération'],
  ] as const)('présente la condition de réévaluation %s', (condition, label) => {
    const review = createWeeklyReview({ decisionStatus: 'pending', proposedAdjustmentKcal: 0 });
    render(
      <CoachReviewOverview
        snapshot={snapshot('maintainPlan', undefined, { type: 'condition', condition })}
        review={review}
        actionStatus="idle"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('présente une date de réévaluation sans en inventer une autre', () => {
    const review = createWeeklyReview({ decisionStatus: 'pending', proposedAdjustmentKcal: 0 });
    render(
      <CoachReviewOverview
        snapshot={snapshot('maintainPlan', undefined, { type: 'date', date: '2026-08-30' })}
        review={review}
        actionStatus="idle"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText('30 août 2026')).toBeInTheDocument();
  });
});
