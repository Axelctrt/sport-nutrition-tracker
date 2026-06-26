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
      source: 'weightEntry',
      weightKg: 60.5,
      weightEntry: {
        id: 'weight-1',
        date: weightDate,
        weightKg: 60.5,
        createdAt: '2026-06-25T07:00:00.000Z',
        updatedAt: '2026-06-25T07:00:00.000Z',
      },
    },
  } as DailyTargetSnapshot;
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

    expect(screen.getByText('Calories consommées')).toBeInTheDocument();
    expect(screen.getByText('kcal restantes')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progression calorique' })).toHaveAttribute(
      'aria-valuenow',
      '1500',
    );
    expect(screen.getByText('Protéines')).toBeInTheDocument();
    expect(screen.getByText('Glucides')).toBeInTheDocument();
    expect(screen.getByText('Lipides')).toBeInTheDocument();
    expect(screen.getByText('60,5 kg')).toBeInTheDocument();
    expect(screen.getByText('Pas du jour').parentElement).toHaveTextContent('8 000');
  });

  it('distingue une cible dépassée et une absence de pesée du jour', () => {
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
    expect(screen.getByText('Non saisi')).toBeInTheDocument();
    expect(screen.getByText('Calcul actuel : 60,5 kg')).toBeInTheDocument();
  });
});
