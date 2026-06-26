import { foodProductFormSchema } from '@/features/products/schemas/foodProductSchema';

const validValues = {
  name: 'Flocons d’avoine',
  brand: '',
  basisUnit: 'g' as const,
  caloriesKcal: 370,
  proteinGrams: 13,
  carbohydratesGrams: 60,
  fatGrams: 7,
  fiberGrams: 10,
  saltGrams: 0.02,
  servingSize: 50,
  servingLabel: '1 bol',
  barcode: '',
  isFavorite: true,
};

describe('foodProductFormSchema', () => {
  it('valide un produit manuel complet', () => {
    expect(foodProductFormSchema.safeParse(validValues).success).toBe(true);
  });

  it('refuse un nom vide', () => {
    const result = foodProductFormSchema.safeParse({ ...validValues, name: ' ' });
    expect(result.success).toBe(false);
  });

  it('refuse des macronutriments négatifs', () => {
    const result = foodProductFormSchema.safeParse({ ...validValues, proteinGrams: -1 });
    expect(result.success).toBe(false);
  });

  it('accepte les champs facultatifs absents', () => {
    const result = foodProductFormSchema.safeParse({
      ...validValues,
      fiberGrams: undefined,
      saltGrams: undefined,
      servingSize: undefined,
      servingLabel: '',
    });
    expect(result.success).toBe(true);
  });
});
