import { CalculationError } from '@/domain/errors/CalculationError';
import type { NutritionValues } from '@/domain/models/food';
import type { RecipeIngredient } from '@/domain/models/recipe';
import {
  ZERO_NUTRITION,
  addNutritionValues,
  scaleNutritionValues,
} from '@/domain/calculations/nutrition';

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CalculationError(`${label} doit être supérieur à zéro.`);
  }
}

export function calculateRecipeIngredientNutrition(
  ingredient: Pick<RecipeIngredient, 'quantity' | 'nutritionPer100Snapshot'>,
): NutritionValues {
  assertPositive(ingredient.quantity, 'La quantité de l’ingrédient');
  return scaleNutritionValues(
    ingredient.nutritionPer100Snapshot,
    ingredient.quantity / 100,
  );
}

export function calculateRecipeTotalNutrition(
  ingredients: readonly Pick<RecipeIngredient, 'quantity' | 'nutritionPer100Snapshot'>[],
): NutritionValues {
  if (ingredients.length === 0) {
    throw new CalculationError('Une recette doit contenir au moins un ingrédient.');
  }

  return ingredients.reduce<NutritionValues>(
    (total, ingredient) =>
      addNutritionValues(total, calculateRecipeIngredientNutrition(ingredient)),
    ZERO_NUTRITION,
  );
}

export function calculateRecipeNutritionPerServing(
  ingredients: readonly Pick<RecipeIngredient, 'quantity' | 'nutritionPer100Snapshot'>[],
  numberOfServings: number,
): NutritionValues {
  assertPositive(numberOfServings, 'Le nombre de portions');
  return scaleNutritionValues(
    calculateRecipeTotalNutrition(ingredients),
    1 / numberOfServings,
  );
}
