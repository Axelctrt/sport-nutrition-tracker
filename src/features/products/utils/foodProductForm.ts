import type { NewEntity } from '@/domain/models/common';
import type { FoodProduct } from '@/domain/models/food';
import type { FoodProductFormValues } from '@/features/products/schemas/foodProductSchema';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';

export const defaultFoodProductFormValues: FoodProductFormValues = {
  name: '',
  brand: '',
  basisUnit: 'g',
  caloriesKcal: 0,
  proteinGrams: 0,
  carbohydratesGrams: 0,
  fatGrams: 0,
  fiberGrams: undefined,
  saltGrams: undefined,
  servingSize: undefined,
  servingLabel: '',
  barcode: '',
  isFavorite: false,
};

export function productToFormValues(product: FoodProduct): FoodProductFormValues {
  return {
    name: product.name,
    brand: product.brand ?? '',
    basisUnit: product.basisUnit,
    caloriesKcal: product.nutritionPer100.caloriesKcal,
    proteinGrams: product.nutritionPer100.proteinGrams,
    carbohydratesGrams: product.nutritionPer100.carbohydratesGrams,
    fatGrams: product.nutritionPer100.fatGrams,
    fiberGrams: product.nutritionPer100.fiberGrams,
    saltGrams: product.nutritionPer100.saltGrams,
    servingSize: product.servingSize,
    servingLabel: product.servingLabel ?? '',
    barcode: product.barcode ?? '',
    isFavorite: product.isFavorite,
  };
}

export function formValuesToProductInput(
  values: FoodProductFormValues,
): NewEntity<FoodProduct> {
  const brand = values.brand.trim();
  const barcode = values.barcode.trim();
  const servingLabel = values.servingLabel.trim();
  const normalizedBarcode = barcode.length > 0
    ? normalizeOpenFoodFactsBarcode(barcode)
    : undefined;

  return {
    name: values.name.trim(),
    ...(brand.length > 0 ? { brand } : {}),
    basisUnit: values.basisUnit,
    nutritionPer100: {
      caloriesKcal: values.caloriesKcal,
      proteinGrams: values.proteinGrams,
      carbohydratesGrams: values.carbohydratesGrams,
      fatGrams: values.fatGrams,
      ...(values.fiberGrams === undefined ? {} : { fiberGrams: values.fiberGrams }),
      ...(values.saltGrams === undefined ? {} : { saltGrams: values.saltGrams }),
    },
    ...(values.servingSize === undefined ? {} : { servingSize: values.servingSize }),
    ...(servingLabel.length === 0 ? {} : { servingLabel }),
    ...(normalizedBarcode === undefined ? {} : { barcode: normalizedBarcode }),
    source: { type: 'manual' },
    isNutritionComplete: true,
    isFavorite: values.isFavorite,
    isArchived: false,
  };
}
