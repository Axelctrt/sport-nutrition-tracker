import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardActiveWorkout } from '@/features/dashboard/components/DashboardActiveWorkout';
import type { ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { createEntity } from '@/shared/utils/entities';

afterEach(cleanup);

describe('DashboardActiveWorkout', () => {
  it('rend la séance en cours compacte et priorise le bouton de reprise', () => {
    const workout: ActiveWorkoutSummary = {
      session: createEntity({
        date: '2026-06-25',
        status: 'inProgress',
        startedAt: '2026-06-25T16:00:00.000Z',
        sourceTemplateNameSnapshot: 'Push A',
      }, 'session-push'),
      exerciseCount: 4,
    };

    render(
      <MemoryRouter>
        <DashboardActiveWorkout workout={workout} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Push A' })).toBeInTheDocument();
    expect(screen.getByText('4 exercices dans le carnet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre la séance' })).toHaveAttribute(
      'href',
      '/strength/sessions/session-push',
    );
  });
});
