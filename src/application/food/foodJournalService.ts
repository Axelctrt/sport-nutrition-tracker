import {
  calculateDailyNutrition,
  calculateFoodEntryNutrition,
  normalizeProductAmount,
  type DailyNutritionSummary,
} from '@/domain/calculations/nutrition';
import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type {
  DailyJournalStatus,
  FoodEntry,
  FoodEntryReference,
  FoodProduct,
  Meal,
  MealSlot,
  NutritionValues,
} from '@/domain/models/food';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { RecipeRepository } from '@/infrastructure/repositories/contracts/RecipeRepository';
import type { Recipe } from '@/domain/models/recipe';
import { repositories } from '@/infrastructure/repositories/repositories';

export const MEAL_SLOTS: readonly MealSlot[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
];

export interface FoodEntryWithProduct {
  entry: FoodEntry;
  product: FoodProduct | undefined;
  recipe: Recipe | undefined;
  nutrition: NutritionValues;
}

export interface MealJournalSnapshot {
  slot: MealSlot;
  meal: Meal | undefined;
  entries: FoodEntryWithProduct[];
  totals: DailyNutritionSummary;
}

export interface FoodJournalSnapshot {
  date: LocalDate;
  meals: MealJournalSnapshot[];
  entries: FoodEntry[];
  totals: DailyNutritionSummary;
  status: DailyJournalStatus | undefined;
}

export interface SaveProductEntryInput {
  entryId?: EntityId;
  date: LocalDate;
  mealSlot: MealSlot;
  productId: EntityId;
  inputMode: 'amount' | 'servings';
  inputQuantity: number;
}

export interface CopyMealInput {
  sourceDate: LocalDate;
  sourceSlot: MealSlot;
  targetDate: LocalDate;
  targetSlot: MealSlot;
}

export interface FoodJournalServiceDependencies {
  food: FoodRepository;
  recipes?: RecipeRepository;
}

const defaultDependencies: FoodJournalServiceDependencies = {
  food: repositories.food,
  recipes: repositories.recipes,
};

function cloneReference(reference: FoodEntryReference): FoodEntryReference {
  if (reference.sourceType === 'product') {
    return {
      ...reference,
      nutritionPer100Snapshot: { ...reference.nutritionPer100Snapshot },
    };
  }

  return {
    ...reference,
    nutritionPerServingSnapshot: { ...reference.nutritionPerServingSnapshot },
  };
}

async function markJournalIncomplete(
  date: LocalDate,
  dependencies: FoodJournalServiceDependencies,
): Promise<void> {
  await dependencies.food.upsertJournalStatus({
    date,
    isComplete: false,
  });
}

