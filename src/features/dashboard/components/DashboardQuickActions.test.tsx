import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardQuickActions } from '@/features/dashboard/components/DashboardQuickActions';
import type { ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { createEntity } from '@/shared/utils/entities';

afterEach(cleanup);

const activeWorkout: ActiveWorkoutSummary = {
  session: createEntity({
    date: '2026-06-25',
    status: 'inProgress',
    startedAt: '2026-06-25T16:00:00.000Z',
    sourceTemplateNameSnapshot: 'Haut du corps',
  }, 'session-current'),
  exerciseCount: 5,
};

describe('DashboardQuickActions', () => {
  it('expose les six actions fréquentes avec des cibles tactiles distinctes', () => {
    render(
      <MemoryRouter>
        <DashboardQuickActions date="2026-06-25" />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Ajouter un aliment' })).toHaveAttribute(
      'href',
      '/food/add?date=2026-06-25&slot=snacks',
    );
    expect(screen.getByRole('link', { name: 'Scanner un produit' })).toHaveAttribute(
      'href',
      '/food/barcode-scanner?date=2026-06-25&slot=snacks',
    );
    expect(screen.getByRole('link', { name: 'Saisir les pas' })).toHaveAttribute(
      'href',
      '#dashboard-steps-entry',
    );
    expect(screen.getByRole('link', { name: 'Saisir le poids' })).toHaveAttribute(
      'href',
      '#dashboard-weight-entry',
    );
    expect(screen.getByRole('link', { name: 'Démarrer une séance' })).toHaveAttribute(
      'href',
      '/strength/sessions',
    );
  });

  it('remplace le démarrage par la reprise directe lorsqu’une séance existe', () => {
    render(
      <MemoryRouter>
        <DashboardQuickActions date="2026-06-25" activeWorkout={activeWorkout} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Reprendre la séance' })).toHaveAttribute(
      'href',
      '/strength/sessions/session-current',
    );
  });
});
