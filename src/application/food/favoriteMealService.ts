import {
  ZERO_NUTRITION,
  addNutritionValues,
  scaleNutritionValues,
} from '@/domain/calculations/nutrition';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type {
  FavoriteMeal,
  FavoriteMealItem,
  FoodEntry,
  MealSlot,
  NutritionValues,
} from '@/domain/models/food';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { createEntityId } from '@/shared/utils/entities';

export interface FavoriteMealServiceDependencies {
  food: FoodRepository;
}

export interface FavoriteMealSummary {
  favoriteMeal: FavoriteMeal;
  totals: NutritionValues;
}

const defaultDependencies: FavoriteMealServiceDependencies = {
  food: repositories.food,
};

function itemFromEntry(entry: FoodEntry): FavoriteMealItem {
  if (entry.reference.sourceType === 'product') {
    return {
      id: createEntityId(),
      sourceType: 'product',
      productId: entry.reference.productId,
      inputMode: entry.reference.inputMode,
      inputQuantity: entry.reference.inputQuantity,
      normalizedAmount: entry.reference.normalizedAmount,
      normalizedUnit: entry.reference.normalizedUnit,
      nutritionPer100Snapshot: { ...entry.reference.nutritionPer100Snapshot },
    };
  }
  return {
    id: createEntityId(),
    sourceType: 'recipe',
    recipeId: entry.reference.recipeId,
    servingsConsumed: entry.reference.servingsConsumed,
    nutritionPerServingSnapshot: { ...entry.reference.nutritionPerServingSnapshot },
  };
}

export function calculateFavoriteMealNutrition(items: readonly FavoriteMealItem[]): NutritionValues {
  return items.reduce<NutritionValues>((total, item) => {
    const nutrition = item.sourceType === 'product'
      ? scaleNutritionValues(item.nutritionPer100Snapshot, item.normalizedAmount / 100)
      : scaleNutritionValues(item.nutritionPerServingSnapshot, item.servingsConsumed);
    return addNutritionValues(total, nutrition);
  }, ZERO_NUTRITION);
}

export async function saveMealAsFavorite(
  date: LocalDate,
  slot: MealSlot,
  name: string,
  dependencies: FavoriteMealServiceDependencies = defaultDependencies,
): Promise<FavoriteMeal> {
  const meals = await dependencies.food.listMealsByDate(date);
  const meal = meals.find((candidate) => candidate.slot === slot);
  if (!meal) throw new Error('Ce repas ne contient aucune entrée à enregistrer.');
  const entries = await dependencies.food.listEntriesByMeal(meal.id);
  if (entries.length === 0) throw new Error('Ce repas ne contient aucune entrée à enregistrer.');
  const cleanName = name.trim();
  if (cleanName.length < 2) throw new Error('Le nom du favori doit contenir au moins 2 caractères.');

  return dependencies.food.createFavoriteMeal({
    name: cleanName,
    defaultSlot: slot,
    items: entries.map(itemFromEntry),
  });
}

export async function listFavoriteMealSummaries(
  dependencies: FavoriteMealServiceDependencies = defaultDependencies,
): Promise<FavoriteMealSummary[]> {
  const favorites = await dependencies.food.listFavoriteMeals();
  return favorites.map((favoriteMeal) => ({
    favoriteMeal,
    totals: calculateFavoriteMealNutrition(favoriteMeal.items),
  }));
}

export async function applyFavoriteMeal(
  favoriteMealId: EntityId,
  date: LocalDate,
  slot: MealSlot,
  dependencies: FavoriteMealServiceDependencies = defaultDependencies,
): Promise<number> {
  const favorite = await dependencies.food.getFavoriteMealById(favoriteMealId);
  if (!favorite) throw new Error('Repas favori introuvable.');
  if (favorite.items.length === 0) throw new Error('Ce repas favori est vide.');

  const meal = await dependencies.food.getOrCreateMeal(date, slot);
  await Promise.all(favorite.items.map((item) => {
    if (item.sourceType === 'product') {
      return dependencies.food.createEntry({
        date,
        mealId: meal.id,
        mealSlot: slot,
        sourceType: 'product',
        reference: {
          sourceType: 'product',
          productId: item.productId,
          inputMode: item.inputMode,
          inputQuantity: item.inputQuantity,
          normalizedAmount: item.normalizedAmount,
          normalizedUnit: item.normalizedUnit,
          nutritionPer100Snapshot: { ...item.nutritionPer100Snapshot },
        },
      });
    }
    return dependencies.food.createEntry({
      date,
      mealId: meal.id,
      mealSlot: slot,
      sourceType: 'recipe',
      reference: {
        sourceType: 'recipe',
        recipeId: item.recipeId,
        servingsConsumed: item.servingsConsumed,
        nutritionPerServingSnapshot: { ...item.nutritionPerServingSnapshot },
      },
    });
  }));
  await dependencies.food.upsertJournalStatus({ date, isComplete: false });
  return favorite.items.length;
}

export async function deleteFavoriteMeal(
  favoriteMealId: EntityId,
  dependencies: FavoriteMealServiceDependencies = defaultDependencies,
): Promise<void> {
  await dependencies.food.deleteFavoriteMeal(favoriteMealId);
}
