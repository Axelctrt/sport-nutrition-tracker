import { lookupFoodProductByBarcode } from '@/application/open-food-facts/barcodeProductLookupService';
import type { FoodProduct } from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';

const localProduct: FoodProduct = {
  id: 'product-local',
  createdAt: '2026-06-24T12:00:00.000Z',
  updatedAt: '2026-06-24T12:00:00.000Z',
  name: 'Produit local',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 100,
    proteinGrams: 5,
    carbohydratesGrams: 10,
    fatGrams: 3,
  },
  barcode: '3017624010701',
  source: { type: 'manual' },
  isNutritionComplete: true,
  isFavorite: false,
  isArchived: false,
};

const remoteCandidate: OpenFoodFactsProductCandidate = {
  barcode: '3017624010701',
  name: 'Produit distant',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 110,
    proteinGrams: 6,
    carbohydratesGrams: 11,
    fatGrams: 4,
  },
  isNutritionComplete: true,
  missingNutritionFields: [],
  fetchedAt: '2026-06-24T12:00:00.000Z',
};

function dependencies(options: {
  product?: FoodProduct;
  online?: boolean;
  candidate?: OpenFoodFactsProductCandidate;
} = {}) {
  const food = {
    findProductByBarcode: vi.fn(async () => options.product),
  } as unknown as FoodRepository;
  const getRemoteProduct = vi.fn(async () => options.candidate);
  const saveRemoteProduct = vi.fn(async () => ({
    product: { ...localProduct, name: 'Produit distant', source: { type: 'openFoodFacts' as const, fetchedAt: remoteCandidate.fetchedAt, barcode: remoteCandidate.barcode } },
    status: 'created' as const,
  }));

  return {
    food,
    getRemoteProduct,
    saveRemoteProduct,
    isOnline: () => options.online ?? true,
  };
}

describe('lookupFoodProductByBarcode', () => {
  it('utilise le produit local avant tout appel externe', async () => {
    const deps = dependencies({ product: localProduct, online: false });

    const result = await lookupFoodProductByBarcode('3017624010701', undefined, deps);

    expect(result).toMatchObject({ status: 'local', product: localProduct });
    expect(deps.getRemoteProduct).not.toHaveBeenCalled();
  });

  it('signale clairement un code absent hors connexion', async () => {
    const deps = dependencies({ online: false });

    await expect(lookupFoodProductByBarcode('3017624010701', undefined, deps)).resolves.toEqual({
      status: 'offline-missing',
      barcode: '3017624010701',
    });
    expect(deps.getRemoteProduct).not.toHaveBeenCalled();
  });

  it('enregistre localement un produit trouvé dans Open Food Facts', async () => {
    const deps = dependencies({ candidate: remoteCandidate });

    const result = await lookupFoodProductByBarcode('3017624010701', undefined, deps);

    expect(deps.getRemoteProduct).toHaveBeenCalledWith('3017624010701', undefined);
    expect(deps.saveRemoteProduct).toHaveBeenCalledWith(remoteCandidate, deps.food);
    expect(result).toMatchObject({ status: 'remote', saveStatus: 'created' });
  });

  it('signale un produit absent d’Open Food Facts', async () => {
    const deps = dependencies();

    await expect(lookupFoodProductByBarcode('3017624010701', undefined, deps)).resolves.toEqual({
      status: 'not-found',
      barcode: '3017624010701',
    });
  });

  it('ne réactive pas silencieusement un produit archivé', async () => {
    const archived = { ...localProduct, isArchived: true };
    const deps = dependencies({ product: archived });

    const result = await lookupFoodProductByBarcode('3017624010701', undefined, deps);

    expect(result).toMatchObject({ status: 'archived', product: archived });
    expect(deps.getRemoteProduct).not.toHaveBeenCalled();
  });
});
