import { describe, expect, it } from 'vitest';
import { calculateMacroTargets } from '@/domain/calculations/macros';

 describe('objectifs de macronutriments', () => {
  it('calcule puis arrondit protéines, lipides et glucides', () => {
    const result = calculateMacroTargets({
      targetCaloriesKcal: 2_400,
      weightKg: 70,
      proteinGramsPerKg: 1.8,
      fatGramsPerKg: 0.9,
    });

    expect(result.macros).toEqual({
      proteinGrams: 125,
      carbohydratesGrams: 330,
      fatGrams: 65,
    });
    expect(result.fixedMacroCaloriesKcal).toBe(1_085);
    expect(result.remainingCaloriesForCarbohydratesKcal).toBe(1_315);
    expect(result.carbohydratesClampedToZero).toBe(false);
  });

  it('ne retourne jamais de glucides négatifs', () => {
    const result = calculateMacroTargets({
      targetCaloriesKcal: 500,
      weightKg: 70,
      proteinGramsPerKg: 1.8,
      fatGramsPerKg: 0.9,
    });

    expect(result.macros.carbohydratesGrams).toBe(0);
    expect(result.remainingCaloriesForCarbohydratesKcal).toBe(0);
    expect(result.carbohydratesClampedToZero).toBe(true);
  });

  it('arrondit correctement une cible protéique intermédiaire', () => {
    const result = calculateMacroTargets({
      targetCaloriesKcal: 2_300,
      weightKg: 72,
      proteinGramsPerKg: 1.8,
      fatGramsPerKg: 0.9,
    });

    expect(result.macros.proteinGrams).toBe(130);
    expect(result.macros.fatGrams).toBe(65);
  });

  it('refuse une cible calorique négative', () => {
    expect(() => calculateMacroTargets({
      targetCaloriesKcal: -100,
      weightKg: 70,
      proteinGramsPerKg: 1.8,
      fatGramsPerKg: 0.9,
    })).toThrow('ne peut pas être négatif');
  });
});
