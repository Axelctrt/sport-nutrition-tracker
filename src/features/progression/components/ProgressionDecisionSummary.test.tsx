import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressionDecisionSummary } from '@/features/progression/components/ProgressionDecisionSummary';

const summary = {
  activity: {
    sessionCount: 3,
    totalMinutes: 185,
    averageSteps: 10_200,
    recordedStepDays: 7,
  },
  weight: {
    state: 'aligned' as const,
    latestAverageKg: 70.8,
    changeKg: -0.6,
  },
  goal: {
    state: 'dueSoon' as const,
    title: 'Courir 50 km',
    progressPercent: 60,
    daysRemaining: 5,
  },
};

describe('ProgressionDecisionSummary', () => {
  it('présente trois signaux actionnables sans surcharger le hub', () => {
    render(
      <MemoryRouter>
        <ProgressionDecisionSummary
          data={summary}
          status="ready"
          onRetry={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'À retenir cette semaine' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Activité cette semaine/ })).toHaveAttribute('href', '/analytics');
    expect(screen.getByText('3 séances')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tendance du poids/ })).toHaveAttribute('href', '/weight');
    expect(screen.getByText('70,8 kg')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Objectif à surveiller/ })).toHaveAttribute('href', '/goals');
    expect(screen.getByText('Courir 50 km')).toBeInTheDocument();
  });

  it('affiche un chargement sans animation imposée en réduction de mouvement', () => {
    render(
      <MemoryRouter>
        <ProgressionDecisionSummary status="loading" onRetry={() => undefined} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Chargement de la synthèse')).toBeInTheDocument();
    expect(screen.getByLabelText('Chargement de la synthèse').firstElementChild).toHaveClass('motion-reduce:animate-none');
  });

  it('permet de relancer après une erreur', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <MemoryRouter>
        <ProgressionDecisionSummary
          status="error"
          errorMessage="Lecture impossible"
          onRetry={onRetry}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Lecture impossible');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
