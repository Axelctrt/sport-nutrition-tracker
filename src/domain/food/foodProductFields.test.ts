import { describe, expect, it } from 'vitest';
import type { FoodProduct } from '@/domain/models/food';
import {
  collectFoodProductLocalOverrides,
  mergeRemoteFoodProductFields,
} from '@/domain/food/foodProductFields';

const base: Pick<FoodProduct, 'name' | 'brand' | 'basisUnit' | 'nutritionPer100' | 'servingSize' | 'servingLabel'> = {
  name: 'Yaourt nature',
  brand: 'Exemple',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 60,
    proteinGrams: 4,
    carbohydratesGrams: 5,
    fatGrams: 2,
    fiberGrams: 0,
    saltGrams: 0.1,
  },
  servingSize: 125,
  servingLabel: '1 pot',
};

describe('foodProductFields', () => {
  it('détecte uniquement les champs corrigés localement', () => {
    expect(collectFoodProductLocalOverrides(base, {
      ...base,
      name: 'Mon yaourt',
      nutritionPer100: { ...base.nutritionPer100, saltGrams: 0.2 },
    })).toEqual(['name', 'saltGrams']);
  });

  it('préserve les corrections choisies lors de la fusion distante', () => {
    const remote = {
      ...base,
      name: 'Yaourt mis à jour',
      nutritionPer100: { ...base.nutritionPer100, caloriesKcal: 65, saltGrams: 0.3 },
      servingLabel: 'Pot 125 g',
    };
    const merged = mergeRemoteFoodProductFields(base, remote, ['name', 'saltGrams']);
    expect(merged.name).toBe('Yaourt nature');
    expect(merged.nutritionPer100.caloriesKcal).toBe(65);
    expect(merged.nutritionPer100.saltGrams).toBe(0.1);
    expect(merged.servingLabel).toBe('Pot 125 g');
  });
});
