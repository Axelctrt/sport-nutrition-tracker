import type { DeletionRecord } from '@/domain/models/deletion';
import {
  createRestoredDeletionRecord,
} from '@/domain/models/deletion';
import type { EntityMetadata } from '@/domain/models/common';
import type {
  FavoriteMeal,
  FavoriteMealItem,
  FoodEntry,
  FoodProduct,
} from '@/domain/models/food';
import type { Recipe, RecipeIngredient } from '@/domain/models/recipe';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stripCloudFields,
  type CloudOwned,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import type { NutritionJournalDayAggregate } from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';

const LIBRARY_MARKER_TYPES = ['favoriteMeal', 'recipe', 'recipeIngredient'] as const;
type LibraryMarkerType = (typeof LIBRARY_MARKER_TYPES)[number];

export interface NutritionRecipeAggregate {
  readonly id: string;
  readonly recipe: Recipe;
  readonly ingredients: readonly RecipeIngredient[];
  readonly updatedAt: string;
}

type CloudFoodProduct = Omit<FoodProduct, 'id'> & { readonly id: string };
type CloudRecipeAggregate = Omit<NutritionRecipeAggregate, 'id'> & { readonly id: string };
type CloudFavoriteMeal = Omit<FavoriteMeal, 'id'> & { readonly id: string };
type CloudDeletionRecord = Omit<DeletionRecord, 'id'> & { readonly id: string };

export interface RealNutritionLibrarySyncPreview {
  readonly localProductCount: number;
  readonly cloudProductCount: number;
  readonly localRecipeCount: number;
  readonly cloudRecipeCount: number;
  readonly localFavoriteMealCount: number;
  readonly cloudFavoriteMealCount: number;
  readonly localDeletionCount: number;
  readonly cloudDeletionCount: number;
  readonly differingEntityCount: number;
}

export interface RealNutritionLibrarySyncResult extends RealNutritionLibrarySyncPreview {
  readonly uploadedProducts: number;
  readonly downloadedProducts: number;
  readonly uploadedRecipes: number;
  readonly downloadedRecipes: number;
  readonly uploadedFavoriteMeals: number;
  readonly downloadedFavoriteMeals: number;
  readonly removedLocalEntities: number;
  readonly removedCloudEntities: number;
  readonly uploadedDeletionRecords: number;
  readonly downloadedDeletionRecords: number;
  readonly remappedProductReferences: number;
  readonly completedAt: string;
}

interface LibraryState {
  readonly localProducts: FoodProduct[];
  readonly cloudProducts: FoodProduct[];
  readonly localRecipes: NutritionRecipeAggregate[];
  readonly cloudRecipes: NutritionRecipeAggregate[];
  readonly localFavorites: FavoriteMeal[];
  readonly cloudFavorites: FavoriteMeal[];
  readonly localMarkers: DeletionRecord[];
  readonly cloudMarkers: DeletionRecord[];
}

