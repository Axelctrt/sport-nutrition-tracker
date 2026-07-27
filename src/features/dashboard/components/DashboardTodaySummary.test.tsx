import { cleanup, render, screen } from '@testing-library/react';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import { DashboardTodaySummary } from '@/features/dashboard/components/DashboardTodaySummary';
import type { DailyDashboardNutrition } from '@/features/dashboard/hooks/useDailyDashboard';

afterEach(cleanup);

function createSnapshot(weightDate = '2026-06-25'): DailyTargetSnapshot {
  return {
    date: '2026-06-25',
    target: {
      targetCaloriesKcal: 2_200,
      macros: {
        proteinGrams: 110,
        carbohydratesGrams: 280,
        fatGrams: 60,
      },
    },
    calculation: {
      steps: {
        totalSteps: 8_000,
      },
    },
    weight: {
      source: 'previousWeekAverage',
      weightKg: 60.5,
      period: { start: '2026-06-15', end: '2026-06-21' },
      dailyWeights: [],
    },
    energyTransparency: {
      expenditureWithoutSportKcal: 1_950,
      targetBeforeSportKcal: 2_000,
      plannedSportCaloriesKcal: 120,
      actualSportCaloriesKcal: 80,
      rawSportCaloriesKcal: 200,
      targetSportImpactKcal: 200,
      currentTargetKcal: 2_200,
      floorLimitedSportImpact: false,
      items: [],
    },
    dateWeightEntry: weightDate === '2026-06-25'
      ? {
          id: 'weight-1',
          date: weightDate,
          weightKg: 60.5,
          createdAt: '2026-06-25T07:00:00.000Z',
          updatedAt: '2026-06-25T07:00:00.000Z',
        }
      : undefined,
  } as unknown as DailyTargetSnapshot;
}

const nutrition: DailyDashboardNutrition = {
  consumed: {
    caloriesKcal: 1_500,
    proteinGrams: 85,
    carbohydratesGrams: 170,
    fatGrams: 45,
    entryCount: 6,
  },
  remaining: {
    caloriesKcal: 700,
    proteinGrams: 25,
    carbohydratesGrams: 110,
    fatGrams: 15,
  },
  journalStatus: undefined,
  entryCounts: {
    breakfast: 2,
    lunch: 2,
    dinner: 2,
    snacks: 0,
  },
};

describe('DashboardTodaySummary', () => {
  it('regroupe les calories, macros, pas et poids du jour dans une seule carte', () => {
    render(
      <DashboardTodaySummary
        snapshot={createSnapshot()}
        nutrition={nutrition}
        dailyStepGoal={10_000}
      />,
    );

    expect(screen.getByText('Cible alimentaire guidée')).toBeInTheDocument();
    expect(screen.getByText('Avant sport : 2 000 kcal')).toBeInTheDocument();
    expect(screen.getByText('Sport : +200 kcal')).toBeInTheDocument();
    expect(screen.getByText('kcal restantes')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progression calorique' })).toHaveAttribute(
      'aria-valuenow',
      '1500',
    );
    expect(screen.getByText('Protéines')).toBeInTheDocument();
    expect(screen.getByText('Glucides')).toBeInTheDocument();
    expect(screen.getByText('Lipides')).toBeInTheDocument();
    expect(screen.getByText('60,5 kg')).toBeInTheDocument();
    expect(screen.getByText('Pas attendus').parentElement).toHaveTextContent('8 000');
  });

  it('distingue une cible dépassée et affiche le poids actuel même sans pesée du jour', () => {
    render(
      <DashboardTodaySummary
        snapshot={createSnapshot('2026-06-24')}
        nutrition={{
          ...nutrition,
          consumed: { ...nutrition.consumed, caloriesKcal: 2_450 },
          remaining: { ...nutrition.remaining, caloriesKcal: -250 },
        }}
        dailyStepGoal={10_000}
      />,
    );

    expect(screen.getByText('kcal dépassées')).toBeInTheDocument();
    expect(screen.getByText('Poids actuel')).toBeInTheDocument();
    expect(screen.getByText('60,5 kg')).toBeInTheDocument();
    expect(screen.getByText('Valeur initiale du profil')).toBeInTheDocument();
  });

  it('distingue les pas réels et la dépense finale après le check-out', () => {
    const currentSnapshot = createSnapshot();
    currentSnapshot.stepsEntry = {
      id: 'steps:2026-06-25',
      date: '2026-06-25',
      totalSteps: 6_500,
      source: 'manual',
      createdAt: '2026-06-25T21:00:00.000Z',
      updatedAt: '2026-06-25T21:00:00.000Z',
    };
    currentSnapshot.energyGuidance = {
      expectedSteps: {
        expectedSteps: 8_000,
        stepGoal: 10_000,
        source: 'recentHistory',
        confidence: 'established',
        observedDayCount: 20,
        observationWindowDays: 28,
      },
      finalStatus: 'final',
      finalExpenditure: {
        ageYears: 22,
        steps: currentSnapshot.calculation.steps,
        energy: {
          bmrKcal: 1_600,
          occupationalBaseKcal: 1_920,
          walkingKcal: 100,
          runningKcal: 0,
          swimmingKcal: 0,
          strengthTrainingKcal: 180,
          otherActivitiesKcal: 0,
          plannedActivitiesKcal: 0,
          totalEstimatedExpenditureKcal: 2_200,
        },
      },
    };

    render(
      <DashboardTodaySummary
        snapshot={currentSnapshot}
        nutrition={nutrition}
        dailyStepGoal={10_000}
      />,
    );

    expect(screen.getByText('Pas réels').parentElement).toHaveTextContent('6 500');
    expect(screen.getByText(/attendus 8 000/)).toBeInTheDocument();
    expect(screen.getByText('Dépense finale estimée : 2 200 kcal')).toBeInTheDocument();
  });
});
