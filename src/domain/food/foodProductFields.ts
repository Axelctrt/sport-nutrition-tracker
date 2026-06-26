import type {
  FoodProduct,
  FoodProductLocalOverrideField,
  NutritionValues,
} from '@/domain/models/food';

export const foodProductLocalOverrideFields: readonly FoodProductLocalOverrideField[] = [
  'name',
  'brand',
  'basisUnit',
  'caloriesKcal',
  'proteinGrams',
  'carbohydratesGrams',
  'fatGrams',
  'fiberGrams',
  'saltGrams',
  'servingSize',
  'servingLabel',
];

type EditableFoodProduct = Pick<
  FoodProduct,
  'name' | 'brand' | 'basisUnit' | 'nutritionPer100' | 'servingSize' | 'servingLabel'
>;

function sameOptionalNumber(left: number | undefined, right: number | undefined): boolean {
  if (left === undefined || right === undefined) return left === right;
  return Math.abs(left - right) < 0.000_001;
}

function sameOptionalText(left: string | undefined, right: string | undefined): boolean {
  return (left?.trim() || undefined) === (right?.trim() || undefined);
}

function getNutritionValue(
  nutrition: NutritionValues,
  field: Extract<FoodProductLocalOverrideField, keyof NutritionValues>,
): number | undefined {
  return nutrition[field];
}

export function didFoodProductFieldChange(
  current: EditableFoodProduct,
  updated: EditableFoodProduct,
  field: FoodProductLocalOverrideField,
): boolean {
  switch (field) {
    case 'name':
      return current.name.trim() !== updated.name.trim();
    case 'brand':
      return !sameOptionalText(current.brand, updated.brand);
    case 'basisUnit':
      return current.basisUnit !== updated.basisUnit;
    case 'servingSize':
      return !sameOptionalNumber(current.servingSize, updated.servingSize);
    case 'servingLabel':
      return !sameOptionalText(current.servingLabel, updated.servingLabel);
    default:
      return !sameOptionalNumber(
        getNutritionValue(current.nutritionPer100, field),
        getNutritionValue(updated.nutritionPer100, field),
      );
  }
}

export function collectFoodProductLocalOverrides(
  current: EditableFoodProduct,
  updated: EditableFoodProduct,
  existingOverrides: readonly FoodProductLocalOverrideField[] = [],
): FoodProductLocalOverrideField[] {
  const overrides = new Set(existingOverrides);
  for (const field of foodProductLocalOverrideFields) {
    if (didFoodProductFieldChange(current, updated, field)) overrides.add(field);
  }
  return foodProductLocalOverrideFields.filter((field) => overrides.has(field));
}

function preserveOptionalText(
  preserve: boolean,
  current: string | undefined,
  remote: string | undefined,
): string | undefined {
  return preserve ? current : remote;
}

function preserveOptionalNumber(
  preserve: boolean,
  current: number | undefined,
  remote: number | undefined,
): number | undefined {
  return preserve ? current : remote;
}

export function mergeRemoteFoodProductFields(
  current: EditableFoodProduct,
  remote: EditableFoodProduct,
  localOverrides: readonly FoodProductLocalOverrideField[],
): EditableFoodProduct {
  const overrides = new Set(localOverrides);
  const nutritionPer100: NutritionValues = {
    caloriesKcal: overrides.has('caloriesKcal')
      ? current.nutritionPer100.caloriesKcal
      : remote.nutritionPer100.caloriesKcal,
    proteinGrams: overrides.has('proteinGrams')
      ? current.nutritionPer100.proteinGrams
      : remote.nutritionPer100.proteinGrams,
    carbohydratesGrams: overrides.has('carbohydratesGrams')
      ? current.nutritionPer100.carbohydratesGrams
      : remote.nutritionPer100.carbohydratesGrams,
    fatGrams: overrides.has('fatGrams')
      ? current.nutritionPer100.fatGrams
      : remote.nutritionPer100.fatGrams,
  };

  const fiberGrams = preserveOptionalNumber(
    overrides.has('fiberGrams'),
    current.nutritionPer100.fiberGrams,
    remote.nutritionPer100.fiberGrams,
  );
  const saltGrams = preserveOptionalNumber(
    overrides.has('saltGrams'),
    current.nutritionPer100.saltGrams,
    remote.nutritionPer100.saltGrams,
  );
  if (fiberGrams !== undefined) nutritionPer100.fiberGrams = fiberGrams;
  if (saltGrams !== undefined) nutritionPer100.saltGrams = saltGrams;

  const brand = preserveOptionalText(overrides.has('brand'), current.brand, remote.brand);
  const servingLabel = preserveOptionalText(
    overrides.has('servingLabel'),
    current.servingLabel,
    remote.servingLabel,
  );
  const servingSize = preserveOptionalNumber(
    overrides.has('servingSize'),
    current.servingSize,
    remote.servingSize,
  );

  return {
    name: overrides.has('name') ? current.name : remote.name,
    basisUnit: overrides.has('basisUnit') ? current.basisUnit : remote.basisUnit,
    nutritionPer100,
    ...(brand === undefined ? {} : { brand }),
    ...(servingSize === undefined ? {} : { servingSize }),
    ...(servingLabel === undefined ? {} : { servingLabel }),
  };
}
