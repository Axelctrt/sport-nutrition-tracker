import type { EntityChanges, EntityId, LocalDate, NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus, FavoriteMeal, FoodEntry, FoodProduct, Meal, MealSlot } from '@/domain/models/food';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import {
  analyzePhotoNutrition,
  createPhotoEstimatedProductData,
  savePhotoNutritionEstimateToJournal,
  type PhotoNutritionAnalysisPort,
  type PhotoNutritionEstimate,
} from '@/application/photo-nutrition/photoNutritionEstimationService';

function imageFile(name: string, size = 128): File {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
}

class FakeFoodRepository implements FoodRepository {
  products = new Map<EntityId, FoodProduct>();
  entries: FoodEntry[] = [];
  meals = new Map<string, Meal>();

  async getProductById(id: EntityId): Promise<FoodProduct | undefined> { return this.products.get(id); }
  async listProducts(): Promise<FoodProduct[]> { return [...this.products.values()]; }
  async listRecentProducts(): Promise<FoodProduct[]> { return []; }
  async findProductByBarcode(): Promise<FoodProduct | undefined> { return undefined; }
  async searchProducts(): Promise<FoodProduct[]> { return []; }

  async createProduct(data: NewEntity<FoodProduct>): Promise<FoodProduct> {
    const product: FoodProduct = { id: `product-${this.products.size + 1}`, createdAt: '2026-07-04T12:00:00.000Z', updatedAt: '2026-07-04T12:00:00.000Z', ...data };
    this.products.set(product.id, product);
    return product;
  }

  async updateProduct(id: EntityId, changes: EntityChanges<FoodProduct>): Promise<FoodProduct> {
    const product = this.products.get(id);
    if (!product) throw new Error('Aliment introuvable.');
    const updated = { ...product, ...changes, updatedAt: '2026-07-04T12:01:00.000Z' } as FoodProduct;
    this.products.set(id, updated);
    return updated;
  }

  async archiveProduct(id: EntityId): Promise<FoodProduct> { return this.updateProduct(id, { isArchived: true }); }
  async getMealById(id: EntityId): Promise<Meal | undefined> { return [...this.meals.values()].find((meal) => meal.id === id); }

  async getOrCreateMeal(date: LocalDate, slot: MealSlot): Promise<Meal> {
    const key = `${date}:${slot}`;
    const current = this.meals.get(key);
    if (current) return current;
    const meal: Meal = { id: `meal-${key}`, date, slot, createdAt: '2026-07-04T12:00:00.000Z', updatedAt: '2026-07-04T12:00:00.000Z' };
    this.meals.set(key, meal);
    return meal;
  }

  async listMealsByDate(date: LocalDate): Promise<Meal[]> { return [...this.meals.values()].filter((meal) => meal.date === date); }
  async deleteMeal(): Promise<void> { return undefined; }
  async getEntryById(id: EntityId): Promise<FoodEntry | undefined> { return this.entries.find((entry) => entry.id === id); }

  async createEntry(data: NewEntity<FoodEntry>): Promise<FoodEntry> {
    const entry: FoodEntry = { id: `entry-${this.entries.length + 1}`, createdAt: '2026-07-04T12:00:00.000Z', updatedAt: '2026-07-04T12:00:00.000Z', ...data };
    this.entries.push(entry);
    return entry;
  }

  async updateEntry(): Promise<FoodEntry> { throw new Error('Non utilisé dans ce test.'); }
  async listEntriesByDate(date: LocalDate): Promise<FoodEntry[]> { return this.entries.filter((entry) => entry.date === date); }
  async listEntriesBetween(): Promise<FoodEntry[]> { return []; }
  async listEntriesByMeal(mealId: EntityId): Promise<FoodEntry[]> { return this.entries.filter((entry) => entry.mealId === mealId); }
  async deleteEntry(): Promise<void> { return undefined; }
  async getJournalStatus(): Promise<DailyJournalStatus | undefined> { return undefined; }
  async listJournalStatusesBetween(): Promise<DailyJournalStatus[]> { return []; }

  async upsertJournalStatus(data: NewEntity<DailyJournalStatus>): Promise<DailyJournalStatus> {
    return { id: `status-${data.date}`, createdAt: '2026-07-04T12:00:00.000Z', updatedAt: '2026-07-04T12:00:00.000Z', ...data };
  }

  async getFavoriteMealById(): Promise<FavoriteMeal | undefined> { return undefined; }
  async createFavoriteMeal(data: NewEntity<FavoriteMeal>): Promise<FavoriteMeal> {
    return { id: 'favorite-1', createdAt: '2026-07-04T12:00:00.000Z', updatedAt: '2026-07-04T12:00:00.000Z', ...data };
  }
  async listFavoriteMeals(): Promise<FavoriteMeal[]> { return []; }
  async deleteFavoriteMeal(): Promise<void> { return undefined; }
}

describe('photoNutritionEstimationService', () => {
  it('fournit une estimation prudente sans envoyer la photo', async () => {
    const result = await analyzePhotoNutrition(imageFile('repas.jpg'));

    expect(result.estimate.name).toBe('Repas à vérifier');
    expect(result.estimate.amount).toBe(250);
    expect(result.estimate.nutrition.caloriesKcal).toBe(450);
  });

  it('signale une photo illisible avant toute estimation', async () => {
    await expect(analyzePhotoNutrition(imageFile('vide.jpg', 0))).rejects.toThrow('Photo illisible');
  });

  it('normalise les valeurs par 100 g pour créer un aliment local corrigeable', () => {
    const estimate: PhotoNutritionEstimate = {
      name: 'Assiette test',
      amount: 250,
      nutrition: { caloriesKcal: 500, proteinGrams: 25, carbohydratesGrams: 60, fatGrams: 15 },
    };

    const product = createPhotoEstimatedProductData(estimate);

    expect(product.source.type).toBe('manual');
    expect(product.brand).toBe('Estimation photo');
    expect(product.isNutritionComplete).toBe(false);
    expect(product.servingSize).toBe(250);
    expect(product.nutritionPer100.caloriesKcal).toBe(200);
    expect(product.nutritionPer100.proteinGrams).toBe(10);
  });

  it('enregistre l’estimation comme aliment manuel puis entrée du journal', async () => {
    const food = new FakeFoodRepository();

    const result = await savePhotoNutritionEstimateToJournal(
      {
        date: '2026-07-04',
        mealSlot: 'lunch',
        estimate: {
          name: 'Repas test',
          amount: 300,
          nutrition: { caloriesKcal: 600, proteinGrams: 30, carbohydratesGrams: 70, fatGrams: 20 },
        },
      },
      { food },
    );

    expect(result.product.name).toBe('Repas test');
    expect(result.entry.date).toBe('2026-07-04');
    expect(result.entry.mealSlot).toBe('lunch');
    if (result.entry.reference.sourceType !== 'product') throw new Error('Entrée produit attendue.');
    expect(result.entry.reference.inputQuantity).toBe(300);
  });

  it('convertit une indisponibilité réseau future en message exploitable', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const distantPort: PhotoNutritionAnalysisPort = { async analyze() { throw new Error('fetch failed'); } };

    await expect(analyzePhotoNutrition(imageFile('repas.jpg'), distantPort)).rejects.toThrow('Réseau indisponible');
  });
});
