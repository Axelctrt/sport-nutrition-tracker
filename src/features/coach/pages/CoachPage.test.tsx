import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoachPage } from '@/features/coach/pages/CoachPage';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';

const mocks = vi.hoisted(() => ({
  snapshot: undefined as CoachHubSnapshot | undefined,
  status: 'ready' as 'loading' | 'ready' | 'error',
  errorMessage: undefined as string | undefined,
  refresh: vi.fn(),
}));

const profile = createEntity(createProfileInput({ goal: 'loss', dailyStepGoal: 8_000 }));

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({ profile }),
}));

vi.mock('@/features/coach/hooks/useCoachHub', () => ({
  useCoachHub: () => ({
    data: mocks.snapshot,
    status: mocks.status,
    errorMessage: mocks.errorMessage,
    refresh: mocks.refresh,
  }),
}));

function snapshot(
  dailyVerdict: CoachHubSnapshot['dailyVerdict'],
): CoachHubSnapshot {
  return {
    referenceDate: '2026-08-28',
    dailyVerdict,
    orientation: 'loss',
    coachPhase: {
      status: 'available',
      phase: {
        id: 'deficit',
        label: 'Déficit actif',
        description: 'L’objectif actuel place le plan dans une période de perte de poids.',
        objective: 'loss',
      },
    },
    nutritionPlan: {
      status: 'available',
      targetCaloriesKcal: 1_900,
      macros: { proteinGrams: 120, carbohydratesGrams: 210, fatGrams: 65 },
    },
    activityPlan: { dailyStepGoal: 8_000, plannedActivities: [] },
    trainingPlan: {
      nextSession: {
        id: 'session-1',
        source: 'strength',
        title: 'Full body',
        date: '2026-08-29',
        status: 'upcoming',
      },
      plannedSessions: [],
    },
    priority: {
      action: 'maintainPlan',
      label: 'Maintenir le plan',
      explanation: 'Les signaux existants restent cohérents.',
      blockingFactors: [],
    },
    monitoredPoints: ['La récupération reste stable.'],
    nextReview: { type: 'date', date: '2026-09-04' },
  };
}

describe('CoachPage', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.errorMessage = undefined;
    mocks.refresh.mockClear();
  });

  it('demande le check-in sans anticiper de verdict et affiche la phase de l’objectif', () => {
    mocks.snapshot = snapshot({ status: 'checkInRequired' });
    render(<MemoryRouter><CoachPage /></MemoryRouter>);

    expect(screen.getByText('Effectue ton check-in pour obtenir ton verdict du jour.')).toBeInTheDocument();
    expect(screen.getByText('Perte de poids')).toBeInTheDocument();
    expect(screen.getByText('Déficit actif')).toBeInTheDocument();
    expect(screen.queryByText('Plan maintenu')).not.toBeInTheDocument();
  });

  it('n’invente aucune phase quand la résolution est indisponible', () => {
    mocks.snapshot = {
      ...snapshot({ status: 'checkInRequired' }),
      coachPhase: { status: 'unavailable' },
    };
    render(<MemoryRouter><CoachPage /></MemoryRouter>);

    expect(screen.getByText('Phase Coach indisponible')).toBeInTheDocument();
    expect(screen.queryByText('Déficit actif')).not.toBeInTheDocument();
  });

  it('affiche le verdict C2, le plan existant et les navigations autorisées', () => {
    mocks.snapshot = snapshot({
      status: 'available',
      result: {
        verdict: 'planMaintained',
        title: 'Plan maintenu',
        message: 'Les signaux restent cohérents : aucun changement n’est nécessaire aujourd’hui.',
        priority: 'low',
        coachState: 'onTrack',
        confidence: {
          weight: 80,
          food: 80,
          activity: 80,
          recovery: 80,
          overall: 80,
          level: 'reliable',
        },
      },
    });
    render(<MemoryRouter><CoachPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Plan maintenu' })).toBeInTheDocument();
    expect(screen.getByText('1 900 kcal')).toBeInTheDocument();
    expect(screen.getByText('8 000 pas')).toBeInTheDocument();
    expect(screen.getByText('Full body')).toBeInTheDocument();
    expect(screen.getByText('Points surveillés')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir Nutrition' })).toHaveAttribute('href', '/food');
    expect(screen.getByRole('link', { name: 'Ouvrir Sport' })).toHaveAttribute('href', '/activities');
    expect(screen.getByRole('link', { name: 'Ouvrir le Bilan' })).toHaveAttribute('href', '/weekly-review');
  });

  it('n’invente pas de dernier bilan', () => {
    mocks.snapshot = snapshot({ status: 'checkInRequired' });
    render(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.getByText('Aucun bilan Coach disponible.')).toBeInTheDocument();
  });

  it('isole un verdict indisponible sans masquer le reste du Hub', () => {
    mocks.snapshot = snapshot({ status: 'unavailable' });
    render(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Verdict indisponible' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plan actuel' })).toBeInTheDocument();
  });

  it('masque Safety quand tout est clair et affiche les états caution puis bloqué', () => {
    mocks.snapshot = {
      ...snapshot({ status: 'checkInRequired' }),
      safetyAssessment: createCoachSafetyAssessment({
        status: 'caution',
        concerns: [{ domain: 'bodyTrend', reasons: ['Perte rapide à surveiller.'], immediateVeto: false }],
        reasons: ['Perte rapide à surveiller.'],
      }),
    };
    const { rerender } = render(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.getByText('Point à surveiller')).toBeInTheDocument();
    expect(screen.getByText(/Perte rapide à surveiller/)).toBeInTheDocument();

    mocks.snapshot = {
      ...snapshot({ status: 'checkInRequired' }),
      safetyAssessment: createCoachSafetyAssessment({
        status: 'doNotIntensify',
        concerns: [{ domain: 'acuteContext', reasons: ['Maladie signalée.'], immediateVeto: true }],
        reasons: ['Maladie signalée.'],
        blockingFactors: ['Maladie signalée.'],
      }),
    };
    rerender(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.getByText('Sécurité Coach')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pas d’intensification pour le moment.' }))
      .toBeInTheDocument();
  });

  it('ne rend aucune carte Safety permanente quand le statut est clear', () => {
    mocks.snapshot = {
      ...snapshot({ status: 'checkInRequired' }),
      safetyAssessment: createCoachSafetyAssessment(),
    };
    render(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.queryByText('Sécurité Coach')).not.toBeInTheDocument();
    expect(screen.queryByText('Point à surveiller')).not.toBeInTheDocument();
  });

  it('rend une erreur de chargement avec une action de reprise', () => {
    mocks.snapshot = undefined;
    mocks.status = 'error';
    mocks.errorMessage = 'Lecture locale indisponible.';
    render(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Lecture locale indisponible.');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
