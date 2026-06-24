import {
  applyFavoriteMeal,
  calculateFavoriteMealNutrition,
  listFavoriteMealSummaries,
  saveMealAsFavorite,
} from '@/application/food/favoriteMealService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';

function createDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-favorite-service-${crypto.randomUUID()}`);
}

describe('service de repas favoris', () => {
  let database: AppDatabase;
  let food: DexieFoodRepository;

  beforeEach(async () => {
    database = createDatabase();
    await database.open();
    food = new DexieFoodRepository(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  async function prepareMeal() {
    const product = await food.createProduct({
      name: 'Yaourt',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 100,
        proteinGrams: 8,
        carbohydratesGrams: 10,
        fatGrams: 3,
      },
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });
    const meal = await food.getOrCreateMeal('2026-06-23', 'breakfast');
    await food.createEntry({
      date: '2026-06-23',
      mealId: meal.id,
      mealSlot: 'breakfast',
      sourceType: 'product',
      reference: {
        sourceType: 'product',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 150,
        normalizedAmount: 150,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: product.nutritionPer100,
      },
    });
  }

  it('enregistre un repas existant comme favori', async () => {
    await prepareMeal();
    const favorite = await saveMealAsFavorite('2026-06-23', 'breakfast', 'Petit-déjeuner type', { food });
    expect(favorite.items).toHaveLength(1);
    expect(calculateFavoriteMealNutrition(favorite.items).caloriesKcal).toBe(150);
  });

  it('ajoute un favori à une autre journée sans écraser le journal', async () => {
    await prepareMeal();
    const favorite = await saveMealAsFavorite('2026-06-23', 'breakfast', 'Petit-déjeuner type', { food });
    const count = await applyFavoriteMeal(favorite.id, '2026-06-24', 'snacks', { food });
    const entries = await food.listEntriesByDate('2026-06-24');
    expect(count).toBe(1);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.mealSlot).toBe('snacks');
  });

  it('liste les favoris avec leurs totaux', async () => {
    await prepareMeal();
    await saveMealAsFavorite('2026-06-23', 'breakfast', 'Petit-déjeuner type', { food });
    const summaries = await listFavoriteMealSummaries({ food });
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.totals.proteinGrams).toBe(12);
  });

  it('refuse d’enregistrer un repas vide', async () => {
    await expect(saveMealAsFavorite('2026-06-23', 'lunch', 'Vide', { food })).rejects.toThrow('aucune entrée');
  });
});
