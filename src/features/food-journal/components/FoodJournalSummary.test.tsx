import { render, screen } from '@testing-library/react';
import { FoodJournalSummary } from '@/features/food-journal/components/FoodJournalSummary';
import type { DailyTarget } from '@/domain/models/targets';

const target = {
  calculationWeightKg: 70,
  energy: {
    bmrKcal: 1_600,
    occupationalBaseKcal: 400,
    walkingKcal: 0,
    runningKcal: 0,
    swimmingKcal: 0,
    strengthTrainingKcal: 0,
    otherActivitiesKcal: 0,
    totalEstimatedExpenditureKcal: 2_000,
  },
  goalAdjustmentKcal: 0,
  acceptedCalibrationAdjustmentKcal: 0,
  calorieFloorKcal: 1_500,
  calculationVersion: 1,
  id: 'target-1',
  date: '2026-07-10',
  targetCaloriesKcal: 2_000,
  macros: {
    proteinGrams: 120,
    carbohydratesGrams: 230,
    fatGrams: 67,
  },
  createdAt: '2026-07-10T08:00:00.000Z',
  updatedAt: '2026-07-10T08:00:00.000Z',
} satisfies DailyTarget;

describe('FoodJournalSummary', () => {
  it('hiérarchise calories consommées, restantes, objectif et macros', () => {
    render(
      <FoodJournalSummary
        totals={{
          entryCount: 3,
          caloriesKcal: 1_250,
          proteinGrams: 75,
          carbohydratesGrams: 140,
          fatGrams: 45,
        }}
        target={target}
        remaining={{
          caloriesKcal: 750,
          proteinGrams: 45,
          carbohydratesGrams: 90,
          fatGrams: 22,
        }}
      />,
    );

    const summary = screen.getByLabelText('Résumé nutritionnel de la journée');
    expect(summary).toHaveTextContent('1250');
    expect(summary).toHaveTextContent('750');
    expect(summary).toHaveTextContent('2000');
    expect(screen.getByRole('progressbar', { name: 'Progression calorique' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progression protéines' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progression glucides' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progression lipides' })).toBeInTheDocument();
  });
});
