import Dexie, { type Table } from 'dexie';

import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { saveRecipe } from '@/application/recipes/recipeService';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { FavoriteMeal, FoodProduct } from '@/domain/models/food';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import { restoreTrashItemWithSyncNotification } from '@/infrastructure/repositories/dexie/trashRestoreSyncNotification';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type { NutritionJournalDayAggregate } from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import {
  previewRealNutritionLibrarySync,
  synchronizeRealNutritionLibrary,
  type NutritionRecipeAggregate,
} from '@/infrastructure/sync-prototype/realNutritionLibrarySyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'nutrition-library-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

type CloudMetadata = {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
  syncRevision?: number;
  syncActorId?: string;
};
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

  constructor(label: string) {
    super(`sportpilot-nutrition-library-a-b-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realNutritionProducts: 'id, barcode, updatedAt',
      realNutritionRecipes: 'id, updatedAt',
      realFavoriteMeals: 'id, updatedAt',
      realNutritionLibraryDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realNutritionJournalDays: 'id, date, updatedAt',
    });
  }
}

function createDeviceClient(
  local: AppDatabase,
  cloud: TestCloudDatabase,
): SyncPrototypeClient {
  let snapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realNutritionLibrary: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  } as SyncPrototypeSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealNutritionLibrary = vi.fn(async () => {
    const preview = await previewRealNutritionLibrarySync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realNutritionLibrary: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealNutritionLibrary,
    syncRealNutritionLibrary: vi.fn(async () =>
      synchronizeRealNutritionLibrary(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )),
  } as unknown as SyncPrototypeClient;
}

async function replicateCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const [products, recipes, favorites, markers, journalDays] = await Promise.all([
    source.realNutritionProducts.toArray(),
    source.realNutritionRecipes.toArray(),
    source.realFavoriteMeals.toArray(),
    source.realNutritionLibraryDeletionRecords.toArray(),
    source.realNutritionJournalDays.toArray(),
  ]);
  await Promise.all([
    target.realNutritionProducts.clear(),
    target.realNutritionRecipes.clear(),
    target.realFavoriteMeals.clear(),
    target.realNutritionLibraryDeletionRecords.clear(),
    target.realNutritionJournalDays.clear(),
  ]);
  if (products.length > 0) await target.realNutritionProducts.bulkPut(products);
  if (recipes.length > 0) await target.realNutritionRecipes.bulkPut(recipes);
  if (favorites.length > 0) await target.realFavoriteMeals.bulkPut(favorites);
  if (markers.length > 0) {
    await target.realNutritionLibraryDeletionRecords.bulkPut(markers);
  }
  if (journalDays.length > 0) {
    await target.realNutritionJournalDays.bulkPut(journalDays);
  }
}

function productInput(): Omit<FoodProduct, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'Produit Library A→B',
    basisUnit: 'g',
    nutritionPer100: {
      caloriesKcal: 321,
      proteinGrams: 11,
      carbohydratesGrams: 54,
      fatGrams: 7,
    },
    source: { type: 'manual' },
    isNutritionComplete: true,
    isFavorite: false,
    isArchived: false,
  };
}

describe('gate A→B Nutrition Library automatique', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    localA = new AppDatabase(`nutrition-library-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`nutrition-library-b-${crypto.randomUUID()}`);
    cloudA = new TestCloudDatabase('a');
    cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);
  });

  afterEach(async () => {
    const names = [localA.name, localB.name, cloudA.name, cloudB.name];
    localA.close();
    localB.close();
    cloudA.close();
    cloudB.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('propage produit + saveRecipe atomique + favori, puis suppression/restauration vers B frais', async () => {
    const settingsA = new DexieSettingsRepository(localA);
    await settingsA.update({
      automaticAccountSyncEnabled: true,
      automaticAccountSyncConnectionMode: 'any-connection',
      automaticAccountSyncAccountFingerprint: FINGERPRINT,
    });

    const foodA = new DexieFoodRepository(localA);
    const recipesA = new DexieRecipeRepository(localA);
    const clientA = createDeviceClient(localA, cloudA);
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: settingsA,
      eventTarget: window,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controllerA.initialize();

    const product = await foodA.createProduct(productInput());
    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionProducts.get(`#${product.id}`))
        .toMatchObject({ name: 'Produit Library A→B' });
    });

    const saved = await saveRecipe({
      name: 'Recette Library A→B',
      numberOfServings: 2,
      ingredients: [{ productId: product.id, quantity: 180 }],
    }, { food: foodA, recipes: recipesA });

    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionRecipes.get(`#${saved.recipe.id}`))
        .toMatchObject({
          recipe: { name: 'Recette Library A→B' },
          ingredients: [expect.objectContaining({ productId: product.id })],
        });
    });

    const favorite = await foodA.createFavoriteMeal({
      name: 'Favori Library A→B',
      defaultSlot: 'lunch',
      items: [{
        id: 'favorite-item-library-a-b',
        sourceType: 'product',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 100,
        normalizedAmount: 100,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: { ...product.nutritionPer100 },
      }],
    });

    await vi.waitFor(async () => {
      expect(await cloudA.realFavoriteMeals.get(`#${favorite.id}`))
        .toMatchObject({ name: 'Favori Library A→B' });
    });

    await recipesA.delete(saved.recipe.id);
    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionRecipes.get(`#${saved.recipe.id}`))
        .toBeUndefined();
      expect(
        (await cloudA.realNutritionLibraryDeletionRecords.toArray())
          .some((marker) =>
            marker.entityType === 'recipe'
            && marker.entityId === saved.recipe.id
            && marker.status === 'deleted'),
      ).toBe(true);
    });

    const trashItem = await localA.trashItems
      .where('entityId')
      .equals(saved.recipe.id)
      .first();
    expect(trashItem).toBeDefined();

    await restoreTrashItemWithSyncNotification(localA, trashItem!.id);
    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionRecipes.get(`#${saved.recipe.id}`))
        .toMatchObject({
          recipe: { name: 'Recette Library A→B' },
          ingredients: [expect.objectContaining({ productId: product.id })],
        });
      expect(
        (await cloudA.realNutritionLibraryDeletionRecords.toArray())
          .some((marker) =>
            marker.entityType === 'recipe'
            && marker.entityId === saved.recipe.id
            && marker.status === 'restored'),
      ).toBe(true);
    });

    await replicateCloud(cloudA, cloudB);
    const cloudBeforeRestore = {
      products: await cloudB.realNutritionProducts.toArray(),
      recipes: await cloudB.realNutritionRecipes.toArray(),
      favorites: await cloudB.realFavoriteMeals.toArray(),
      markers: await cloudB.realNutritionLibraryDeletionRecords.toArray(),
    };

    const restored = await synchronizeRealNutritionLibrary(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(restored.downloadedProducts).toBe(1);
    expect(restored.downloadedRecipes).toBe(1);
    expect(restored.downloadedFavoriteMeals).toBe(1);
    expect(await localB.foodProducts.get(product.id)).toMatchObject({
      nutritionPer100: product.nutritionPer100,
    });
    expect(await localB.recipes.get(saved.recipe.id)).toMatchObject({
      name: 'Recette Library A→B',
    });
    expect(await localB.recipeIngredients.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipeId: saved.recipe.id,
          productId: product.id,
        }),
      ]),
    );
    expect(await localB.favoriteMeals.get(favorite.id)).toMatchObject({
      name: 'Favori Library A→B',
    });
    expect(await localB.deletionRecords.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'recipe',
          entityId: saved.recipe.id,
          status: 'restored',
        }),
      ]),
    );
    expect(await cloudB.realNutritionProducts.toArray())
      .toEqual(cloudBeforeRestore.products);
    expect(await cloudB.realNutritionRecipes.toArray())
      .toEqual(cloudBeforeRestore.recipes);
    expect(await cloudB.realFavoriteMeals.toArray())
      .toEqual(cloudBeforeRestore.favorites);
    expect(await cloudB.realNutritionLibraryDeletionRecords.toArray())
      .toEqual(cloudBeforeRestore.markers);

    controllerA.dispose();
  });
});
