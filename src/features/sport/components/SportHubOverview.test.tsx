import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import type { SportHubSnapshot } from '@/application/sport/sportHubService';
import { createActivityJournalReturnState } from '@/features/activities/navigation/activityJournalNavigation';
import { SportHubOverview } from '@/features/sport/components/SportHubOverview';

const snapshot: SportHubSnapshot = {
  today: '2026-07-10',
  currentSession: {
    id: 'active-session',
    source: 'strength',
    title: 'Haut du corps',
    date: '2026-07-10',
    status: 'inProgress',
  },
  plannedEntries: [
    {
      id: 'run-plan',
      source: 'endurance',
      title: 'Footing facile',
      date: '2026-07-10',
      status: 'today',
      activityType: 'running',
      targetDurationMinutes: 45,
    },
  ],
  latestActivity: {
    id: 'activity-1',
    type: 'running',
    sessionType: 'easy',
    date: '2026-07-09',
    durationMinutes: 40,
    distanceKm: 7,
    averageCadenceSpm: 170,
    intensity: 'moderate',
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 420,
      calculationVersion: 1,
    },
    createdAt: '2026-07-09T10:00:00.000Z',
    updatedAt: '2026-07-09T10:00:00.000Z',
  },
  recentActivities: [],
  activityTypeOrder: [
    'running',
    'strengthTraining',
    'walking',
    'cycling',
    'swimming',
    'otherCardio',
  ],
  week: {
    startDate: '2026-07-06',
    endDate: '2026-07-12',
    activityCount: 3,
    totalDurationMinutes: 140,
    totalCaloriesKcal: 1_020,
    distanceKm: 18.5,
    swimmingDistanceMeters: 1_000,
  },
};
snapshot.recentActivities = snapshot.latestActivity ? [snapshot.latestActivity] : [];

describe('SportHubOverview', () => {
  it('affiche les informations prioritaires du hub Sport', () => {
    render(
      <MemoryRouter>
        <SportHubOverview
          snapshot={snapshot}
          navigationState={createActivityJournalReturnState('/activities', 'key', '2026-07-10')}
          onRecord={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Ma journée sportive' })).toBeInTheDocument();
    expect(screen.getByText('Haut du corps')).toBeInTheDocument();
    expect(screen.getByText('Footing facile')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organiser' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planification' })).toHaveAttribute('href', '/strength/planning');
    expect(screen.getByRole('heading', { name: 'Dernières activités' })).toBeInTheDocument();
    expect(screen.getByText('Footing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir tout l’historique/ })).toHaveAttribute(
      'href',
      '/activities?view=history&date=2026-07-10',
    );
  });

  it('ouvre le panneau d’enregistrement depuis l’action secondaire', () => {
    const onRecord = vi.fn();
    render(
      <MemoryRouter>
        <SportHubOverview
          snapshot={snapshot}
          navigationState={createActivityJournalReturnState('/activities', 'key', '2026-07-10')}
          onRecord={onRecord}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer une activité déjà réalisée' }));
    expect(onRecord).toHaveBeenCalledOnce();
  });

  it('propose la planification et les hubs d’organisation lorsque le hub est vide', () => {
    render(
      <MemoryRouter>
        <SportHubOverview
          snapshot={{
            today: snapshot.today,
            plannedEntries: [],
            recentActivities: [],
            activityTypeOrder: snapshot.activityTypeOrder,
            week: {
              ...snapshot.week,
              activityCount: 0,
              totalDurationMinutes: 0,
              totalCaloriesKcal: 0,
              distanceKm: 0,
              swimmingDistanceMeters: 0,
            },
          }}
          navigationState={createActivityJournalReturnState('/activities', 'key', '2026-07-10')}
          onRecord={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Aucune activité aujourd’hui')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Prévoir/ })).toHaveAttribute(
      'href',
      '/strength/planning?date=2026-07-10&section=upcoming',
    );
    expect(screen.getByText('Aucune activité enregistrée.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mes programmes' }));
    expect(screen.getByRole('dialog', { name: 'Mes programmes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Musculation/ })).toHaveAttribute('href', '/strength/templates');
    expect(screen.getByRole('link', { name: /Endurance/ })).toHaveAttribute('href', '/activities/templates');
  });
});
