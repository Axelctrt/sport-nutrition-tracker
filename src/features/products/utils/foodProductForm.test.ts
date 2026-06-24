import {
  formValuesToProductInput,
  productToFormValues,
} from '@/features/products/utils/foodProductForm';
import type { FoodProduct } from '@/domain/models/food';

const product: FoodProduct = {
  id: 'product-1',
  createdAt: '2026-06-23T10:00:00.000Z',
  updatedAt: '2026-06-23T10:00:00.000Z',
  name: 'Yaourt',
  brand: 'Local',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 80,
    proteinGrams: 4,
    carbohydratesGrams: 10,
    fatGrams: 2,
  },
  servingSize: 125,
  source: { type: 'manual' },
  isNutritionComplete: true,
  isFavorite: false,
  isArchived: false,
};

describe('conversion formulaire produit', () => {
  it('convertit un produit vers le formulaire', () => {
    expect(productToFormValues(product)).toMatchObject({
      name: 'Yaourt',
      brand: 'Local',
      servingSize: 125,
    });
  });

  it('nettoie les champs facultatifs vides', () => {
    const input = formValuesToProductInput({
      ...productToFormValues(product),
      brand: ' ',
      barcode: '',
      servingSize: undefined,
    });

    expect(input).not.toHaveProperty('brand');
    expect(input).not.toHaveProperty('barcode');
    expect(input).not.toHaveProperty('servingSize');
  });
});
