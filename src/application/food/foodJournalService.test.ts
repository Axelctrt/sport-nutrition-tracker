import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import {
  copyDay,
  copyMeal,
  duplicateFoodEntry,
  loadFoodJournal,
  saveProductEntry,
  setJournalComplete,
} from '@/application/food/foodJournalService';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-food-service-${crypto.randomUUID()}`);
}

describe('foodJournalService', () => {
  let database: AppDatabase;
  let food: DexieFoodRepository;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.open();
    food = new DexieFoodRepository(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  async function createProduct() {
    return food.createProduct({
      name: 'Riz cuit',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 130,
        proteinGrams: 2.7,
        carbohydratesGrams: 28,
        fatGrams: 0.3,
      },
      servingSize: 150,
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });
  }

  it('ajoute un produit avec un snapshot nutritionnel et marque la journée incomplète', async () => {
    const product = await createProduct();
    const entry = await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'lunch',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 200,
      },
      { food },
    );

    expect(entry.reference).toMatchObject({
      sourceType: 'product',
      normalizedAmount: 200,
    });
    expect(await food.getJournalStatus('2026-06-23')).toMatchObject({
      isComplete: false,
    });
  });

  it('calcule les totaux de la journée', async () => {
    const product = await createProduct();
    await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'lunch',
        productId: product.id,
        inputMode: 'servings',
        inputQuantity: 2,
      },
      { food },
    );

    const journal = await loadFoodJournal('2026-06-23', { food });
    expect(journal.totals.caloriesKcal).toBe(390);
    expect(journal.meals.find((meal) => meal.slot === 'lunch')?.entries).toHaveLength(1);
  });

  it('marque les deux journées incomplètes lorsqu’une entrée change de date', async () => {
    const product = await createProduct();
    const source = await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'lunch',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 100,
      },
      { food },
    );
    await setJournalComplete('2026-06-23', true, { food });

    await saveProductEntry(
      {
        entryId: source.id,
        date: '2026-06-24',
        mealSlot: 'dinner',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 120,
      },
      { food },
    );

    expect(await food.getJournalStatus('2026-06-23')).toMatchObject({ isComplete: false });
    expect(await food.getJournalStatus('2026-06-24')).toMatchObject({ isComplete: false });
  });

  it('duplique une entrée dans le même repas', async () => {
    const product = await createProduct();
    const source = await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'breakfast',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 100,
      },
      { food },
    );

    const duplicate = await duplicateFoodEntry(source.id, { food });
    expect(duplicate.id).not.toBe(source.id);
    expect(await food.listEntriesByDate('2026-06-23')).toHaveLength(2);
  });

  it('copie un repas vers une autre date et un autre emplacement', async () => {
    const product = await createProduct();
    await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'lunch',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 100,
      },
      { food },
    );

    expect(
      await copyMeal(
        {
          sourceDate: '2026-06-23',
          sourceSlot: 'lunch',
          targetDate: '2026-06-24',
          targetSlot: 'dinner',
        },
        { food },
      ),
    ).toBe(1);
    expect((await food.listEntriesByDate('2026-06-24'))[0]?.mealSlot).toBe('dinner');
  });

  it('copie toute une journée sans remplacer les entrées cibles', async () => {
    const product = await createProduct();
    await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'breakfast',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 100,
      },
      { food },
    );
    await saveProductEntry(
      {
        date: '2026-06-23',
        mealSlot: 'dinner',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 200,
      },
      { food },
    );

    expect(await copyDay('2026-06-23', '2026-06-24', { food })).toBe(2);
    expect(await food.listEntriesByDate('2026-06-24')).toHaveLength(2);
    await expect(copyDay('2026-06-23', '2026-06-23', { food })).rejects.toThrow('autre date');
  });

  it('marque explicitement la journée comme terminée', async () => {
    const status = await setJournalComplete('2026-06-23', true, { food });
    expect(status.isComplete).toBe(true);
    expect(status.completedAt).toBeDefined();
  });
});
