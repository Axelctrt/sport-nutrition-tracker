import type { IsoDateTime } from '@/domain/models/common';
import type { FoodBasisUnit, NutritionValues } from '@/domain/models/food';
import type { OpenFoodFactsRawProduct } from '@/infrastructure/open-food-facts/OpenFoodFactsSchemas';

export type RequiredNutritionField =
  | 'caloriesKcal'
  | 'proteinGrams'
  | 'carbohydratesGrams'
  | 'fatGrams';

export interface OpenFoodFactsProductCandidate {
  barcode: string;
  name: string;
  brand?: string;
  basisUnit: FoodBasisUnit;
  nutritionPer100: NutritionValues;
  servingSize?: number;
  servingLabel?: string;
  isNutritionComplete: boolean;
  missingNutritionFields: RequiredNutritionField[];
  fetchedAt: IsoDateTime;
}

const KILOJOULES_PER_KILOCALORIE = 4.184;

function sanitizeNonNegative(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

function firstDefined(...values: Array<number | undefined>): number | undefined {
  return values.find((value) => value !== undefined);
}

function inferBasisUnit(product: OpenFoodFactsRawProduct): FoodBasisUnit {
  const nutritionDataPer = product.nutrition_data_per?.toLocaleLowerCase('fr');
  const productUnit = product.product_quantity_unit?.toLocaleLowerCase('fr');
  const servingUnit = product.serving_quantity_unit?.toLocaleLowerCase('fr');

  if (nutritionDataPer?.includes('ml') || productUnit === 'ml' || servingUnit === 'ml') {
    return 'ml';
  }

  return 'g';
}

function pickNutrient(
  product: OpenFoodFactsRawProduct,
  basisUnit: FoodBasisUnit,
  gramsKey: keyof NonNullable<OpenFoodFactsRawProduct['nutriments']>,
  millilitersKey: keyof NonNullable<OpenFoodFactsRawProduct['nutriments']>,
): number | undefined {
  const nutriments = product.nutriments;
  if (!nutriments) return undefined;

  const preferred = basisUnit === 'ml' ? nutriments[millilitersKey] : nutriments[gramsKey];
  const fallback = basisUnit === 'ml' ? nutriments[gramsKey] : nutriments[millilitersKey];

  return sanitizeNonNegative(firstDefined(
    typeof preferred === 'number' ? preferred : undefined,
    typeof fallback === 'number' ? fallback : undefined,
  ));
}

function readCalories(
  product: OpenFoodFactsRawProduct,
  basisUnit: FoodBasisUnit,
): number | undefined {
  const kcal = pickNutrient(
    product,
    basisUnit,
    'energy-kcal_100g',
    'energy-kcal_100ml',
  );

  if (kcal !== undefined) return kcal;

  const kilojoules = pickNutrient(product, basisUnit, 'energy_100g', 'energy_100ml');
  return kilojoules === undefined ? undefined : kilojoules / KILOJOULES_PER_KILOCALORIE;
}

function parseServingSize(product: OpenFoodFactsRawProduct, basisUnit: FoodBasisUnit): number | undefined {
  const explicitQuantity = sanitizeNonNegative(product.serving_quantity);
  const explicitUnit = product.serving_quantity_unit?.toLocaleLowerCase('fr');

  if (
    explicitQuantity !== undefined
    && (explicitUnit === undefined || explicitUnit === basisUnit)
    && explicitQuantity > 0
  ) {
    return explicitQuantity;
  }

  const servingSize = product.serving_size?.trim();
  if (!servingSize) return undefined;

  const normalized = servingSize.replace(',', '.').toLocaleLowerCase('fr');
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(g|ml)\b/);
  if (!match || match[2] !== basisUnit) return undefined;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function cleanText(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned : undefined;
}

export function mapOpenFoodFactsProduct(
  product: OpenFoodFactsRawProduct,
  fallbackBarcode?: string,
  fetchedAt: IsoDateTime = new Date().toISOString(),
): OpenFoodFactsProductCandidate | undefined {
  const barcode = cleanText(product.code) ?? cleanText(fallbackBarcode);
  if (!barcode) return undefined;

  const name = cleanText(product.product_name_fr)
    ?? cleanText(product.product_name)
    ?? cleanText(product.generic_name_fr)
    ?? cleanText(product.generic_name)
    ?? `Produit ${barcode}`;
  const brand = cleanText(product.brands);
  const basisUnit = inferBasisUnit(product);

  const caloriesKcal = readCalories(product, basisUnit);
  const proteinGrams = pickNutrient(product, basisUnit, 'proteins_100g', 'proteins_100ml');
  const carbohydratesGrams = pickNutrient(
    product,
    basisUnit,
    'carbohydrates_100g',
    'carbohydrates_100ml',
  );
  const fatGrams = pickNutrient(product, basisUnit, 'fat_100g', 'fat_100ml');
  const fiberGrams = pickNutrient(product, basisUnit, 'fiber_100g', 'fiber_100ml');
  const saltGrams = pickNutrient(product, basisUnit, 'salt_100g', 'salt_100ml');

  const requiredValues: Record<RequiredNutritionField, number | undefined> = {
    caloriesKcal,
    proteinGrams,
    carbohydratesGrams,
    fatGrams,
  };
  const missingNutritionFields = (Object.entries(requiredValues) as Array<
    [RequiredNutritionField, number | undefined]
  >)
    .filter(([, value]) => value === undefined)
    .map(([field]) => field);

  const nutritionPer100: NutritionValues = {
    caloriesKcal: caloriesKcal ?? 0,
    proteinGrams: proteinGrams ?? 0,
    carbohydratesGrams: carbohydratesGrams ?? 0,
    fatGrams: fatGrams ?? 0,
    ...(fiberGrams === undefined ? {} : { fiberGrams }),
    ...(saltGrams === undefined ? {} : { saltGrams }),
  };

  const servingSize = parseServingSize(product, basisUnit);
  const servingLabel = cleanText(product.serving_size);

  return {
    barcode,
    name,
    ...(brand === undefined ? {} : { brand }),
    basisUnit,
    nutritionPer100,
    ...(servingSize === undefined ? {} : { servingSize }),
    ...(servingLabel === undefined ? {} : { servingLabel }),
    isNutritionComplete: missingNutritionFields.length === 0,
    missingNutritionFields,
    fetchedAt,
  };
}
