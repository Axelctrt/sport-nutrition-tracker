import Dexie, { type Table } from 'dexie';
import type { DeletionRecord } from '@/domain/models/deletion';
import { createDeletedDeletionRecord } from '@/domain/models/deletion';
import type { FavoriteMeal, FoodEntry, FoodProduct } from '@/domain/models/food';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type { NutritionJournalDayAggregate } from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import {
  previewRealNutritionLibrarySync,
  synchronizeRealNutritionLibrary,
  type NutritionRecipeAggregate,
} from '@/infrastructure/sync-prototype/realNutritionLibrarySyncService';

type CloudMetadata = { owner?: string; realmId?: string; $ts?: number; _hasBlobRefs?: 1 };
type CloudProduct = FoodProduct & CloudMetadata;
type CloudRecipe = NutritionRecipeAggregate & CloudMetadata;
type CloudFavorite = FavoriteMeal & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;
type CloudDay = NutritionJournalDayAggregate & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realNutritionProducts: Table<CloudProduct, string>;
  declare realNutritionRecipes: Table<CloudRecipe, string>;
  declare realFavoriteMeals: Table<CloudFavorite, string>;
  declare realNutritionLibraryDeletionRecords: Table<CloudMarker, string>;
  declare realNutritionJournalDays: Table<CloudDay, string>;

  constructor() {
    super(`sportpilot-c2-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realNutritionProducts: 'id, barcode, updatedAt',
      realNutritionRecipes: 'id, updatedAt',
      realFavoriteMeals: 'id, updatedAt',
      realNutritionLibraryDeletionRecords: 'id, entityType, entityId, status, updatedAt',
      realNutritionJournalDays: 'id, date, updatedAt',
    });
  }
}

const createdAt = '2026-07-01T08:00:00.000Z';

function manualProduct(id = 'product-1', updatedAt = '2026-07-01T09:00:00.000Z'): FoodProduct {
  return {
    id,
    name: 'Riz maison',
    basisUnit: 'g',
    nutritionPer100: {
      caloriesKcal: 350,
      proteinGrams: 8,
      carbohydratesGrams: 76,
      fatGrams: 1,
    },
    source: { type: 'manual' },
    isNutritionComplete: true,
    isFavorite: false,
    isArchived: false,
    createdAt,
    updatedAt,
  };
}

function offProduct(
  id: string,
  barcode = '3017620422003',
  updatedAt = '2026-07-01T09:00:00.000Z',
): FoodProduct {
  return {
    ...manualProduct(id, updatedAt),
    name: 'Produit OFF',
    barcode,
    source: { type: 'openFoodFacts', fetchedAt: updatedAt, barcode },
  };
}

function recipe(id = 'recipe-1', updatedAt = '2026-07-01T09:10:00.000Z'): Recipe {
  return {
    id,
    name: 'Bowl riz',
    numberOfServings: 2,
    createdAt,
    updatedAt,
  };
}

function ingredient(
  productId = 'product-1',
  id = 'ingredient-1',
  updatedAt = '2026-07-01T09:11:00.000Z',
): RecipeIngredient {
  return {
    id,
    recipeId: 'recipe-1',
    productId,
    quantity: 200,
    unit: 'g',
    sortOrder: 0,
    nutritionPer100Snapshot: manualProduct(productId).nutritionPer100,
    createdAt,
    updatedAt,
  };
}

function aggregate(productId = 'product-1'): NutritionRecipeAggregate {
  const value = recipe();
  const ingredients = [ingredient(productId)];
  return {
    id: value.id,
    recipe: value,
    ingredients,
    updatedAt: ingredients[0]!.updatedAt,
  };
}

function favorite(productId = 'product-1'): FavoriteMeal {
  return {
    id: 'favorite-1',
    name: 'Déjeuner rapide',
    defaultSlot: 'lunch',
    items: [{
      id: 'favorite-item-1',
      sourceType: 'product',
      productId,
      inputMode: 'amount',
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: manualProduct(productId).nutritionPer100,
    }],
    createdAt,
    updatedAt: '2026-07-01T09:12:00.000Z',
  };
}

function entry(productId: string): FoodEntry {
  return {
    id: 'entry-1',
    date: '2026-07-01',
    mealId: 'meal:2026-07-01:lunch',
    mealSlot: 'lunch',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId,
      inputMode: 'amount',
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: offProduct(productId).nutritionPer100,
    },
    createdAt,
    updatedAt: '2026-07-01T09:20:00.000Z',
  };
}

describe('synchronisation C2 de la bibliothèque nutritionnelle', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-c2-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie un aliment manuel, une recette complète et un favori une seule fois', async () => {
    await local.foodProducts.add(manualProduct());
    await local.recipes.add(recipe());
    await local.recipeIngredients.add(ingredient());
    await local.favoriteMeals.add(favorite());

    const first = await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');
    const second = await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(first.uploadedProducts).toBe(1);
    expect(first.uploadedRecipes).toBe(1);
    expect(first.uploadedFavoriteMeals).toBe(1);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realNutritionProducts.count()).toBe(1);
    expect(await cloud.realNutritionRecipes.get('#recipe-1')).toMatchObject({
      ingredients: [expect.objectContaining({ productId: 'product-1' })],
    });
  });

  it('ne transfère pas un cache Open Food Facts inutilisé', async () => {
    await local.foodProducts.add(offProduct('unused-off'));

    const result = await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(result.uploadedProducts).toBe(0);
    expect(await cloud.realNutritionProducts.count()).toBe(0);
    expect(await local.foodProducts.get('unused-off')).toBeDefined();
  });

  it('transfère un produit Open Food Facts réellement référencé', async () => {
    await local.foodProducts.add(offProduct('used-off'));
    await local.foodEntries.add(entry('used-off'));

    await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(await cloud.realNutritionProducts.get('#used-off')).toBeDefined();
  });

  it('télécharge une recette atomique avec son produit et son favori', async () => {
    await cloud.realNutritionProducts.add({ ...manualProduct(), id: '#product-1', owner: 'user-1' });
    await cloud.realNutritionRecipes.add({ ...aggregate(), id: '#recipe-1', owner: 'user-1' });
    await cloud.realFavoriteMeals.add({ ...favorite(), id: '#favorite-1', owner: 'user-1' });

    const result = await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(result.downloadedProducts).toBe(1);
    expect(result.downloadedRecipes).toBe(1);
    expect(await local.recipeIngredients.get('ingredient-1')).toMatchObject({ productId: 'product-1' });
    expect(await local.favoriteMeals.get('favorite-1')).toBeDefined();
  });

  it('refuse une recette distante dont le produit est absent', async () => {
    await cloud.realNutritionRecipes.add({ ...aggregate('missing-product'), id: '#recipe-1', owner: 'user-1' });

    await expect(
      synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1'),
    ).rejects.toThrow('référence un aliment absent');
  });

  it('ignore les métadonnées techniques Dexie Cloud', async () => {
    await local.foodProducts.add(manualProduct());
    await cloud.realNutritionProducts.add({
      ...manualProduct(),
      id: '#product-1',
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 123,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealNutritionLibrarySync(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');
    expect(preview.differingEntityCount).toBe(0);
  });

  it('propage la suppression d’une recette sans la ressusciter', async () => {
    await cloud.realNutritionProducts.add({ ...manualProduct(), id: '#product-1', owner: 'user-1' });
    await cloud.realNutritionRecipes.add({ ...aggregate(), id: '#recipe-1', owner: 'user-1' });
    await local.deletionRecords.add(createDeletedDeletionRecord(
      { entityType: 'recipe', entityId: 'recipe-1' },
      '2026-07-01T10:00:00.000Z',
    ));

    await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(await cloud.realNutritionRecipes.get('#recipe-1')).toBeUndefined();
    expect(await local.recipes.get('recipe-1')).toBeUndefined();
    expect(await cloud.realNutritionLibraryDeletionRecords.get('#deletion:recipe:recipe-1')).toMatchObject({ status: 'deleted' });
  });

  it('déduplique deux produits Open Food Facts identiques et remappe les références', async () => {
    await local.foodProducts.add(offProduct('older-id', '3017620422003', '2026-07-01T09:00:00.000Z'));
    await local.foodEntries.add(entry('older-id'));
    await cloud.realNutritionProducts.add({
      ...offProduct('newer-id', '3017620422003', '2026-07-01T10:00:00.000Z'),
      id: '#newer-id',
      owner: 'user-1',
    });
    await cloud.realNutritionJournalDays.add({
      id: '#nutrition-journal:2026-07-01',
      date: '2026-07-01',
      meals: [],
      entries: [entry('older-id')],
      updatedAt: '2026-07-01T09:20:00.000Z',
      owner: 'user-1',
    });

    const result = await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(result.remappedProductReferences).toBe(1);
    expect(await local.foodProducts.get('older-id')).toBeUndefined();
    expect(await local.foodProducts.get('newer-id')).toBeDefined();
    expect((await local.foodEntries.get('entry-1'))?.reference).toMatchObject({ productId: 'newer-id' });
    expect(await cloud.realNutritionProducts.count()).toBe(1);
    expect((await cloud.realNutritionJournalDays.get('#nutrition-journal:2026-07-01'))?.entries[0]?.reference)
      .toMatchObject({ productId: 'newer-id' });
  });

  it('ignore strictement les données d’un autre compte', async () => {
    await cloud.realNutritionProducts.add({ ...manualProduct(), id: '#product-1', owner: 'user-2' });

    await synchronizeRealNutritionLibrary(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(await local.foodProducts.count()).toBe(0);
    expect(await cloud.realNutritionProducts.count()).toBe(1);
  });
});
