import type { FoodProduct } from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';

export type SaveOpenFoodFactsProductStatus = 'created' | 'updated' | 'existing-manual';

export interface SaveOpenFoodFactsProductResult {
  product: FoodProduct;
  status: SaveOpenFoodFactsProductStatus;
}

export async function saveOpenFoodFactsProduct(
  candidate: OpenFoodFactsProductCandidate,
  foodRepository: FoodRepository,
): Promise<SaveOpenFoodFactsProductResult> {
  const normalizedBarcode = normalizeOpenFoodFactsBarcode(candidate.barcode);
  const existing = await foodRepository.findProductByBarcode(normalizedBarcode);

  if (existing?.source.type === 'manual') {
    return { product: existing, status: 'existing-manual' };
  }

  const productInput = {
    name: candidate.name,
    ...(candidate.brand === undefined ? {} : { brand: candidate.brand }),
    basisUnit: candidate.basisUnit,
    nutritionPer100: candidate.nutritionPer100,
    ...(candidate.servingSize === undefined ? {} : { servingSize: candidate.servingSize }),
    barcode: normalizedBarcode,
    source: {
      type: 'openFoodFacts' as const,
      fetchedAt: candidate.fetchedAt,
      barcode: normalizedBarcode,
    },
    isNutritionComplete: candidate.isNutritionComplete,
    isFavorite: existing?.isFavorite ?? false,
    isArchived: false,
  };

  if (existing) {
    const product = await foodRepository.updateProduct(existing.id, productInput);
    return { product, status: 'updated' };
  }

  const product = await foodRepository.createProduct(productInput);
  return { product, status: 'created' };
}
