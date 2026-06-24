import type { FoodEntry, NutritionValues } from '@/domain/models/food';
import type { DailyMacroTargets } from '@/domain/models/targets';
import { CalculationError } from '@/domain/errors/CalculationError';

export interface DailyNutritionSummary extends NutritionValues {
  entryCount: number;
}

export interface RemainingNutrition {
  caloriesKcal: number;
  proteinGrams: number;
  carbohydratesGrams: number;
  fatGrams: number;
}

export const ZERO_NUTRITION: NutritionValues = {
  caloriesKcal: 0,
  proteinGrams: 0,
  carbohydratesGrams: 0,
  fatGrams: 0,
  fiberGrams: 0,
  saltGrams: 0,
};

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new CalculationError(`${label} doit être un nombre positif ou nul.`);
  }
}

export function validateNutritionValues(values: NutritionValues): void {
  assertFiniteNonNegative(values.caloriesKcal, 'Les calories');
  assertFiniteNonNegative(values.proteinGrams, 'Les protéines');
  assertFiniteNonNegative(values.carbohydratesGrams, 'Les glucides');
  assertFiniteNonNegative(values.fatGrams, 'Les lipides');

  if (values.fiberGrams !== undefined) {
    assertFiniteNonNegative(values.fiberGrams, 'Les fibres');
  }

  if (values.saltGrams !== undefined) {
    assertFiniteNonNegative(values.saltGrams, 'Le sel');
  }
}

export function scaleNutritionValues(
  values: NutritionValues,
  factor: number,
): NutritionValues {
  validateNutritionValues(values);
  assertFiniteNonNegative(factor, 'Le facteur de quantité');

  return {
    caloriesKcal: values.caloriesKcal * factor,
    proteinGrams: values.proteinGrams * factor,
    carbohydratesGrams: values.carbohydratesGrams * factor,
    fatGrams: values.fatGrams * factor,
    ...(values.fiberGrams === undefined
      ? {}
      : { fiberGrams: values.fiberGrams * factor }),
    ...(values.saltGrams === undefined
      ? {}
      : { saltGrams: values.saltGrams * factor }),
  };
}

export function addNutritionValues(
  left: NutritionValues,
  right: NutritionValues,
): NutritionValues {
  validateNutritionValues(left);
  validateNutritionValues(right);

  const fiberDefined = left.fiberGrams !== undefined || right.fiberGrams !== undefined;
  const saltDefined = left.saltGrams !== undefined || right.saltGrams !== undefined;

  return {
    caloriesKcal: left.caloriesKcal + right.caloriesKcal,
    proteinGrams: left.proteinGrams + right.proteinGrams,
    carbohydratesGrams: left.carbohydratesGrams + right.carbohydratesGrams,
    fatGrams: left.fatGrams + right.fatGrams,
    ...(fiberDefined
      ? { fiberGrams: (left.fiberGrams ?? 0) + (right.fiberGrams ?? 0) }
      : {}),
    ...(saltDefined
      ? { saltGrams: (left.saltGrams ?? 0) + (right.saltGrams ?? 0) }
      : {}),
  };
}

export function calculateFoodEntryNutrition(entry: FoodEntry): NutritionValues {
  if (entry.reference.sourceType === 'product') {
    const { normalizedAmount, nutritionPer100Snapshot } = entry.reference;
    assertFiniteNonNegative(normalizedAmount, 'La quantité normalisée');
    return scaleNutritionValues(nutritionPer100Snapshot, normalizedAmount / 100);
  }

  const { servingsConsumed, nutritionPerServingSnapshot } = entry.reference;
  assertFiniteNonNegative(servingsConsumed, 'Le nombre de portions');
  return scaleNutritionValues(nutritionPerServingSnapshot, servingsConsumed);
}

export function calculateDailyNutrition(
  entries: readonly FoodEntry[],
): DailyNutritionSummary {
  const totals = entries.reduce<NutritionValues>(
    (current, entry) => addNutritionValues(current, calculateFoodEntryNutrition(entry)),
    ZERO_NUTRITION,
  );

  return {
    ...totals,
    entryCount: entries.length,
  };
}

export function calculateRemainingNutrition(
  targetCaloriesKcal: number,
  targetMacros: DailyMacroTargets,
  consumed: NutritionValues,
): RemainingNutrition {
  assertFiniteNonNegative(targetCaloriesKcal, 'La cible calorique');
  validateNutritionValues(consumed);

  return {
    caloriesKcal: targetCaloriesKcal - consumed.caloriesKcal,
    proteinGrams: targetMacros.proteinGrams - consumed.proteinGrams,
    carbohydratesGrams:
      targetMacros.carbohydratesGrams - consumed.carbohydratesGrams,
    fatGrams: targetMacros.fatGrams - consumed.fatGrams,
  };
}

export function normalizeProductAmount(
  inputMode: 'amount' | 'servings',
  inputQuantity: number,
  servingSize?: number,
): number {
  assertFiniteNonNegative(inputQuantity, 'La quantité saisie');

  if (inputQuantity === 0) {
    throw new CalculationError('La quantité saisie doit être supérieure à zéro.');
  }

  if (inputMode === 'amount') {
    return inputQuantity;
  }

  if (servingSize === undefined || !Number.isFinite(servingSize) || servingSize <= 0) {
    throw new CalculationError(
      'Cet aliment ne possède pas de taille de portion exploitable.',
    );
  }

  return inputQuantity * servingSize;
}
