import type { FoodProduct } from '@/domain/models/food';
import {
  saveOpenFoodFactsProduct,
  type SaveOpenFoodFactsProductStatus,
} from '@/application/open-food-facts/openFoodFactsProductService';
import { openFoodFactsClient } from '@/infrastructure/open-food-facts/OpenFoodFactsClient';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export type BarcodeProductLookupResult =
  | {
      status: 'local';
      barcode: string;
      product: FoodProduct;
    }
  | {
      status: 'remote';
      barcode: string;
      product: FoodProduct;
      saveStatus: SaveOpenFoodFactsProductStatus;
    }
  | {
      status: 'archived';
      barcode: string;
      product: FoodProduct;
    }
  | {
      status: 'offline-missing';
      barcode: string;
    }
  | {
      status: 'not-found';
      barcode: string;
    };

export interface BarcodeProductLookupDependencies {
  food: FoodRepository;
  getRemoteProduct: (
    barcode: string,
    signal?: AbortSignal,
  ) => Promise<OpenFoodFactsProductCandidate | undefined>;
  saveRemoteProduct: (
    candidate: OpenFoodFactsProductCandidate,
    foodRepository: FoodRepository,
  ) => Promise<{
    product: FoodProduct;
    status: SaveOpenFoodFactsProductStatus;
  }>;
  isOnline: () => boolean;
}

const defaultDependencies: BarcodeProductLookupDependencies = {
  food: repositories.food,
  getRemoteProduct: (barcode, signal) => openFoodFactsClient.getProductByBarcode(barcode, signal),
  saveRemoteProduct: saveOpenFoodFactsProduct,
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
};

export async function lookupFoodProductByBarcode(
  barcode: string,
  signal?: AbortSignal,
  dependencies: BarcodeProductLookupDependencies = defaultDependencies,
): Promise<BarcodeProductLookupResult> {
  const normalizedBarcode = normalizeOpenFoodFactsBarcode(barcode);
  const localProduct = await dependencies.food.findProductByBarcode(normalizedBarcode);

  if (localProduct && !localProduct.isArchived) {
    return {
      status: 'local',
      barcode: normalizedBarcode,
      product: localProduct,
    };
  }

  if (localProduct?.isArchived) {
    return {
      status: 'archived',
      barcode: normalizedBarcode,
      product: localProduct,
    };
  }

  if (!dependencies.isOnline()) {
    return {
      status: 'offline-missing',
      barcode: normalizedBarcode,
    };
  }

  const candidate = await dependencies.getRemoteProduct(normalizedBarcode, signal);
  if (!candidate) {
    return {
      status: 'not-found',
      barcode: normalizedBarcode,
    };
  }

  const saved = await dependencies.saveRemoteProduct(candidate, dependencies.food);
  return {
    status: 'remote',
    barcode: normalizedBarcode,
    product: saved.product,
    saveStatus: saved.status,
  };
}
