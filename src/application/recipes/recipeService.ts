import {
  calculateRecipeNutritionPerServing,
  calculateRecipeTotalNutrition,
} from '@/domain/calculations/recipes';
import type { EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { FoodEntry, FoodProduct, MealSlot, NutritionValues } from '@/domain/models/food';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { RecipeRepository } from '@/infrastructure/repositories/contracts/RecipeRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface RecipeIngredientInput {
  productId: EntityId;
  quantity: number;
}

export interface SaveRecipeInput {
  recipeId?: EntityId;
  name: string;
  numberOfServings: number;
  notes?: string;
  ingredients: RecipeIngredientInput[];
}

export interface RecipeIngredientDetails {
  ingredient: RecipeIngredient;
  product: FoodProduct | undefined;
}

export interface RecipeDetails {
  recipe: Recipe;
  ingredients: RecipeIngredientDetails[];
  totalNutrition: NutritionValues;
  nutritionPerServing: NutritionValues;
}

export interface RecipeSummary {
  recipe: Recipe;
  ingredientCount: number;
  totalNutrition: NutritionValues;
  nutritionPerServing: NutritionValues;
}

export interface SaveRecipeEntryInput {
  entryId?: EntityId;
  recipeId: EntityId;
  date: LocalDate;
  mealSlot: MealSlot;
  servingsConsumed: number;
}

export interface RecipeServiceDependencies {
  food: FoodRepository;
  recipes: RecipeRepository;
}

const defaultDependencies: RecipeServiceDependencies = {
  food: repositories.food,
  recipes: repositories.recipes,
};

function cleanNotes(notes: string | undefined): string | undefined {
  const value = notes?.trim();
  return value ? value : undefined;
}

export async function loadRecipeDetails(
  recipeId: EntityId,
  dependencies: RecipeServiceDependencies = defaultDependencies,
): Promise<RecipeDetails> {
  const [recipe, ingredients, products] = await Promise.all([
    dependencies.recipes.getById(recipeId),
    dependencies.recipes.listIngredients(recipeId),
    dependencies.food.listProducts(true),
  ]);

  if (!recipe) throw new Error('Recette introuvable.');
  if (ingredients.length === 0) throw new Error('Cette recette ne contient aucun ingrédient.');

  const productById = new Map(products.map((product) => [product.id, product]));
  return {
    recipe,
    ingredients: ingredients.map((ingredient) => ({
      ingredient,
      product: productById.get(ingredient.productId),
    })),
    totalNutrition: calculateRecipeTotalNutrition(ingredients),
    nutritionPerServing: calculateRecipeNutritionPerServing(
      ingredients,
      recipe.numberOfServings,
    ),
  };
}

export async function listRecipeSummaries(
  dependencies: RecipeServiceDependencies = defaultDependencies,
): Promise<RecipeSummary[]> {
  const recipes = await dependencies.recipes.listAll();
  const summaries = await Promise.all(
    recipes.map(async (recipe): Promise<RecipeSummary | undefined> => {
      const ingredients = await dependencies.recipes.listIngredients(recipe.id);
      if (ingredients.length === 0) return undefined;
      return {
        recipe,
        ingredientCount: ingredients.length,
        totalNutrition: calculateRecipeTotalNutrition(ingredients),
        nutritionPerServing: calculateRecipeNutritionPerServing(
          ingredients,
          recipe.numberOfServings,
        ),
      };
    }),
  );
  return summaries.filter((summary): summary is RecipeSummary => summary !== undefined);
}

export async function saveRecipe(
  input: SaveRecipeInput,
  dependencies: RecipeServiceDependencies = defaultDependencies,
): Promise<RecipeDetails> {
  if (input.ingredients.length === 0) {
    throw new Error('Ajoute au moins un ingrédient.');
  }

  const productIds = [...new Set(input.ingredients.map((ingredient) => ingredient.productId))];
  if (productIds.length !== input.ingredients.length) {
    throw new Error('Un même aliment ne peut apparaître qu’une fois dans la recette.');
  }

  const products = await Promise.all(
    productIds.map((productId) => dependencies.food.getProductById(productId)),
  );
  const productById = new Map(
    products
      .filter((product): product is FoodProduct => product !== undefined)
      .map((product) => [product.id, product]),
  );

  const ingredients: Array<Omit<NewEntity<RecipeIngredient>, 'recipeId'>> = input.ingredients.map(
    (ingredient, sortOrder) => {
      const product = productById.get(ingredient.productId);
      if (!product) throw new Error('Un ingrédient sélectionné est introuvable.');
      if (!Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0) {
        throw new Error('Chaque quantité doit être supérieure à zéro.');
      }
      return {
        productId: product.id,
        quantity: ingredient.quantity,
        unit: product.basisUnit,
        sortOrder,
        nutritionPer100Snapshot: { ...product.nutritionPer100 },
      };
    },
  );

  const notes = cleanNotes(input.notes);
  const recipeData: NewEntity<Recipe> = {
    name: input.name.trim(),
    numberOfServings: input.numberOfServings,
    ...(notes === undefined ? {} : { notes }),
  };

  const saved = await dependencies.recipes.saveWithIngredients(
    recipeData,
    ingredients,
    input.recipeId,
  );
  const savedProductById = productById;
  return {
    recipe: saved.recipe,
    ingredients: saved.ingredients.map((ingredient) => ({
      ingredient,
      product: savedProductById.get(ingredient.productId),
    })),
    totalNutrition: calculateRecipeTotalNutrition(saved.ingredients),
    nutritionPerServing: calculateRecipeNutritionPerServing(
      saved.ingredients,
      saved.recipe.numberOfServings,
    ),
  };
}

async function markJournalIncomplete(
  date: LocalDate,
  dependencies: RecipeServiceDependencies,
): Promise<void> {
  await dependencies.food.upsertJournalStatus({ date, isComplete: false });
}

export async function saveRecipeEntry(
  input: SaveRecipeEntryInput,
  dependencies: RecipeServiceDependencies = defaultDependencies,
): Promise<FoodEntry> {
  if (!Number.isFinite(input.servingsConsumed) || input.servingsConsumed <= 0) {
    throw new Error('Le nombre de portions doit être supérieur à zéro.');
  }
  const details = await loadRecipeDetails(input.recipeId, dependencies);
  const previous = input.entryId
    ? await dependencies.food.getEntryById(input.entryId)
    : undefined;
  if (input.entryId && !previous) throw new Error('Entrée alimentaire introuvable.');

  const meal = await dependencies.food.getOrCreateMeal(input.date, input.mealSlot);
  const reference = {
    sourceType: 'recipe' as const,
    recipeId: details.recipe.id,
    servingsConsumed: input.servingsConsumed,
    nutritionPerServingSnapshot: { ...details.nutritionPerServing },
  };

  const entry = input.entryId
    ? await dependencies.food.updateEntry(input.entryId, {
        date: input.date,
        mealId: meal.id,
        mealSlot: input.mealSlot,
        sourceType: 'recipe',
        reference,
      })
    : await dependencies.food.createEntry({
        date: input.date,
        mealId: meal.id,
        mealSlot: input.mealSlot,
        sourceType: 'recipe',
        reference,
      });

  await markJournalIncomplete(input.date, dependencies);
  if (previous && previous.date !== input.date) {
    await markJournalIncomplete(previous.date, dependencies);
  }
  return entry;
}

export async function deleteRecipe(
  recipeId: EntityId,
  dependencies: RecipeServiceDependencies = defaultDependencies,
): Promise<void> {
  await dependencies.recipes.delete(recipeId);
}