interface FinalLibraryState {
  readonly products: FoodProduct[];
  readonly recipes: NutritionRecipeAggregate[];
  readonly favorites: FavoriteMeal[];
  readonly markers: DeletionRecord[];
  readonly productAliases: ReadonlyMap<string, string>;
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function mapById<T extends { id: string }>(values: readonly T[]): Map<string, T> {
  return new Map(values.map((value) => [value.id, value]));
}

function maxUpdatedAt(values: readonly EntityMetadata[]): string {
  return values.reduce(
    (latest, value) => (value.updatedAt > latest ? value.updatedAt : latest),
    '',
  );
}

function buildRecipeAggregates(
  recipes: readonly Recipe[],
  ingredients: readonly RecipeIngredient[],
): NutritionRecipeAggregate[] {
  return sortById(recipes).map((recipe) => {
    const recipeIngredients = sortById(
      ingredients.filter((ingredient) => ingredient.recipeId === recipe.id),
    );
    return {
      id: recipe.id,
      recipe,
      ingredients: recipeIngredients,
      updatedAt: maxUpdatedAt([recipe, ...recipeIngredients]),
    };
  });
}

function validateRecipeAggregate(aggregate: NutritionRecipeAggregate): void {
  if (aggregate.id !== aggregate.recipe.id) {
    throw new Error(`La recette ${aggregate.id} possède un identifiant incohérent.`);
  }
  if (aggregate.ingredients.length === 0) {
    throw new Error(`La recette ${aggregate.recipe.name} ne contient aucun ingrédient.`);
  }
  const ids = new Set<string>();
  const productIds = new Set<string>();
  for (const ingredient of aggregate.ingredients) {
    if (ingredient.recipeId !== aggregate.recipe.id) {
      throw new Error(`L’ingrédient ${ingredient.id} n’appartient pas à la bonne recette.`);
    }
    if (ids.has(ingredient.id) || productIds.has(ingredient.productId)) {
      throw new Error(`La recette ${aggregate.recipe.name} contient un ingrédient en double.`);
    }
    ids.add(ingredient.id);
    productIds.add(ingredient.productId);
  }
}

function isLibraryMarker(marker: DeletionRecord): marker is DeletionRecord & {
  entityType: LibraryMarkerType;
} {
  return LIBRARY_MARKER_TYPES.includes(marker.entityType as LibraryMarkerType);
}

function toCloudProduct(product: FoodProduct): CloudFoodProduct {
  return { ...product, id: cloudPrivateId(product.id) };
}

function fromCloudProduct(product: CloudOwned<CloudFoodProduct>): FoodProduct | undefined {
  const id = localIdFromCloud(product.id);
  if (!id) return undefined;
  return { ...stripCloudFields(product), id };
}

function toCloudRecipe(aggregate: NutritionRecipeAggregate): CloudRecipeAggregate {
  return { ...aggregate, id: cloudPrivateId(aggregate.id) };
}

function fromCloudRecipe(
  aggregate: CloudOwned<CloudRecipeAggregate>,
): NutritionRecipeAggregate | undefined {
  const id = localIdFromCloud(aggregate.id);
  if (!id) return undefined;
  const value = { ...stripCloudFields(aggregate), id } as NutritionRecipeAggregate;
  validateRecipeAggregate(value);
  return value;
}

function toCloudFavorite(favorite: FavoriteMeal): CloudFavoriteMeal {
  return { ...favorite, id: cloudPrivateId(favorite.id) };
}

function fromCloudFavorite(
  favorite: CloudOwned<CloudFavoriteMeal>,
): FavoriteMeal | undefined {
  const id = localIdFromCloud(favorite.id);
  if (!id) return undefined;
  return { ...stripCloudFields(favorite), id };
}

function toCloudMarker(marker: DeletionRecord): CloudDeletionRecord {
  return { ...marker, id: cloudPrivateId(marker.id) };
}

function fromCloudMarker(
  marker: CloudOwned<CloudDeletionRecord>,
): DeletionRecord | undefined {
  const id = localIdFromCloud(marker.id);
  if (!id) return undefined;
  return { ...stripCloudFields(marker), id };
}

function collectReferencedProductIds(
  entries: readonly FoodEntry[],
  ingredients: readonly RecipeIngredient[],
  favorites: readonly FavoriteMeal[],
): Set<string> {
  const ids = new Set<string>(ingredients.map((ingredient) => ingredient.productId));
  for (const entry of entries) {
    if (entry.reference.sourceType === 'product') ids.add(entry.reference.productId);
  }
  for (const favorite of favorites) {
    for (const item of favorite.items) {
      if (item.sourceType === 'product') ids.add(item.productId);
    }
  }
  return ids;
}

function shouldSynchronizeProduct(
  product: FoodProduct,
  referencedProductIds: ReadonlySet<string>,
): boolean {
  return product.source.type === 'manual'
    || referencedProductIds.has(product.id)
    || product.isFavorite
    || (product.localOverrides?.length ?? 0) > 0;
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<LibraryState> {
  const [
    localAllProducts,
    localRecipeRows,
    localIngredientRows,
    localFavorites,
    localEntries,
    localMarkerRows,
    cloudProductRows,
    cloudRecipeRows,
    cloudFavoriteRows,
    cloudMarkerRows,
  ] = await Promise.all([
    localDatabase.foodProducts.toArray(),
    localDatabase.recipes.toArray(),
    localDatabase.recipeIngredients.toArray(),
    localDatabase.favoriteMeals.toArray(),
    localDatabase.foodEntries.toArray(),
    localDatabase.deletionRecords.toArray(),
    cloudDatabase.realNutritionProducts.toArray(),
    cloudDatabase.realNutritionRecipes.toArray(),
    cloudDatabase.realFavoriteMeals.toArray(),
    cloudDatabase.realNutritionLibraryDeletionRecords.toArray(),
  ]);

  const referencedProductIds = collectReferencedProductIds(
    localEntries,
    localIngredientRows,
    localFavorites,
  );

  const cloudProducts = cloudProductRows
    .filter((product) => belongsToCurrentUser(product, currentUserId))
    .map(fromCloudProduct)
    .filter((product): product is FoodProduct => product !== undefined);
  const cloudProductIds = new Set(cloudProducts.map((product) => product.id));

  return {
    localProducts: localAllProducts.filter((product) =>
      shouldSynchronizeProduct(product, referencedProductIds)
      || cloudProductIds.has(product.id)),
    cloudProducts,
    localRecipes: buildRecipeAggregates(localRecipeRows, localIngredientRows),
    cloudRecipes: cloudRecipeRows
      .filter((recipe) => belongsToCurrentUser(recipe, currentUserId))
      .map(fromCloudRecipe)
      .filter((recipe): recipe is NutritionRecipeAggregate => recipe !== undefined),
    localFavorites,
    cloudFavorites: cloudFavoriteRows
      .filter((favorite) => belongsToCurrentUser(favorite, currentUserId))
      .map(fromCloudFavorite)
      .filter((favorite): favorite is FavoriteMeal => favorite !== undefined),
    localMarkers: localMarkerRows.filter(isLibraryMarker),
    cloudMarkers: cloudMarkerRows
      .filter((marker) => belongsToCurrentUser(marker, currentUserId))
      .map(fromCloudMarker)
      .filter((marker): marker is DeletionRecord => marker !== undefined)
      .filter(isLibraryMarker),
  };
}

function resolveProducts(
  localProducts: readonly FoodProduct[],
  cloudProducts: readonly FoodProduct[],
): { products: FoodProduct[]; aliases: Map<string, string> } {
  const localById = mapById(localProducts);
  const cloudById = mapById(cloudProducts);
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  const merged = [...ids]
    .map((id) => chooseLatest(localById.get(id), cloudById.get(id)))
    .filter((product): product is FoodProduct => product !== undefined);

  const aliases = new Map<string, string>();
  const groups = new Map<string, FoodProduct[]>();
  for (const product of merged) {
    if (product.source.type !== 'openFoodFacts') continue;
    const barcode = product.barcode ?? product.source.barcode;
    if (!barcode) continue;
    const key = normalizeOpenFoodFactsBarcode(barcode);
    const values = groups.get(key) ?? [];
    values.push(product);
    groups.set(key, values);
  }

  const removedIds = new Set<string>();
  for (const values of groups.values()) {
    if (values.length < 2) continue;
    const winner = values.reduce((selected, candidate) =>
      chooseLatest(selected, candidate) ?? selected,
    );
    for (const product of values) {
      if (product.id === winner.id) continue;
      aliases.set(product.id, winner.id);
      removedIds.add(product.id);
    }
  }

  return {
    products: sortById(merged.filter((product) => !removedIds.has(product.id))),
    aliases,
  };
}

function remapIngredient(
  ingredient: RecipeIngredient,
  aliases: ReadonlyMap<string, string>,
  productById: ReadonlyMap<string, FoodProduct>,
): RecipeIngredient {
  const productId = aliases.get(ingredient.productId) ?? ingredient.productId;
  if (productId === ingredient.productId) return ingredient;
  const product = productById.get(productId);
  return {
    ...ingredient,
    productId,
    updatedAt: product && product.updatedAt > ingredient.updatedAt
      ? product.updatedAt
      : ingredient.updatedAt,
  };
}

function remapFavoriteItem(
  item: FavoriteMealItem,
  aliases: ReadonlyMap<string, string>,
): FavoriteMealItem {
  if (item.sourceType !== 'product') return item;
  const productId = aliases.get(item.productId) ?? item.productId;
  return productId === item.productId ? item : { ...item, productId };
}

function remapRecipeAggregate(
  aggregate: NutritionRecipeAggregate,
  aliases: ReadonlyMap<string, string>,
  productById: ReadonlyMap<string, FoodProduct>,
): NutritionRecipeAggregate {
  const remapped = aggregate.ingredients.map((ingredient) =>
    remapIngredient(ingredient, aliases, productById));
  const byProductId = new Map<string, RecipeIngredient>();
  for (const ingredient of remapped) {
    const current = byProductId.get(ingredient.productId);
    if (!current) {
      byProductId.set(ingredient.productId, ingredient);
      continue;
    }
    const latest = chooseLatest(current, ingredient) ?? current;
    byProductId.set(ingredient.productId, {
      ...latest,
      quantity: current.quantity + ingredient.quantity,
      sortOrder: Math.min(current.sortOrder, ingredient.sortOrder),
      updatedAt: current.updatedAt > ingredient.updatedAt
        ? current.updatedAt
        : ingredient.updatedAt,
    });
  }
  const ingredients = [...byProductId.values()]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((ingredient, sortOrder) => ({ ...ingredient, sortOrder }));
  const value = {
    ...aggregate,
    ingredients,
    updatedAt: maxUpdatedAt([aggregate.recipe, ...ingredients]),
  };
  validateRecipeAggregate(value);
  return value;
}

function remapFavorite(
  favorite: FavoriteMeal,
  aliases: ReadonlyMap<string, string>,
  productById: ReadonlyMap<string, FoodProduct>,
): FavoriteMeal {
  const items = favorite.items.map((item) => remapFavoriteItem(item, aliases));
  if (sameEntity(items, favorite.items)) return favorite;
  const latestProductTimestamp = items.reduce((latest, item) => {
    if (item.sourceType !== 'product') return latest;
    const product = productById.get(item.productId);
    return product && product.updatedAt > latest ? product.updatedAt : latest;
  }, favorite.updatedAt);
  return { ...favorite, items, updatedAt: latestProductTimestamp };
}

function resolveEntityWithMarker<T extends { updatedAt: string }>(
  entityType: 'recipe' | 'favoriteMeal',
  entityId: string,
  localEntity: T | undefined,
  cloudEntity: T | undefined,
  localMarker: DeletionRecord | undefined,
  cloudMarker: DeletionRecord | undefined,
): { entity?: T; marker?: DeletionRecord } {
  const entity = chooseLatest(localEntity, cloudEntity);
  let marker = chooseLatest(localMarker, cloudMarker);
  if (entity && marker?.status === 'deleted' && entity.updatedAt > marker.updatedAt) {
    marker = createRestoredDeletionRecord(
      { entityType, entityId },
      entity.updatedAt,
      marker.deletedAt,
      marker,
    );
  }
  const deletionWins = marker?.status === 'deleted'
    && (!entity || marker.updatedAt >= entity.updatedAt);
  return {
    ...(deletionWins ? {} : entity ? { entity } : {}),
    ...(marker ? { marker } : {}),
  };
}

function resolveFinalState(state: LibraryState): FinalLibraryState {
  const { products, aliases } = resolveProducts(state.localProducts, state.cloudProducts);
  const productById = mapById(products);
  const localRecipes = state.localRecipes.map((recipe) =>
    remapRecipeAggregate(recipe, aliases, productById));
  const cloudRecipes = state.cloudRecipes.map((recipe) =>
    remapRecipeAggregate(recipe, aliases, productById));
  const localFavorites = state.localFavorites.map((favorite) =>
    remapFavorite(favorite, aliases, productById));
  const cloudFavorites = state.cloudFavorites.map((favorite) =>
    remapFavorite(favorite, aliases, productById));
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);
  const markers = new Map<string, DeletionRecord>();

  const localRecipeById = mapById(localRecipes);
  const cloudRecipeById = mapById(cloudRecipes);
  const recipeIds = new Set([...localRecipeById.keys(), ...cloudRecipeById.keys()]);
  const recipes: NutritionRecipeAggregate[] = [];
  for (const recipeId of recipeIds) {
    const resolved = resolveEntityWithMarker(
      'recipe',
      recipeId,
      localRecipeById.get(recipeId),
      cloudRecipeById.get(recipeId),
      localMarkerById.get(`deletion:recipe:${recipeId}`),
      cloudMarkerById.get(`deletion:recipe:${recipeId}`),
    );
    if (resolved.marker) markers.set(resolved.marker.id, resolved.marker);
    if (!resolved.entity) continue;

    const keptIngredients: RecipeIngredient[] = [];
    for (const ingredient of resolved.entity.ingredients) {
      let marker = chooseLatest(
        localMarkerById.get(`deletion:recipeIngredient:${ingredient.id}`),
        cloudMarkerById.get(`deletion:recipeIngredient:${ingredient.id}`),
      );
      if (marker?.status === 'deleted' && ingredient.updatedAt > marker.updatedAt) {
        marker = createRestoredDeletionRecord(
          { entityType: 'recipeIngredient', entityId: ingredient.id },
          ingredient.updatedAt,
          marker.deletedAt,
          marker,
        );
      }
      if (marker) markers.set(marker.id, marker);
      if (marker?.status === 'deleted' && marker.updatedAt >= ingredient.updatedAt) continue;
      keptIngredients.push(ingredient);
    }

    const aggregate = {
      ...resolved.entity,
      ingredients: sortById(keptIngredients),
      updatedAt: maxUpdatedAt([resolved.entity.recipe, ...keptIngredients]),
    };
    validateRecipeAggregate(aggregate);
    recipes.push(aggregate);
  }

  const localFavoriteById = mapById(localFavorites);
  const cloudFavoriteById = mapById(cloudFavorites);
  const favoriteIds = new Set([...localFavoriteById.keys(), ...cloudFavoriteById.keys()]);
  const favorites: FavoriteMeal[] = [];
  for (const favoriteId of favoriteIds) {
    const resolved = resolveEntityWithMarker(
      'favoriteMeal',
      favoriteId,
      localFavoriteById.get(favoriteId),
      cloudFavoriteById.get(favoriteId),
      localMarkerById.get(`deletion:favoriteMeal:${favoriteId}`),
      cloudMarkerById.get(`deletion:favoriteMeal:${favoriteId}`),
    );
    if (resolved.marker) markers.set(resolved.marker.id, resolved.marker);
    if (resolved.entity) favorites.push(resolved.entity);
  }

  const recipeIdsFinal = new Set(recipes.map((recipe) => recipe.id));
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      if (!productById.has(ingredient.productId)) {
        throw new Error(`L’ingrédient ${ingredient.id} référence un aliment absent.`);
      }
    }
  }
  for (const favorite of favorites) {
    if (favorite.items.length === 0) {
      throw new Error(`Le repas favori ${favorite.name} ne contient aucun élément.`);
    }
    for (const item of favorite.items) {
      if (item.sourceType === 'product' && !productById.has(item.productId)) {
        throw new Error(`Le repas favori ${favorite.name} référence un aliment absent.`);
      }
      if (item.sourceType === 'recipe' && !recipeIdsFinal.has(item.recipeId)) {
        throw new Error(`Le repas favori ${favorite.name} référence une recette absente.`);
      }
    }
  }

  for (const marker of [...state.localMarkers, ...state.cloudMarkers]) {
    const existing = markers.get(marker.id);
    markers.set(marker.id, chooseLatest(existing, marker) ?? marker);
  }

  return {
    products,
    recipes: sortById(recipes),
    favorites: sortById(favorites),
    markers: sortById([...markers.values()]),
    productAliases: aliases,
  };
}

