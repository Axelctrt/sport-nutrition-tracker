import type {
  EntityChanges,
  EntityId,
  LocalDate,
  NewEntity,
} from '@/domain/models/common';
import type {
  DailyJournalStatus,
  FavoriteMeal,
  FoodEntry,
  FoodProduct,
  Meal,
  MealSlot,
} from '@/domain/models/food';

export interface FoodRepository {
  getProductById(id: EntityId): Promise<FoodProduct | undefined>;
  listProducts(includeArchived?: boolean): Promise<FoodProduct[]>;
  listRecentProducts(limit?: number): Promise<FoodProduct[]>;
  findProductByBarcode(barcode: string): Promise<FoodProduct | undefined>;
  searchProducts(query: string, limit?: number): Promise<FoodProduct[]>;
  createProduct(data: NewEntity<FoodProduct>): Promise<FoodProduct>;
  updateProduct(id: EntityId, changes: EntityChanges<FoodProduct>): Promise<FoodProduct>;
  archiveProduct(id: EntityId): Promise<FoodProduct>;

  getMealById(id: EntityId): Promise<Meal | undefined>;
  getOrCreateMeal(date: LocalDate, slot: MealSlot, title?: string): Promise<Meal>;
  listMealsByDate(date: LocalDate): Promise<Meal[]>;
  deleteMeal(id: EntityId): Promise<void>;

  getEntryById(id: EntityId): Promise<FoodEntry | undefined>;
  createEntry(data: NewEntity<FoodEntry>): Promise<FoodEntry>;
  updateEntry(id: EntityId, changes: EntityChanges<FoodEntry>): Promise<FoodEntry>;
  listEntriesByDate(date: LocalDate): Promise<FoodEntry[]>;
  listEntriesBetween(from: LocalDate, to: LocalDate): Promise<FoodEntry[]>;
  listEntriesByMeal(mealId: EntityId): Promise<FoodEntry[]>;
  deleteEntry(id: EntityId): Promise<void>;

  getJournalStatus(date: LocalDate): Promise<DailyJournalStatus | undefined>;
  listJournalStatusesBetween(from: LocalDate, to: LocalDate): Promise<DailyJournalStatus[]>;
  upsertJournalStatus(data: NewEntity<DailyJournalStatus>): Promise<DailyJournalStatus>;

  getFavoriteMealById(id: EntityId): Promise<FavoriteMeal | undefined>;
  createFavoriteMeal(data: NewEntity<FavoriteMeal>): Promise<FavoriteMeal>;
  listFavoriteMeals(): Promise<FavoriteMeal[]>;
  deleteFavoriteMeal(id: EntityId): Promise<void>;
}
