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
import type { TrashItem } from '@/domain/models/trash';
import type { WeightEntry } from '@/domain/models/weight';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  deleteTrashItemPermanently,
  listTrashItems,
  moveActivityToTrash,
  moveFavoriteMealToTrash,
  moveFoodEntryToTrash,
  moveMealToTrash,
  moveRecipeToTrash,
  moveWeightToTrash,
  purgeExpiredTrashItems,
  restoreTrashItem,
} from '@/infrastructure/repositories/dexie/trashService';

describe('trashService', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(
      `sportpilot-trash-test-${crypto.randomUUID()}`,
    );
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('déplace puis restaure une activité sans modifier son contenu', async () => {
    const activity = {
      id: 'activity-1',
      type: 'running',
      date: '2026-06-28',
      time: '08:00',
      durationMinutes: 45,
      distanceKm: 8,
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T08:00:00.000Z',
    } as Activity;

    await database.activities.add(activity);

    const trashed = await moveActivityToTrash(
      database,
      activity.id,
      new Date('2026-06-28T10:00:00.000Z'),
    );

    expect(trashed?.entityType).toBe('activity');
    expect(await database.activities.count()).toBe(0);
    expect(await database.trashItems.count()).toBe(1);

    await restoreTrashItem(database, trashed!.id);

    expect(await database.activities.get(activity.id)).toEqual(activity);
    expect(await database.trashItems.count()).toBe(0);
  });

  it('déplace une pesée et refuse une restauration qui écraserait la même date', async () => {
    const deletedWeight = {
      id: 'weight-1',
      date: '2026-06-28',
      weightKg: 60.2,
      createdAt: '2026-06-28T07:00:00.000Z',
      updatedAt: '2026-06-28T07:00:00.000Z',
    } as WeightEntry;

    await database.weights.add(deletedWeight);
    const trashed = await moveWeightToTrash(
      database,
      deletedWeight.date,
    );

    await database.weights.add({
      ...deletedWeight,
      id: 'weight-replacement',
      weightKg: 60.4,
    });

    await expect(
      restoreTrashItem(database, trashed!.id),
    ).rejects.toThrow('Une pesée existe déjà pour cette date');

    expect(await database.trashItems.count()).toBe(1);
  });

  it('déplace puis restaure une entrée alimentaire', async () => {
    const meal = {
      id: 'meal-entry',
      date: '2026-06-28',
      slot: 'lunch',
      createdAt: '2026-06-28T11:00:00.000Z',
      updatedAt: '2026-06-28T11:00:00.000Z',
    } satisfies Meal;
    const entry = {
      id: 'food-entry-1',
      date: '2026-06-28',
      mealId: meal.id,
      mealSlot: 'lunch',
      sourceType: 'product',
      reference: {
        sourceType: 'product',
        productId: 'product-1',
        inputMode: 'amount',
        inputQuantity: 150,
        normalizedAmount: 150,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: {
          caloriesKcal: 130,
          proteinGrams: 2.7,
          carbohydratesGrams: 28,
          fatGrams: 0.3,
        },
      },
      createdAt: '2026-06-28T11:01:00.000Z',
      updatedAt: '2026-06-28T11:01:00.000Z',
    } satisfies FoodEntry;

    await database.meals.add(meal);
    await database.foodEntries.add(entry);

    const trashed = await moveFoodEntryToTrash(
      database,
      entry.id,
    );

    expect(await database.foodEntries.get(entry.id)).toBeUndefined();
    expect(trashed?.entityType).toBe('foodEntry');

    await restoreTrashItem(database, trashed!.id);

    expect(await database.foodEntries.get(entry.id)).toEqual(entry);
  });

  it('restaure atomiquement un repas et toutes ses entrées', async () => {
    const meal = {
      id: 'meal-complete',
      date: '2026-06-29',
      slot: 'dinner',
      title: 'Dîner test',
      createdAt: '2026-06-29T19:00:00.000Z',
      updatedAt: '2026-06-29T19:00:00.000Z',
    } satisfies Meal;
    const entry = {
      id: 'meal-entry-complete',
      date: meal.date,
      mealId: meal.id,
      mealSlot: meal.slot,
      sourceType: 'recipe',
      reference: {
        sourceType: 'recipe',
        recipeId: 'recipe-snapshot',
        servingsConsumed: 1,
        nutritionPerServingSnapshot: {
          caloriesKcal: 520,
          proteinGrams: 35,
          carbohydratesGrams: 60,
          fatGrams: 15,
        },
      },
      createdAt: '2026-06-29T19:01:00.000Z',
      updatedAt: '2026-06-29T19:01:00.000Z',
    } satisfies FoodEntry;

    await database.meals.add(meal);
    await database.foodEntries.add(entry);

    const trashed = await moveMealToTrash(database, meal.id);

    expect(await database.meals.count()).toBe(0);
    expect(await database.foodEntries.count()).toBe(0);
    expect(trashed?.entityType).toBe('meal');

    await restoreTrashItem(database, trashed!.id);

    expect(await database.meals.get(meal.id)).toEqual(meal);
    expect(await database.foodEntries.get(entry.id)).toEqual(entry);
  });

  it('déplace puis restaure un repas favori', async () => {
    const favoriteMeal = {
      id: 'favorite-meal-1',
      name: 'Déjeuner rapide',
      defaultSlot: 'lunch',
      items: [],
      createdAt: '2026-06-28T12:00:00.000Z',
      updatedAt: '2026-06-28T12:00:00.000Z',
    } satisfies FavoriteMeal;

    await database.favoriteMeals.add(favoriteMeal);

    const trashed = await moveFavoriteMealToTrash(
      database,
      favoriteMeal.id,
    );

    expect(await database.favoriteMeals.count()).toBe(0);
    await restoreTrashItem(database, trashed!.id);
    expect(
      await database.favoriteMeals.get(favoriteMeal.id),
    ).toEqual(favoriteMeal);
  });

  it('restaure une recette avec tous ses ingrédients', async () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Bol énergétique',
      numberOfServings: 2,
      createdAt: '2026-06-28T12:00:00.000Z',
      updatedAt: '2026-06-28T12:00:00.000Z',
    } satisfies Recipe;
    const ingredient = {
      id: 'ingredient-1',
      recipeId: recipe.id,
      productId: 'product-rice',
      quantity: 200,
      unit: 'g',
      sortOrder: 0,
      nutritionPer100Snapshot: {
        caloriesKcal: 130,
        proteinGrams: 2.7,
        carbohydratesGrams: 28,
        fatGrams: 0.3,
      },
      createdAt: '2026-06-28T12:00:00.000Z',
      updatedAt: '2026-06-28T12:00:00.000Z',
    } satisfies RecipeIngredient;

    await database.recipes.add(recipe);
    await database.recipeIngredients.add(ingredient);

    const trashed = await moveRecipeToTrash(database, recipe.id);

    expect(await database.recipes.count()).toBe(0);
    expect(await database.recipeIngredients.count()).toBe(0);

    await restoreTrashItem(database, trashed!.id);

    expect(await database.recipes.get(recipe.id)).toEqual(recipe);
    expect(
      await database.recipeIngredients.get(ingredient.id),
    ).toEqual(ingredient);
  });

  it('supprime définitivement un élément sans restaurer sa donnée', async () => {
    const activity = {
      id: 'activity-permanent',
      type: 'cycling',
      date: '2026-06-28',
      durationMinutes: 60,
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T08:00:00.000Z',
    } as Activity;

    await database.activities.add(activity);
    const trashed = await moveActivityToTrash(database, activity.id);

    await deleteTrashItemPermanently(database, trashed!.id);

    expect(await database.activities.get(activity.id)).toBeUndefined();
    expect(await database.trashItems.count()).toBe(0);
  });

  it('purge uniquement les éléments arrivés à expiration', async () => {
    const expiredItem = {
      id: 'activity:expired',
      entityType: 'activity',
      entityId: 'expired',
      label: 'Activité expirée',
      deletedAt: '2026-05-01T00:00:00.000Z',
      purgeAt: '2026-05-31T00:00:00.000Z',
      payload: {
        id: 'expired',
        type: 'running',
        date: '2026-05-01',
      },
    } as TrashItem;
    const retainedItem = {
      ...expiredItem,
      id: 'activity:retained',
      entityId: 'retained',
      label: 'Activité conservée',
      purgeAt: '2026-07-31T00:00:00.000Z',
      payload: {
        ...expiredItem.payload,
        id: 'retained',
      },
    } as TrashItem;

    await database.trashItems.bulkAdd([
      expiredItem,
      retainedItem,
    ]);

    await expect(
      purgeExpiredTrashItems(
        database,
        new Date('2026-06-28T00:00:00.000Z'),
      ),
    ).resolves.toBe(1);

    await expect(listTrashItems(database)).resolves.toEqual([
      retainedItem,
    ]);
  });
});
