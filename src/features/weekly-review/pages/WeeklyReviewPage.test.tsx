import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyReviewSnapshot } from '@/application/weekly-review/weeklyReviewService';
import { buildCoachReviewSnapshot } from '@/domain/coach/coachReview';
import type { IntegratedCoachAction } from '@/domain/coach/integratedCoachDecision';
import type { UserProfile } from '@/domain/models/profile';
import { WeeklyReviewPage } from '@/features/weekly-review/pages/WeeklyReviewPage';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import {
  createCalorieAdaptationAssessment,
  createWeeklyReview,
} from '@/test/factories/weeklyReviewFactory';
import {
  createEnergyArchitectureRetrospectiveReport,
} from '@/test/factories/energyArchitectureRetrospectiveFactory';

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  reject: vi.fn(),
  refresh: vi.fn(),
  snapshot: undefined as WeeklyReviewSnapshot | undefined,
  profile: undefined as UserProfile | undefined,
}));

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({ profile: mocks.profile }),
}));

vi.mock('@/features/weekly-review/hooks/useWeeklyReview', () => ({
  useWeeklyReview: () => ({
    data: mocks.snapshot,
    status: 'ready',
    actionStatus: 'idle',
    errorMessage: undefined,
    refresh: mocks.refresh,
    accept: mocks.accept,
    reject: mocks.reject,
  }),
}));

function coachReview(action: IntegratedCoachAction, candidate?: number) {
  const calorieAssessment = createCalorieAdaptationAssessment({
    analysisStart: '2026-05-25',
    analysisEnd: '2026-06-14',
    proposedAdjustmentKcal: candidate ?? 0,
    reasons: ['La tendance est cohérente avec les données qualifiées.'],
  });
  return buildCoachReviewSnapshot({
    weekStart: '2026-06-08',
    weekEnd: '2026-06-14',
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
      reasons: ['Les signaux sont cohérents.'],
      blockingFactors: [],
      priority: 'medium',
      recommendedAction: { type: 'maintainPlan' },
      nextReview: { type: 'condition', condition: 'moreData' },
    },
    strengthPerformance: {
      referenceDate: '2026-06-14',
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
      referenceDate: '2026-06-14',
      primaryAction: action,
      priority: 'medium',
      coachState: action === 'maintainPlan' ? 'onTrack' : 'truePlateau',
      strengthContext: 'insufficient',
      reasons: [],
      blockingFactors: [],
      ...(candidate === undefined ? {} : { proposedNutritionAdjustmentKcal: candidate }),
      requiresUserAcceptance: action === 'reviewNutritionTarget' && candidate !== undefined,
      nextReview: { type: 'condition', condition: 'moreData' },
    },
  });
}

function snapshot(action: IntegratedCoachAction, candidate?: number): WeeklyReviewSnapshot {
  const review = createWeeklyReview({
    decisionStatus: 'pending',
    proposedDecision: candidate === undefined || candidate === 0 ? 'keep' : 'decrease',
    proposedAdjustmentKcal: candidate ?? 0,
    adaptation: createCalorieAdaptationAssessment({ proposedAdjustmentKcal: candidate ?? 0 }),
  });
  return {
    review,
    reviews: [review],
    adjustments: [],
    coachReview: coachReview(action, candidate),
    insights: {
      training: {
        hasPlanning: false,
        plannedSessions: 0,
        completedPlannedSessions: 0,
        skippedPlannedSessions: 0,
        abandonedPlannedSessions: 0,
        pendingPlannedSessions: 0,
        actualSessions: 0,
        activityMinutes: 0,
        strengthSessions: 0,
        enduranceSessions: 0,
        runningDistanceKm: 0,
        cyclingDistanceKm: 0,
        swimmingDistanceMeters: 0,
      },
      successes: [],
      attentionPoints: [],
      recommendations: [],
    },
    energyRetrospective: createEnergyArchitectureRetrospectiveReport(),
  };
}

function renderPage() {
  render(<MemoryRouter><WeeklyReviewPage /></MemoryRouter>);
}

describe('WeeklyReviewPage — Bilan du Coach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile = createEntity(createProfileInput(), 'profile');
  });

  it('affiche le récit C5 complet et conserve le choix de semaine', () => {
    mocks.snapshot = snapshot('maintainPlan');
    renderPage();

    expect(screen.getByRole('heading', { name: 'Bilan du Coach' })).toBeInTheDocument();
    expect(screen.getByLabelText('Semaine à analyser')).toHaveAttribute('type', 'date');
    for (const heading of [
      'Diagnostic', 'Confiance', 'Pourquoi', 'Corps', 'Nutrition', 'Activité',
      'Récupération', 'Performance musculation', 'Décision du Coach',
      'Plan de la prochaine période', 'Réévaluation',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.queryByText(/coachState:|strengthContext:/)).not.toBeInTheDocument();
    expect(screen.getByText('Historique des calibrations')).toBeInTheDocument();
    expect(screen.getByText('Détails et repères de suivi')).toBeInTheDocument();
  });

  it('maintainPlan ne montre aucune action calorique', () => {
    mocks.snapshot = snapshot('maintainPlan');
    renderPage();

    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refuser' })).not.toBeInTheDocument();
    expect(screen.queryByText('Proposition calorique')).not.toBeInTheDocument();
  });

  it('reviewNutritionTarget affiche le candidat exact et les actions explicites', () => {
    mocks.snapshot = snapshot('reviewNutritionTarget', -50);
    renderPage();

    expect(screen.getByText('Ajuster la cible de -50 kcal/j')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accepter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument();
  });

  it('C4 indisponible conserve les détails et interdit toute application', () => {
    const fallback = snapshot('maintainPlan');
    delete fallback.coachReview;
    fallback.coachError = 'Bilan Coach indisponible.';
    mocks.snapshot = fallback;
    renderPage();

    expect(screen.getByText('Bilan Coach indisponible')).toBeInTheDocument();
    expect(screen.getByText('Détails du suivi hebdomadaire')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refuser' })).not.toBeInTheDocument();
  });
});
