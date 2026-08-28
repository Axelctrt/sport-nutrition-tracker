import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoachPage } from '@/features/coach/pages/CoachPage';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

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
    coachPhase: 'notDefined',
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

  it('demande le check-in sans anticiper de verdict et n’invente aucune phase', () => {
    mocks.snapshot = snapshot({ status: 'checkInRequired' });
    render(<MemoryRouter><CoachPage /></MemoryRouter>);

    expect(screen.getByText('Effectue ton check-in pour obtenir ton verdict du jour.')).toBeInTheDocument();
    expect(screen.getByText('Perte')).toBeInTheDocument();
    expect(screen.getByText('Bientôt disponible')).toBeInTheDocument();
    expect(screen.queryByText('Plan maintenu')).not.toBeInTheDocument();
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

  it('rend une erreur de chargement avec une action de reprise', () => {
    mocks.snapshot = undefined;
    mocks.status = 'error';
    mocks.errorMessage = 'Lecture locale indisponible.';
    render(<MemoryRouter><CoachPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Lecture locale indisponible.');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
