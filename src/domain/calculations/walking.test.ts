import { describe, expect, it } from 'vitest';
import {
  calculateAdditionalWalking,
  calculateStepLengthMeters,
} from '@/domain/calculations/walking';

 describe('calculs de marche et double comptage', () => {
  it('estime la longueur de pas à partir de la taille', () => {
    expect(calculateStepLengthMeters(175)).toBeCloseTo(0.72275, 6);
  });

  it('soustrait les pas de course avant le seuil de base', () => {
    const result = calculateAdditionalWalking({
      totalSteps: 10_000,
      runningSteps: 3_000,
      includedBaseSteps: 3_000,
      heightCm: 175,
      weightKg: 70,
      kcalPerKgPerKm: 0.5,
    });

    expect(result.nonRunningSteps).toBe(7_000);
    expect(result.additionalSteps).toBe(4_000);
    expect(result.additionalDistanceKm).toBeCloseTo(2.891, 6);
    expect(result.caloriesKcal).toBeCloseTo(101.185, 6);
  });

  it('ne produit aucune calorie sous le seuil inclus', () => {
    const result = calculateAdditionalWalking({
      totalSteps: 5_000,
      runningSteps: 2_500,
      includedBaseSteps: 3_000,
      heightCm: 175,
      weightKg: 70,
      kcalPerKgPerKm: 0.5,
    });

    expect(result.additionalSteps).toBe(0);
    expect(result.caloriesKcal).toBe(0);
  });

  it('borne les pas hors course à zéro', () => {
    const result = calculateAdditionalWalking({
      totalSteps: 4_000,
      runningSteps: 6_000,
      includedBaseSteps: 3_000,
      heightCm: 175,
      weightKg: 70,
      kcalPerKgPerKm: 0.5,
    });

    expect(result.nonRunningSteps).toBe(0);
    expect(result.additionalSteps).toBe(0);
  });

  it('refuse un nombre de pas décimal', () => {
    expect(() => calculateAdditionalWalking({
      totalSteps: 10_000.5,
      runningSteps: 0,
      includedBaseSteps: 3_000,
      heightCm: 175,
      weightKg: 70,
      kcalPerKgPerKm: 0.5,
    })).toThrow('nombre entier');
  });
});
