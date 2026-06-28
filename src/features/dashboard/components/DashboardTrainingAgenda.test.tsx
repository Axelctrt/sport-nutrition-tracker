import {
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { DashboardTrainingAgenda } from '@/features/dashboard/components/DashboardTrainingAgenda';

describe('DashboardTrainingAgenda', () => {
  it('affiche seulement le programme du jour et un accès compact à la suite', async () => {
    render(
      <MemoryRouter>
        <DashboardTrainingAgenda
          loadAgenda={async () => ({
            today: '2026-06-28',
            endDate: '2026-07-05',
            overdueCount: 1,
            todayCount: 2,
            upcomingCount: 1,
            entries: [
              {
                id: 'run-overdue',
                source: 'endurance',
                title: 'Footing oublié',
                date: '2026-06-27',
                status: 'overdue',
                activityType: 'running',
              },
              {
                id: 'strength-today',
                source: 'strength',
                title: 'Jambes',
                date: '2026-06-28',
                status: 'today',
              },
              {
                id: 'swim-today',
                source: 'endurance',
                title: 'Natation',
                date: '2026-06-28',
                status: 'today',
                activityType: 'swimming',
                targetDistanceMeters: 1500,
              },
              {
                id: 'bike-upcoming',
                source: 'endurance',
                title: 'Sortie vélo',
                date: '2026-07-01',
                status: 'upcoming',
                activityType: 'cycling',
              },
            ],
          })}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Jambes'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Natation'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Footing oublié'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Sortie vélo'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: 'Ouvrir : Jambes',
      }),
    ).toHaveAttribute(
      'href',
      '/strength/planning?date=2026-06-28&session=strength-today',
    );

    expect(
      screen.getByRole('link', {
        name: 'Voir les activités à venir',
      }),
    ).toHaveAttribute(
      'href',
      '/strength/planning?date=2026-06-28&section=upcoming',
    );
  });
});
