import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildCoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { IntegratedCoachAction } from '@/domain/coach/integratedCoachDecision';
import type { CoachNextReview } from '@/domain/coach/coachState';
import { CoachReviewOverview } from '@/features/weekly-review/components/CoachReviewOverview';
import { createCalorieAdaptationAssessment, createWeeklyReview } from '@/test/factories/weeklyReviewFactory';

function snapshot(
  action: IntegratedCoachAction,
  candidate?: number,
  nextReview: CoachNextReview = { type: 'condition', condition: 'moreData' },
) {
  const calorieAssessment = createCalorieAdaptationAssessment({
    analysisStart: '2026-08-03',
    analysisEnd: '2026-08-23',
    proposedAdjustmentKcal: candidate ?? 0,
    reasons: ['Tendance longitudinale exploitable.', 'coachState:truePlateau'],
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
    decision: {
      referenceDate: '2026-08-23',
      primaryAction: action,
      priority: 'medium',
      coachState: action === 'maintainPlan' ? 'onTrack' : 'truePlateau',
      strengthContext: 'insufficient',
      reasons: ['coachState:truePlateau', 'strengthContext:insufficient'],
      blockingFactors: [],
      ...(candidate === undefined ? {} : { proposedNutritionAdjustmentKcal: candidate }),
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
