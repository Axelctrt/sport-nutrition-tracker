import { saveOpenFoodFactsProduct } from '@/application/open-food-facts/openFoodFactsProductService';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { appDatabase } from '@/infrastructure/database/database';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { repositories } from '@/infrastructure/repositories/repositories';

const candidate: OpenFoodFactsProductCandidate = {
  barcode: '3017624010701',
  name: 'Produit OFF',
  brand: 'Marque',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 100,
    proteinGrams: 4,
    carbohydratesGrams: 12,
    fatGrams: 3,
  },
  servingSize: 30,
  isNutritionComplete: true,
  missingNutritionFields: [],
  fetchedAt: '2026-06-23T12:00:00.000Z',
};

describe('saveOpenFoodFactsProduct', () => {
  beforeEach(async () => {
    appDatabase.close();
    await appDatabase.delete();
    await initializeDatabase();
  });

  afterEach(() => appDatabase.close());

  it('crée un produit local provenant d’Open Food Facts', async () => {
    const result = await saveOpenFoodFactsProduct(candidate, repositories.food);

    expect(result.status).toBe('created');
    expect(result.product).toMatchObject({
      name: 'Produit OFF',
      barcode: '3017624010701',
      source: { type: 'openFoodFacts' },
      isNutritionComplete: true,
    });
  });

  it('met à jour un produit Open Food Facts déjà enregistré', async () => {
    const first = await saveOpenFoodFactsProduct(candidate, repositories.food);
    const result = await saveOpenFoodFactsProduct(
      {
        ...candidate,
        name: 'Produit actualisé',
        nutritionPer100: { ...candidate.nutritionPer100, caloriesKcal: 120 },
      },
      repositories.food,
    );

    expect(result.status).toBe('updated');
    expect(result.product.id).toBe(first.product.id);
    expect(result.product.name).toBe('Produit actualisé');
    expect(result.product.nutritionPer100.caloriesKcal).toBe(120);
  });

  it('ne remplace pas silencieusement un aliment manuel portant le même code', async () => {
    const manual = await repositories.food.createProduct({
      name: 'Produit manuel',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 90,
        proteinGrams: 1,
        carbohydratesGrams: 2,
        fatGrams: 3,
      },
      barcode: candidate.barcode,
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: true,
      isArchived: false,
    });

    const result = await saveOpenFoodFactsProduct(candidate, repositories.food);

    expect(result.status).toBe('existing-manual');
    expect(result.product.id).toBe(manual.id);
    expect(result.product.name).toBe('Produit manuel');
  });
});
