import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import { DashboardCalculationDetails } from '@/features/dashboard/components/DashboardCalculationDetails';

function snapshot(): DailyTargetSnapshot {
  const plannedActivities = [
    {
      id: 'strengthSession:planned',
      source: 'strengthSession' as const,
      sourceId: 'planned',
      title: 'Push prévu',
      date: '2026-07-13',
      activityType: 'strengthTraining' as const,
      estimatedCaloriesKcal: 184,
      weightKg: 70,
      calculationVersion: 1,
      basis: 'plannedDuration' as const,
      durationMinutes: 60,
      metUsed: 3.5,
    },
    {
      id: 'strengthSession:completed',
      source: 'strengthSession' as const,
      sourceId: 'completed',
      title: 'Jambes réalisées',
      date: '2026-07-13',
      activityType: 'strengthTraining' as const,
      estimatedCaloriesKcal: 245,
      weightKg: 70,
      calculationVersion: 1,
      basis: 'actualDuration' as const,
      durationMinutes: 80,
      metUsed: 3.5,
    },
  ];

  return {
    date: '2026-07-13',
    target: {
      targetCaloriesKcal: 2_500,
      energy: {
        totalEstimatedExpenditureKcal: 2_500,
        walkingKcal: 40,
        plannedActivitiesKcal: 429,
      },
    },
    calculation: {
      steps: { nonRunningSteps: 8_000 },
      goalRateWasNormalized: false,
      macroDetails: { carbohydratesClampedToZero: false },
    },
    weight: {
      weightKg: 70,
      source: 'previousWeekAverage',
      period: { start: '2026-07-06', end: '2026-07-12' },
      dailyWeights: [{ date: '2026-07-08', weightKg: 70 }],
    },
    activities: [],
    plannedActivities,
  } as unknown as DailyTargetSnapshot;
}

describe('DashboardCalculationDetails', () => {
  afterEach(cleanup);

  it('distingue une estimation planifiée de la durée réelle d’une séance détaillée', () => {
    render(
      <MemoryRouter>
        <DashboardCalculationDetails snapshot={snapshot()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Séances prévues ou détaillées')).toBeInTheDocument();
    expect(screen.getByText('429 kcal')).toBeInTheDocument();
    expect(screen.getByText('Push prévu')).toBeInTheDocument();
    expect(screen.getByText('estimation planifiée')).toBeInTheDocument();
    expect(screen.getByText('Jambes réalisées')).toBeInTheDocument();
    expect(screen.getByText('durée réelle de la séance détaillée')).toBeInTheDocument();
  });
});