function differenceCount<T extends { id: string }>(
  left: readonly T[],
  right: readonly T[],
): number {
  const leftById = mapById(left);
  const rightById = mapById(right);
  const ids = new Set([...leftById.keys(), ...rightById.keys()]);
  return [...ids].filter((id) => !sameEntity(leftById.get(id), rightById.get(id))).length;
}

function buildPreview(state: LibraryState, final: FinalLibraryState): RealNutritionLibrarySyncPreview {
  return {
    localProductCount: state.localProducts.length,
    cloudProductCount: state.cloudProducts.length,
    localRecipeCount: state.localRecipes.length,
    cloudRecipeCount: state.cloudRecipes.length,
    localFavoriteMealCount: state.localFavorites.length,
    cloudFavoriteMealCount: state.cloudFavorites.length,
    localDeletionCount: state.localMarkers.length,
    cloudDeletionCount: state.cloudMarkers.length,
    differingEntityCount:
      differenceCount(state.localProducts, final.products)
      + differenceCount(state.cloudProducts, final.products)
      + differenceCount(state.localRecipes, final.recipes)
      + differenceCount(state.cloudRecipes, final.recipes)
      + differenceCount(state.localFavorites, final.favorites)
      + differenceCount(state.cloudFavorites, final.favorites)
      + differenceCount(state.localMarkers, final.markers)
      + differenceCount(state.cloudMarkers, final.markers),
  };
}

