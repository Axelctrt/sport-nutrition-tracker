import type { FavoriteMealSummary } from '@/application/food/favoriteMealService';
import type { RecipeSummary } from '@/application/recipes/recipeService';
import type { FavoriteMeal, FoodProduct, NutritionValues } from '@/domain/models/food';
import type { Recipe } from '@/domain/models/recipe';
import { createEntity } from '@/shared/utils/entities';

const nutrition: NutritionValues = {
  caloriesKcal: 120,
  proteinGrams: 8,
  carbohydratesGrams: 14,
  fatGrams: 4,
  fiberGrams: 2,
  saltGrams: 0.2,
};

export function createFoodProduct(overrides: Partial<FoodProduct> = {}): FoodProduct {
  const base = createEntity<FoodProduct>({
    name: 'Yaourt grec',
    brand: 'SportPilot',
    basisUnit: 'g',
    nutritionPer100: { ...nutrition },
    servingSize: 125,
    source: { type: 'manual' },
    isNutritionComplete: true,
    isFavorite: false,
    isArchived: false,
  }, overrides.id ?? 'product-1');
  return { ...base, ...overrides };
}

export function createRecipeSummary(overrides: Partial<RecipeSummary> = {}): RecipeSummary {
  const recipe = createEntity<Recipe>({
    name: 'Bowl protéiné',
    numberOfServings: 2,
    notes: 'Servir frais.',
  }, 'recipe-1');
  return {
    recipe,
    ingredientCount: 3,
    totalNutrition: {
      caloriesKcal: 600,
      proteinGrams: 40,
      carbohydratesGrams: 70,
      fatGrams: 18,
    },
    nutritionPerServing: {
      caloriesKcal: 300,
      proteinGrams: 20,
      carbohydratesGrams: 35,
      fatGrams: 9,
    },
    ...overrides,
  };
}

export function createFavoriteMealSummary(overrides: Partial<FavoriteMealSummary> = {}): FavoriteMealSummary {
  const favoriteMeal = createEntity<FavoriteMeal>({
    name: 'Petit-déjeuner habituel',
    defaultSlot: 'breakfast',
    items: [
      {
        id: 'favorite-item-1',
        sourceType: 'product',
        productId: 'product-1',
        inputMode: 'amount',
        inputQuantity: 125,
        normalizedAmount: 125,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: { ...nutrition },
      },
    ],
  }, 'favorite-1');
  return {
    favoriteMeal,
    totals: {
      caloriesKcal: 150,
      proteinGrams: 10,
      carbohydratesGrams: 17.5,
      fatGrams: 5,
    },
    ...overrides,
  };
}
