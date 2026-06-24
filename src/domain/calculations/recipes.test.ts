import type { RecipeIngredient } from '@/domain/models/recipe';
import {
  calculateRecipeIngredientNutrition,
  calculateRecipeNutritionPerServing,
  calculateRecipeTotalNutrition,
} from '@/domain/calculations/recipes';

const rice: RecipeIngredient = {
  id: 'ingredient-rice',
  recipeId: 'recipe-1',
  productId: 'rice',
  quantity: 200,
  unit: 'g',
  sortOrder: 0,
  nutritionPer100Snapshot: {
    caloriesKcal: 130,
    proteinGrams: 2.7,
    carbohydratesGrams: 28,
    fatGrams: 0.3,
  },
  createdAt: '2026-06-23T10:00:00.000Z',
  updatedAt: '2026-06-23T10:00:00.000Z',
};

const chicken: RecipeIngredient = {
  ...rice,
  id: 'ingredient-chicken',
  productId: 'chicken',
  quantity: 100,
  sortOrder: 1,
  nutritionPer100Snapshot: {
    caloriesKcal: 165,
    proteinGrams: 31,
    carbohydratesGrams: 0,
    fatGrams: 3.6,
  },
};

describe('calculs de recettes', () => {
  it('calcule les valeurs d’un ingrédient selon sa quantité', () => {
    expect(calculateRecipeIngredientNutrition(rice)).toMatchObject({
      caloriesKcal: 260,
      proteinGrams: 5.4,
      carbohydratesGrams: 56,
      fatGrams: 0.6,
    });
  });

  it('additionne tous les ingrédients', () => {
    expect(calculateRecipeTotalNutrition([rice, chicken])).toMatchObject({
      caloriesKcal: 425,
      proteinGrams: 36.4,
      carbohydratesGrams: 56,
      fatGrams: 4.2,
    });
  });

  it('calcule les valeurs par portion', () => {
    expect(calculateRecipeNutritionPerServing([rice, chicken], 2)).toMatchObject({
      caloriesKcal: 212.5,
      proteinGrams: 18.2,
      carbohydratesGrams: 28,
      fatGrams: 2.1,
    });
  });

  it('refuse une recette vide ou un nombre de portions nul', () => {
    expect(() => calculateRecipeTotalNutrition([])).toThrow('au moins un ingrédient');
    expect(() => calculateRecipeNutritionPerServing([rice], 0)).toThrow('supérieur à zéro');
  });
});
