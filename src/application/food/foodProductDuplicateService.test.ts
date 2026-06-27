import { describe, expect, it } from 'vitest';
import { findFoodProductDuplicates } from '@/application/food/foodProductDuplicateService';
import type { FoodProduct } from '@/domain/models/food';

const product: FoodProduct = {
  id: 'food-1',
  createdAt: '2026-06-26T10:00:00.000Z',
  updatedAt: '2026-06-26T10:00:00.000Z',
  name: 'Crème dessert chocolat',
  brand: 'Délice & Co',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 120,
    proteinGrams: 3,
    carbohydratesGrams: 18,
    fatGrams: 4,
  },
  barcode: '0012345678905',
  source: { type: 'manual' },
  isNutritionComplete: true,
  isFavorite: false,
  isArchived: false,
};

describe('findFoodProductDuplicates', () => {
  it('détecte un même code-barres normalisé', () => {
    expect(findFoodProductDuplicates({
      name: 'Autre nom',
      barcode: '12345678905',
    }, [product])).toEqual([{ product, reason: 'barcode' }]);
  });

  it('détecte un même nom et une même marque malgré les accents', () => {
    expect(findFoodProductDuplicates({
      name: 'creme dessert chocolat',
      brand: 'Delice & Co',
    }, [product])).toEqual([{ product, reason: 'name-and-brand' }]);
  });
});
