import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';
import {
  listRecipeSummaries,
  loadRecipeDetails,
  saveRecipe,
  saveRecipeEntry,
} from '@/application/recipes/recipeService';

function createDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-recipe-service-${crypto.randomUUID()}`);
}

describe('service de recettes', () => {
  let database: AppDatabase;
  let food: DexieFoodRepository;
  let recipes: DexieRecipeRepository;

  beforeEach(async () => {
    database = createDatabase();
    await database.open();
    food = new DexieFoodRepository(database);
    recipes = new DexieRecipeRepository(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  async function createProduct(name: string, caloriesKcal: number) {
    return food.createProduct({
      name,
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal,
        proteinGrams: 10,
        carbohydratesGrams: 20,
        fatGrams: 5,
      },
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });
  }

  it('crée une recette avec des snapshots et calcule ses valeurs', async () => {
    const rice = await createProduct('Riz', 130);
    const chicken = await createProduct('Poulet', 165);
    const details = await saveRecipe({
      name: 'Riz poulet',
      numberOfServings: 2,
      ingredients: [
        { productId: rice.id, quantity: 200 },
        { productId: chicken.id, quantity: 100 },
      ],
    }, { food, recipes });

    expect(details.ingredients).toHaveLength(2);
    expect(details.totalNutrition.caloriesKcal).toBe(425);
    expect(details.nutritionPerServing.caloriesKcal).toBe(212.5);
    expect(await loadRecipeDetails(details.recipe.id, { food, recipes })).toMatchObject({
      recipe: { name: 'Riz poulet' },
    });
  });

  it('modifie atomiquement la recette et remplace ses ingrédients', async () => {
    const rice = await createProduct('Riz', 130);
    const first = await saveRecipe({
      name: 'Riz',
      numberOfServings: 2,
      ingredients: [{ productId: rice.id, quantity: 200 }],
    }, { food, recipes });
    const updated = await saveRecipe({
      recipeId: first.recipe.id,
      name: 'Riz familial',
      numberOfServings: 4,
      ingredients: [{ productId: rice.id, quantity: 400 }],
    }, { food, recipes });

    expect(updated.recipe.id).toBe(first.recipe.id);
    expect(updated.recipe.name).toBe('Riz familial');
    expect(updated.ingredients).toHaveLength(1);
    expect(updated.ingredients[0]?.ingredient.quantity).toBe(400);
  });

  it('ajoute une recette au journal avec le nombre de portions choisi', async () => {
    const rice = await createProduct('Riz', 130);
    const details = await saveRecipe({
      name: 'Riz',
      numberOfServings: 2,
      ingredients: [{ productId: rice.id, quantity: 200 }],
    }, { food, recipes });
    const entry = await saveRecipeEntry({
      recipeId: details.recipe.id,
      date: '2026-06-23',
      mealSlot: 'lunch',
      servingsConsumed: 1.5,
    }, { food, recipes });

    expect(entry.reference).toMatchObject({
      sourceType: 'recipe',
      servingsConsumed: 1.5,
      nutritionPerServingSnapshot: { caloriesKcal: 130 },
    });
    expect((await food.getJournalStatus('2026-06-23'))?.isComplete).toBe(false);
  });

  it('liste les recettes et refuse un ingrédient dupliqué', async () => {
    const rice = await createProduct('Riz', 130);
    await saveRecipe({
      name: 'Riz',
      numberOfServings: 1,
      ingredients: [{ productId: rice.id, quantity: 100 }],
    }, { food, recipes });
    expect(await listRecipeSummaries({ food, recipes })).toHaveLength(1);
    await expect(saveRecipe({
      name: 'Doublon',
      numberOfServings: 1,
      ingredients: [
        { productId: rice.id, quantity: 100 },
        { productId: rice.id, quantity: 50 },
      ],
    }, { food, recipes })).rejects.toThrow('qu’une fois');
  });
});
