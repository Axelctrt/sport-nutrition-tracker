import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ProgressInsightsPanel } from '@/features/analytics/components/ProgressInsightsPanel';

vi.mock('@/features/analytics/hooks/useProgressInsights', () => ({
  useProgressInsights: () => ({
    status: 'ready',
    errorMessage: undefined,
    refresh: vi.fn(),
    data: {
      weeks: [
        {
          weekStart: '2026-06-01',
          weekEnd: '2026-06-07',
          label: '1 juin',
          plannedCount: 2,
          completedCount: 2,
          skippedCount: 0,
          pendingCount: 0,
          adherencePercent: 100,
          recordedActivityCount: 2,
          isClosed: true,
          strength: {
            plannedCount: 1,
            completedCount: 1,
            skippedCount: 0,
            pendingCount: 0,
            adherencePercent: 100,
          },
          endurance: {
            plannedCount: 1,
            completedCount: 1,
            skippedCount: 0,
            pendingCount: 0,
            adherencePercent: 100,
          },
        },
      ],
      overall: {
        plannedCount: 2,
        completedCount: 2,
        skippedCount: 0,
        pendingCount: 0,
        adherencePercent: 100,
      },
      trend: {
        recentPercent: 100,
        previousPercent: 75,
        deltaPoints: 25,
        recentWeekCount: 1,
        previousWeekCount: 1,
      },
      consistency: {
        currentActiveWeekStreak: 1,
        bestActiveWeekStreak: 1,
        currentPerfectPlanningStreak: 1,
        bestPerfectPlanningStreak: 1,
        bestAdherenceWeek: {
          weekStart: '2026-06-01',
          weekEnd: '2026-06-07',
          label: '1 juin',
          plannedCount: 2,
          completedCount: 2,
          skippedCount: 0,
          pendingCount: 0,
          adherencePercent: 100,
          recordedActivityCount: 2,
          isClosed: true,
          strength: {
            plannedCount: 1,
            completedCount: 1,
            skippedCount: 0,
            pendingCount: 0,
            adherencePercent: 100,
          },
          endurance: {
            plannedCount: 1,
            completedCount: 1,
            skippedCount: 0,
            pendingCount: 0,
            adherencePercent: 100,
          },
        },
      },
      personalRecords: {
        running: {
          fastestPace: {
            value: 300,
            activity: { distanceKm: 10 },
          },
          commonDistances: [],
        },
        swimming: {
          fastestPace: {
            value: 120,
            activity: { distanceMeters: 1_500 },
          },
          commonDistances: [],
        },
        cycling: {
          fastestSpeed: {
            value: 30,
            activity: { distanceKm: 40 },
          },
        },
      },
    },
  }),
}));

describe('ProgressInsightsPanel', () => {
  it('affiche l’adhérence, les séries et les accès utiles', () => {
    render(
      <MemoryRouter>
        <ProgressInsightsPanel referenceDate="2026-06-15" />
      </MemoryRouter>,
    );

    const adherenceSection = screen
      .getByText('Adhérence au planning')
      .closest('details');
    const recordsSection = screen
      .getByText('Records personnels')
      .closest('details');

    expect(adherenceSection).not.toBeNull();
    expect(recordsSection).not.toBeNull();
    expect(adherenceSection).not.toHaveAttribute('open');
    expect(recordsSection).not.toHaveAttribute('open');
    expect(screen.getByText('Adhérence au planning')).toBeInTheDocument();
    expect(screen.getByText('Records personnels')).toBeInTheDocument();
    expect(screen.getAllByText('100 %').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/min\/km sur 10 km/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/min\/100 m sur 1(?:[ \u202f])500 m/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/km\/h sur 40 km/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Adhérence au planning'));
    fireEvent.click(screen.getByText('Records personnels'));

    expect(
      screen.getByRole('link', { name: /Ouvrir le planning sportif/ }),
    ).toHaveAttribute('href', '/strength/planning');
    expect(
      screen.getByRole('link', { name: /Consulter les records de musculation/ }),
    ).toHaveAttribute('href', '/strength/exercises');
  });
});
