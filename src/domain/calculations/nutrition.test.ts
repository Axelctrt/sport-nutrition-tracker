import type { FoodEntry, NutritionValues } from '@/domain/models/food';
import {
  addNutritionValues,
  calculateDailyNutrition,
  calculateFoodEntryNutrition,
  calculateRemainingNutrition,
  normalizeProductAmount,
  scaleNutritionValues,
} from '@/domain/calculations/nutrition';

const per100: NutritionValues = {
  caloriesKcal: 200,
  proteinGrams: 10,
  carbohydratesGrams: 30,
  fatGrams: 5,
  fiberGrams: 4,
  saltGrams: 1,
};

function createProductEntry(amount: number): FoodEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: '2026-06-23T10:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
    date: '2026-06-23',
    mealId: 'meal-1',
    mealSlot: 'lunch',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: 'product-1',
      inputMode: 'amount',
      inputQuantity: amount,
      normalizedAmount: amount,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: per100,
    },
  };
}

describe('calculs nutritionnels', () => {
  it('calcule les valeurs consommées pour 150 g', () => {
    expect(calculateFoodEntryNutrition(createProductEntry(150))).toEqual({
      caloriesKcal: 300,
      proteinGrams: 15,
      carbohydratesGrams: 45,
      fatGrams: 7.5,
      fiberGrams: 6,
      saltGrams: 1.5,
    });
  });

  it('additionne les valeurs nutritionnelles facultatives', () => {
    expect(
      addNutritionValues(
        { caloriesKcal: 100, proteinGrams: 5, carbohydratesGrams: 10, fatGrams: 2 },
        { caloriesKcal: 50, proteinGrams: 2, carbohydratesGrams: 5, fatGrams: 1, fiberGrams: 3 },
      ),
    ).toEqual({
      caloriesKcal: 150,
      proteinGrams: 7,
      carbohydratesGrams: 15,
      fatGrams: 3,
      fiberGrams: 3,
    });
  });

  it('agrège toutes les entrées de la journée', () => {
    const summary = calculateDailyNutrition([
      createProductEntry(100),
      createProductEntry(50),
    ]);

    expect(summary.entryCount).toBe(2);
    expect(summary.caloriesKcal).toBe(300);
    expect(summary.proteinGrams).toBe(15);
  });

  it('calcule les objectifs restants sans les borner à zéro', () => {
    expect(
      calculateRemainingNutrition(
        2_000,
        { proteinGrams: 120, carbohydratesGrams: 250, fatGrams: 60 },
        { caloriesKcal: 2_100, proteinGrams: 130, carbohydratesGrams: 230, fatGrams: 65 },
      ),
    ).toEqual({
      caloriesKcal: -100,
      proteinGrams: -10,
      carbohydratesGrams: 20,
      fatGrams: -5,
    });
  });

  it('convertit un nombre de portions en quantité normalisée', () => {
    expect(normalizeProductAmount('servings', 1.5, 40)).toBe(60);
    expect(normalizeProductAmount('amount', 125, 40)).toBe(125);
  });

  it('refuse une portion sans taille de portion', () => {
    expect(() => normalizeProductAmount('servings', 1)).toThrow(
      'taille de portion',
    );
  });

  it('refuse les facteurs négatifs', () => {
    expect(() => scaleNutritionValues(per100, -1)).toThrow('positif ou nul');
  });
});
