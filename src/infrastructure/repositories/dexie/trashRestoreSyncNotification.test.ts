import Dexie from 'dexie';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import type { Activity } from '@/domain/models/activity';
import type {
  FavoriteMeal,
  FoodEntry,
  Meal,
} from '@/domain/models/food';
import type {
  Recipe,
  RecipeIngredient,
} from '@/domain/models/recipe';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { restoreTrashItemWithSyncNotification } from '@/infrastructure/repositories/dexie/trashRestoreSyncNotification';
import {
  moveActivityToTrash,
  moveFavoriteMealToTrash,
  moveFoodEntryToTrash,
  moveMealToTrash,
  moveRecipeToTrash,
} from '@/infrastructure/repositories/dexie/trashService';

function activity(): Activity {
  return {
    id: 'activity-restore-event',
    type: 'running',
    date: '2026-08-18',
    sessionType: 'easy',
    durationMinutes: 30,
    intensity: 'moderate',
    distanceKm: 5,
    averageCadenceSpm: 165,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 350,
      calculationVersion: 1,
    },
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  };
}

function journalFixture() {
  const meal = {
    id: 'meal-restore-event',
    date: '2026-08-18',
    slot: 'lunch',
    createdAt: '2026-08-18T11:00:00.000Z',
    updatedAt: '2026-08-18T11:00:00.000Z',
  } satisfies Meal;
  const entry = {
    id: 'food-entry-restore-event',
    date: meal.date,
    mealId: meal.id,
    mealSlot: meal.slot,
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: 'product-restore-event',
      inputMode: 'amount',
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: {
        caloriesKcal: 100,
        proteinGrams: 5,
        carbohydratesGrams: 12,
        fatGrams: 3,
      },
    },
    createdAt: '2026-08-18T11:01:00.000Z',
    updatedAt: '2026-08-18T11:01:00.000Z',
  } satisfies FoodEntry;
  return { meal, entry };
}

function favoriteMeal(): FavoriteMeal {
  return {
    id: 'favorite-meal-restore-event',
    name: 'Favori restore',
    defaultSlot: 'lunch',
    items: [],
    createdAt: '2026-08-18T12:00:00.000Z',
    updatedAt: '2026-08-18T12:00:00.000Z',
  };
}

function recipeFixture() {
  const recipe = {
    id: 'recipe-restore-event',
    name: 'Recette restore',
    numberOfServings: 2,
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-18T13:00:00.000Z',
  } satisfies Recipe;
  const ingredient = {
    id: 'ingredient-restore-event',
    recipeId: recipe.id,
    productId: 'product-recipe-restore-event',
    quantity: 150,
    unit: 'g',
    sortOrder: 0,
    nutritionPer100Snapshot: {
      caloriesKcal: 130,
      proteinGrams: 2.7,
      carbohydratesGrams: 28,
      fatGrams: 0.3,
    },
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-18T13:00:00.000Z',
  } satisfies RecipeIngredient;
  return { recipe, ingredient };
}

function recordDetails() {
  const details: unknown[] = [];
  const listener = (event: Event) => {
    details.push(syncLocalDataChangedDetail(event));
  };
  window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
  return {
    details,
    dispose: () => window.removeEventListener(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      listener,
    ),
  };
}

describe('trashRestoreSyncNotification', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(`trash-restore-sync-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it('publie activities uniquement après la restauration durable réussie', async () => {
    await database.activities.put(activity());
    const trashItem = await moveActivityToTrash(
      database,
      'activity-restore-event',
      new Date('2026-08-18T11:00:00.000Z'),
    );
    expect(trashItem).toBeDefined();
    const recorded = recordDetails();

    try {
      await restoreTrashItemWithSyncNotification(
        database,
        trashItem!.id,
        new Date('2026-08-18T12:00:00.000Z'),
      );
    } finally {
      recorded.dispose();
    }

    expect(await database.activities.get('activity-restore-event')).toBeDefined();
    expect(recorded.details).toEqual([{
      domainIds: ['activities'],
      reason: 'activity-trash-restore',
    }]);
  });

  it('publie nutrition-journal après restauration durable d’une entrée alimentaire', async () => {
    const { meal, entry } = journalFixture();
    await database.meals.put(meal);
    await database.foodEntries.put(entry);
    const trashItem = await moveFoodEntryToTrash(database, entry.id);
    const recorded = recordDetails();

    try {
      await restoreTrashItemWithSyncNotification(database, trashItem!.id);
    } finally {
      recorded.dispose();
    }

    expect(await database.foodEntries.get(entry.id)).toEqual(entry);
    expect(recorded.details).toEqual([{
      domainIds: ['nutrition-journal'],
      reason: 'nutrition-journal-trash-restore',
    }]);
  });

  it('publie nutrition-journal une seule fois après restauration durable d’un repas', async () => {
    const { meal, entry } = journalFixture();
    await database.meals.put(meal);
    await database.foodEntries.put(entry);
    const trashItem = await moveMealToTrash(database, meal.id);
    const recorded = recordDetails();

    try {
      await restoreTrashItemWithSyncNotification(database, trashItem!.id);
    } finally {
      recorded.dispose();
    }

    expect(await database.meals.get(meal.id)).toEqual(meal);
    expect(await database.foodEntries.get(entry.id)).toEqual(entry);
    expect(recorded.details).toEqual([{
      domainIds: ['nutrition-journal'],
      reason: 'nutrition-journal-trash-restore',
    }]);
  });

  it('publie nutrition-library après restauration durable d’un favori', async () => {
    const favorite = favoriteMeal();
    await database.favoriteMeals.put(favorite);
    const trashItem = await moveFavoriteMealToTrash(database, favorite.id);
    const recorded = recordDetails();

    try {
      await restoreTrashItemWithSyncNotification(database, trashItem!.id);
    } finally {
      recorded.dispose();
    }

    expect(await database.favoriteMeals.get(favorite.id)).toEqual(favorite);
    expect(recorded.details).toEqual([{
      domainIds: ['nutrition-library'],
      reason: 'nutrition-library-trash-restore',
    }]);
  });

  it('publie nutrition-library une seule fois après restauration durable d’une recette', async () => {
    const { recipe, ingredient } = recipeFixture();
    await database.recipes.put(recipe);
    await database.recipeIngredients.put(ingredient);
    const trashItem = await moveRecipeToTrash(database, recipe.id);
    const recorded = recordDetails();

    try {
      await restoreTrashItemWithSyncNotification(database, trashItem!.id);
    } finally {
      recorded.dispose();
    }

    expect(await database.recipes.get(recipe.id)).toEqual(recipe);
    expect(await database.recipeIngredients.get(ingredient.id)).toEqual(ingredient);
    expect(recorded.details).toEqual([{
      domainIds: ['nutrition-library'],
      reason: 'nutrition-library-trash-restore',
    }]);
  });

  it('ne publie rien si la restauration échoue', async () => {
    const listener = vi.fn();
    window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);

    await expect(restoreTrashItemWithSyncNotification(
      database,
      'activity:missing',
    )).rejects.toThrow();

    window.removeEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
    expect(listener).not.toHaveBeenCalled();
  });
});
