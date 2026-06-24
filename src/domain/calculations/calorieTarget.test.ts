import { describe, expect, it } from 'vitest';
import {
  calculateCalorieTarget,
  calculateGoalAdjustmentKcal,
} from '@/domain/calculations/calorieTarget';

 describe('objectif calorique', () => {
  it('calcule le déficit correspondant à -0,5 % par semaine', () => {
    expect(calculateGoalAdjustmentKcal(80, -0.5)).toBe(-440);
  });

  it('calcule le surplus correspondant à +0,25 % par semaine', () => {
    expect(calculateGoalAdjustmentKcal(80, 0.25)).toBe(220);
  });

  it('additionne la dépense, l’objectif et la calibration acceptée', () => {
    const result = calculateCalorieTarget({
      weightKg: 80,
      targetWeeklyWeightChangePercent: -0.5,
      totalEstimatedExpenditureKcal: 2_500,
      bmrKcal: 1_700,
      calorieFloorBmrMultiplier: 1.1,
      acceptedCalibrationAdjustmentKcal: 100,
    });

    expect(result.targetBeforeFloorKcal).toBe(2_160);
    expect(result.targetCaloriesKcal).toBe(2_160);
    expect(result.floorApplied).toBe(false);
  });

  it('applique le plancher avant de finaliser la cible', () => {
    const result = calculateCalorieTarget({
      weightKg: 80,
      targetWeeklyWeightChangePercent: -0.5,
      totalEstimatedExpenditureKcal: 1_600,
      bmrKcal: 1_648.75,
      calorieFloorBmrMultiplier: 1.1,
    });

    expect(result.calorieFloorKcal).toBe(1_820);
    expect(result.targetCaloriesKcal).toBe(1_820);
    expect(result.floorApplied).toBe(true);
  });

  it('arrondit la cible au multiple de 10 le plus proche', () => {
    const result = calculateCalorieTarget({
      weightKg: 70,
      targetWeeklyWeightChangePercent: 0,
      totalEstimatedExpenditureKcal: 2_056,
      bmrKcal: 1_500,
      calorieFloorBmrMultiplier: 1.1,
    });

    expect(result.targetCaloriesKcal).toBe(2_060);
  });
});