export async function previewRealNutritionLibrarySync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealNutritionLibrarySyncPreview> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  return buildPreview(state, resolveFinalState(state));
}

function remapFoodEntry(
  entry: FoodEntry,
  aliases: ReadonlyMap<string, string>,
  updatedAt: string,
): FoodEntry {
  if (entry.reference.sourceType !== 'product') return entry;
  const productId = aliases.get(entry.reference.productId);
  if (!productId) return entry;
  return {
    ...entry,
    reference: { ...entry.reference, productId },
    updatedAt,
  };
}

function remapJournalDay(
  day: NutritionJournalDayAggregate,
  aliases: ReadonlyMap<string, string>,
  updatedAt: string,
): NutritionJournalDayAggregate {
  const entries = day.entries.map((entry) => remapFoodEntry(entry, aliases, updatedAt));
  if (sameEntity(entries, day.entries)) return day;
  return { ...day, entries, updatedAt };
}

export async function synchronizeRealNutritionLibrary(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealNutritionLibrarySyncResult> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const final = resolveFinalState(state);
  const preview = buildPreview(state, final);
  const completedAt = new Date().toISOString();

  const localProductById = mapById(state.localProducts);
  const cloudProductById = mapById(state.cloudProducts);
  const localRecipeById = mapById(state.localRecipes);
  const cloudRecipeById = mapById(state.cloudRecipes);
  const localFavoriteById = mapById(state.localFavorites);
  const cloudFavoriteById = mapById(state.cloudFavorites);
  const localMarkerById = mapById(state.localMarkers);
  const cloudMarkerById = mapById(state.cloudMarkers);

  const uploadedProducts = final.products.filter((value) =>
    !sameEntity(cloudProductById.get(value.id), value)).length;
  const downloadedProducts = final.products.filter((value) =>
    !sameEntity(localProductById.get(value.id), value)).length;
  const uploadedRecipes = final.recipes.filter((value) =>
    !sameEntity(cloudRecipeById.get(value.id), value)).length;
  const downloadedRecipes = final.recipes.filter((value) =>
    !sameEntity(localRecipeById.get(value.id), value)).length;
  const uploadedFavoriteMeals = final.favorites.filter((value) =>
    !sameEntity(cloudFavoriteById.get(value.id), value)).length;
  const downloadedFavoriteMeals = final.favorites.filter((value) =>
    !sameEntity(localFavoriteById.get(value.id), value)).length;
  const uploadedDeletionRecords = final.markers.filter((value) =>
    !sameEntity(cloudMarkerById.get(value.id), value)).length;
  const downloadedDeletionRecords = final.markers.filter((value) =>
    !sameEntity(localMarkerById.get(value.id), value)).length;

  const finalRecipeIds = new Set(final.recipes.map((value) => value.id));
  const finalIngredientIds = new Set(final.recipes.flatMap((value) => value.ingredients.map((item) => item.id)));
  const finalFavoriteIds = new Set(final.favorites.map((value) => value.id));
  const localRemovedRecipeCount = state.localRecipes.filter((value) => !finalRecipeIds.has(value.id)).length;
  const localRemovedIngredientCount = state.localRecipes
    .flatMap((value) => value.ingredients)
    .filter((value) => !finalIngredientIds.has(value.id)).length;
  const localRemovedFavoriteCount = state.localFavorites.filter((value) => !finalFavoriteIds.has(value.id)).length;
  const localAliasCount = [...final.productAliases.keys()].filter((id) => localProductById.has(id)).length;
  const removedLocalEntities = localRemovedRecipeCount + localRemovedIngredientCount
    + localRemovedFavoriteCount + localAliasCount;

  const cloudRemovedRecipeCount = state.cloudRecipes.filter((value) => !finalRecipeIds.has(value.id)).length;
  const cloudRemovedIngredientCount = state.cloudRecipes
    .flatMap((value) => value.ingredients)
    .filter((value) => !finalIngredientIds.has(value.id)).length;
  const cloudRemovedFavoriteCount = state.cloudFavorites.filter((value) => !finalFavoriteIds.has(value.id)).length;
  const cloudAliasCount = [...final.productAliases.keys()].filter((id) => cloudProductById.has(id)).length;
  const removedCloudEntities = cloudRemovedRecipeCount + cloudRemovedIngredientCount
    + cloudRemovedFavoriteCount + cloudAliasCount;

  let remappedProductReferences = 0;
  await localDatabase.transaction(
    'rw',
    [
      localDatabase.foodProducts,
      localDatabase.foodEntries,
      localDatabase.recipes,
      localDatabase.recipeIngredients,
      localDatabase.favoriteMeals,
      localDatabase.deletionRecords,
    ],
    async () => {
      if (final.productAliases.size > 0) {
        const entries = await localDatabase.foodEntries.toArray();
        const remappedEntries = entries.map((entry) => remapFoodEntry(entry, final.productAliases, completedAt));
        remappedProductReferences += remappedEntries.filter((value, index) =>
          !sameEntity(value, entries[index])).length;
        if (remappedEntries.length > 0) await localDatabase.foodEntries.bulkPut(remappedEntries);
        await localDatabase.foodProducts.bulkDelete([...final.productAliases.keys()]);
      }

      if (final.products.length > 0) await localDatabase.foodProducts.bulkPut(final.products);
      await localDatabase.recipes.bulkDelete(
        state.localRecipes.filter((value) => !finalRecipeIds.has(value.id)).map((value) => value.id),
      );
      await localDatabase.recipeIngredients.bulkDelete(
        state.localRecipes.flatMap((value) => value.ingredients)
          .filter((value) => !finalIngredientIds.has(value.id)).map((value) => value.id),
      );
      await localDatabase.favoriteMeals.bulkDelete(
        state.localFavorites.filter((value) => !finalFavoriteIds.has(value.id)).map((value) => value.id),
      );
      if (final.recipes.length > 0) {
        await localDatabase.recipes.bulkPut(final.recipes.map((value) => value.recipe));
        await localDatabase.recipeIngredients.bulkPut(final.recipes.flatMap((value) => value.ingredients));
      }
      if (final.favorites.length > 0) await localDatabase.favoriteMeals.bulkPut(final.favorites);
      if (final.markers.length > 0) await localDatabase.deletionRecords.bulkPut(final.markers);
    },
  );

  await cloudDatabase.transaction(
    'rw',
    cloudDatabase.realNutritionProducts,
    cloudDatabase.realNutritionRecipes,
    cloudDatabase.realFavoriteMeals,
    cloudDatabase.realNutritionLibraryDeletionRecords,
    cloudDatabase.realNutritionJournalDays,
    async () => {
      const finalProductById = mapById(final.products);
      for (const product of state.cloudProducts) {
        if (!finalProductById.has(product.id)) {
          await cloudDatabase.realNutritionProducts.delete(cloudPrivateId(product.id));
        }
      }
      for (const product of final.products) {
        if (!sameEntity(cloudProductById.get(product.id), product)) {
          await cloudDatabase.realNutritionProducts.put(toCloudProduct(product));
        }
      }

      const finalRecipeById = mapById(final.recipes);
      for (const recipe of state.cloudRecipes) {
        if (!finalRecipeById.has(recipe.id)) {
          await cloudDatabase.realNutritionRecipes.delete(cloudPrivateId(recipe.id));
        }
      }
      for (const recipe of final.recipes) {
        if (!sameEntity(cloudRecipeById.get(recipe.id), recipe)) {
          await cloudDatabase.realNutritionRecipes.put(toCloudRecipe(recipe));
        }
      }

      const finalFavoriteById = mapById(final.favorites);
      for (const favorite of state.cloudFavorites) {
        if (!finalFavoriteById.has(favorite.id)) {
          await cloudDatabase.realFavoriteMeals.delete(cloudPrivateId(favorite.id));
        }
      }
      for (const favorite of final.favorites) {
        if (!sameEntity(cloudFavoriteById.get(favorite.id), favorite)) {
          await cloudDatabase.realFavoriteMeals.put(toCloudFavorite(favorite));
        }
      }

      for (const marker of final.markers) {
        if (!sameEntity(cloudMarkerById.get(marker.id), marker)) {
          await cloudDatabase.realNutritionLibraryDeletionRecords.put(toCloudMarker(marker));
        }
      }

      if (final.productAliases.size > 0) {
        const cloudDays = await cloudDatabase.realNutritionJournalDays.toArray();
        for (const row of cloudDays) {
          if (!belongsToCurrentUser(row, currentUserId)) continue;
          const localId = localIdFromCloud(row.id);
          if (!localId) continue;
          const day = { ...stripCloudFields(row), id: localId } as NutritionJournalDayAggregate;
          const remapped = remapJournalDay(day, final.productAliases, completedAt);
          if (!sameEntity(day, remapped)) {
            await cloudDatabase.realNutritionJournalDays.put({
              ...remapped,
              id: cloudPrivateId(remapped.id),
            });
          }
        }
      }
    },
  );

  return {
    ...preview,
    uploadedProducts,
    downloadedProducts,
    uploadedRecipes,
    downloadedRecipes,
    uploadedFavoriteMeals,
    downloadedFavoriteMeals,
    removedLocalEntities,
    removedCloudEntities,
    uploadedDeletionRecords,
    downloadedDeletionRecords,
    remappedProductReferences,
    completedAt,
  };
}