export async function loadFoodJournal(
  date: LocalDate,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<FoodJournalSnapshot> {
  const [meals, entries, products, recipes, status] = await Promise.all([
    dependencies.food.listMealsByDate(date),
    dependencies.food.listEntriesByDate(date),
    dependencies.food.listProducts(true),
    dependencies.recipes?.listAll() ?? Promise.resolve([]),
    dependencies.food.getJournalStatus(date),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const mealBySlot = new Map(meals.map((meal) => [meal.slot, meal]));

  const mealSnapshots = MEAL_SLOTS.map((slot): MealJournalSnapshot => {
    const slotEntries = entries
      .filter((entry) => entry.mealSlot === slot)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    return {
      slot,
      meal: mealBySlot.get(slot),
      entries: slotEntries.map((entry) => ({
        entry,
        product:
          entry.reference.sourceType === 'product'
            ? productById.get(entry.reference.productId)
            : undefined,
        recipe:
          entry.reference.sourceType === 'recipe'
            ? recipeById.get(entry.reference.recipeId)
            : undefined,
        nutrition: calculateFoodEntryNutrition(entry),
      })),
      totals: calculateDailyNutrition(slotEntries),
    };
  });

  return {
    date,
    meals: mealSnapshots,
    entries,
    totals: calculateDailyNutrition(entries),
    status,
  };
}

export async function saveProductEntry(
  input: SaveProductEntryInput,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<FoodEntry> {
  const product = await dependencies.food.getProductById(input.productId);

  if (!product || product.isArchived) {
    throw new Error('L’aliment sélectionné est introuvable ou archivé.');
  }

  const normalizedAmount = normalizeProductAmount(
    input.inputMode,
    input.inputQuantity,
    product.servingSize,
  );
  const meal = await dependencies.food.getOrCreateMeal(input.date, input.mealSlot);
  const reference: FoodEntryReference = {
    sourceType: 'product',
    productId: product.id,
    inputMode: input.inputMode,
    inputQuantity: input.inputQuantity,
    normalizedAmount,
    normalizedUnit: product.basisUnit,
    nutritionPer100Snapshot: { ...product.nutritionPer100 },
  };

  const previousEntry = input.entryId
    ? await dependencies.food.getEntryById(input.entryId)
    : undefined;

  if (input.entryId && !previousEntry) {
    throw new Error('L’entrée alimentaire à modifier est introuvable.');
  }

  const entry = input.entryId
    ? await dependencies.food.updateEntry(input.entryId, {
        date: input.date,
        mealId: meal.id,
        mealSlot: input.mealSlot,
        sourceType: 'product',
        reference,
      })
    : await dependencies.food.createEntry({
        date: input.date,
        mealId: meal.id,
        mealSlot: input.mealSlot,
        sourceType: 'product',
        reference,
      });

  await markJournalIncomplete(input.date, dependencies);
  if (previousEntry && previousEntry.date !== input.date) {
    await markJournalIncomplete(previousEntry.date, dependencies);
  }
  return entry;
}

export async function duplicateFoodEntry(
  entryId: EntityId,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<FoodEntry> {
  const source = await dependencies.food.getEntryById(entryId);

  if (!source) {
    throw new Error('L’entrée alimentaire à dupliquer est introuvable.');
  }

  const duplicate = await dependencies.food.createEntry({
    date: source.date,
    mealId: source.mealId,
    mealSlot: source.mealSlot,
    sourceType: source.sourceType,
    reference: cloneReference(source.reference),
  });
  await markJournalIncomplete(source.date, dependencies);
  return duplicate;
}

export async function removeFoodEntry(
  entryId: EntityId,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<void> {
  const source = await dependencies.food.getEntryById(entryId);
  await dependencies.food.deleteEntry(entryId);

  if (source) {
    await markJournalIncomplete(source.date, dependencies);
  }
}

export async function copyMeal(
  input: CopyMealInput,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<number> {
  const sourceMeals = await dependencies.food.listMealsByDate(input.sourceDate);
  const sourceMeal = sourceMeals.find((meal) => meal.slot === input.sourceSlot);

  if (!sourceMeal) {
    return 0;
  }

  const sourceEntries = await dependencies.food.listEntriesByMeal(sourceMeal.id);

  if (sourceEntries.length === 0) {
    return 0;
  }

  const targetMeal = await dependencies.food.getOrCreateMeal(
    input.targetDate,
    input.targetSlot,
  );

  await Promise.all(
    sourceEntries.map((entry) =>
      dependencies.food.createEntry({
        date: input.targetDate,
        mealId: targetMeal.id,
        mealSlot: input.targetSlot,
        sourceType: entry.sourceType,
        reference: cloneReference(entry.reference),
      }),
    ),
  );
  await markJournalIncomplete(input.targetDate, dependencies);
  return sourceEntries.length;
}

export async function copyDay(
  sourceDate: LocalDate,
  targetDate: LocalDate,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<number> {
  if (sourceDate === targetDate) {
    throw new Error('Choisis une autre date pour copier la journée.');
  }

  const sourceEntries = await dependencies.food.listEntriesByDate(sourceDate);

  if (sourceEntries.length === 0) {
    return 0;
  }

  const targetMeals = new Map<MealSlot, Meal>();

  for (const slot of MEAL_SLOTS) {
    if (sourceEntries.some((entry) => entry.mealSlot === slot)) {
      targetMeals.set(
        slot,
        await dependencies.food.getOrCreateMeal(targetDate, slot),
      );
    }
  }

  await Promise.all(
    sourceEntries.map((entry) => {
      const targetMeal = targetMeals.get(entry.mealSlot);

      if (!targetMeal) {
        throw new Error('Le repas cible ne peut pas être préparé.');
      }

      return dependencies.food.createEntry({
        date: targetDate,
        mealId: targetMeal.id,
        mealSlot: entry.mealSlot,
        sourceType: entry.sourceType,
        reference: cloneReference(entry.reference),
      });
    }),
  );
  await markJournalIncomplete(targetDate, dependencies);
  return sourceEntries.length;
}

export async function setJournalComplete(
  date: LocalDate,
  isComplete: boolean,
  dependencies: FoodJournalServiceDependencies = defaultDependencies,
): Promise<DailyJournalStatus> {
  const data: NewEntity<DailyJournalStatus> = isComplete
    ? {
        date,
        isComplete: true,
        completedAt: new Date().toISOString(),
      }
    : {
        date,
        isComplete: false,
      };

  return dependencies.food.upsertJournalStatus(data);
}
