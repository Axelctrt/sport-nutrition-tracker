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
      goalAdjustmentKcal: -200,
      acceptedCalibrationAdjustmentKcal: 50,
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
    energyTransparency: {
      expenditureWithoutSportKcal: 2_071,
      targetBeforeSportKcal: 1_920,
      plannedSportCaloriesKcal: 184,
      actualSportCaloriesKcal: 245,
      rawSportCaloriesKcal: 429,
      targetSportImpactKcal: 580,
      currentTargetKcal: 2_500,
      floorLimitedSportImpact: false,
      items: [
        {
          id: 'strengthSession:planned',
          title: 'Push prévu',
          activityType: 'strengthTraining',
          status: 'planned',
          calculationSource: 'automatic',
          caloriesKcal: 184,
          detail: 'Estimation planifiée selon la durée',
        },
        {
          id: 'strengthSession:completed',
          title: 'Jambes réalisées',
          activityType: 'strengthTraining',
          status: 'realizedPlanned',
          calculationSource: 'automatic',
          caloriesKcal: 245,
          plannedCaloriesKcal: 184,
          deltaCaloriesKcal: 61,
          detail: 'Durée réelle de la séance détaillée',
        },
      ],
    },
  } as unknown as DailyTargetSnapshot;
}

describe('DashboardCalculationDetails', () => {
  afterEach(cleanup);

  it('explique la cible avant sport, le prévu, le réalisé et leur écart', () => {
    render(
      <MemoryRouter>
        <DashboardCalculationDetails snapshot={snapshot()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Évolution de la cible aujourd’hui')).toBeInTheDocument();
    expect(screen.getByText('Cible avant sport')).toBeInTheDocument();
    expect(screen.getByText('Séances encore prévues')).toBeInTheDocument();
    expect(screen.getByText('Activités réalisées')).toBeInTheDocument();
    expect(screen.getByText('Push prévu')).toBeInTheDocument();
    expect(screen.getByText(/séance encore prévue/)).toBeInTheDocument();
    expect(screen.getByText('Jambes réalisées')).toBeInTheDocument();
    expect(screen.getByText(/remplace 184 kcal prévus/)).toBeInTheDocument();
    expect(screen.getByText('Écart prévu/réel : +61 kcal')).toBeInTheDocument();
    expect(screen.getByText('Ajustement de l’objectif')).toBeInTheDocument();
    expect(screen.getByText('Calibration acceptée')).toBeInTheDocument();
  });
});
