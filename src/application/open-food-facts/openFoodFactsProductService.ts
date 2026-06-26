import {
  mergeRemoteFoodProductFields,
} from '@/domain/food/foodProductFields';
import type {
  FoodProduct,
  FoodProductLocalOverrideField,
} from '@/domain/models/food';
import type { OpenFoodFactsProductCandidate } from '@/infrastructure/open-food-facts/OpenFoodFactsMapper';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';

export type SaveOpenFoodFactsProductStatus = 'created' | 'updated' | 'existing-manual';

export interface SaveOpenFoodFactsProductResult {
  product: FoodProduct;
  status: SaveOpenFoodFactsProductStatus;
}

function candidateFields(candidate: OpenFoodFactsProductCandidate) {
  return {
    name: candidate.name,
    ...(candidate.brand === undefined ? {} : { brand: candidate.brand }),
    basisUnit: candidate.basisUnit,
    nutritionPer100: candidate.nutritionPer100,
    ...(candidate.servingSize === undefined ? {} : { servingSize: candidate.servingSize }),
    ...(candidate.servingLabel === undefined ? {} : { servingLabel: candidate.servingLabel }),
  };
}

function isCompleteAfterOverrides(
  candidate: OpenFoodFactsProductCandidate,
  localOverrides: readonly FoodProductLocalOverrideField[],
): boolean {
  if (candidate.isNutritionComplete) return true;
  const overrides = new Set(localOverrides);
  return candidate.missingNutritionFields.every((field) => overrides.has(field));
}

function createRemoteProductInput(
  candidate: OpenFoodFactsProductCandidate,
  normalizedBarcode: string,
  existing?: FoodProduct,
  preserveLocalOverrides = true,
) {
  const localOverrides = preserveLocalOverrides ? (existing?.localOverrides ?? []) : [];
  const remoteFields = candidateFields(candidate);
  const fields = existing && preserveLocalOverrides
    ? mergeRemoteFoodProductFields(existing, remoteFields, localOverrides)
    : remoteFields;

  return {
    ...fields,
    barcode: normalizedBarcode,
    source: {
      type: 'openFoodFacts' as const,
      fetchedAt: candidate.fetchedAt,
      barcode: normalizedBarcode,
    },
    isNutritionComplete: isCompleteAfterOverrides(candidate, localOverrides),
    ...(localOverrides.length === 0 ? {} : { localOverrides }),
    isFavorite: existing?.isFavorite ?? false,
    isArchived: false,
  };
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

  const productInput = createRemoteProductInput(candidate, normalizedBarcode, existing);

  if (existing) {
    const product = await foodRepository.updateProduct(existing.id, productInput);
    return { product, status: 'updated' };
  }

  const product = await foodRepository.createProduct(productInput);
  return { product, status: 'created' };
}

export interface RefreshOpenFoodFactsProductResult {
  product: FoodProduct;
  preservedLocalOverrides: FoodProductLocalOverrideField[];
}

export async function refreshOpenFoodFactsProduct(
  product: FoodProduct,
  foodRepository: FoodRepository,
  getRemoteProduct: (
    barcode: string,
    signal?: AbortSignal,
  ) => Promise<OpenFoodFactsProductCandidate | undefined>,
  options: {
    preserveLocalOverrides?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<RefreshOpenFoodFactsProductResult> {
  if (product.source.type !== 'openFoodFacts') {
    throw new Error('Seuls les produits Open Food Facts peuvent être actualisés.');
  }

  const sourceBarcode = product.barcode ?? product.source.barcode;
  if (!sourceBarcode) {
    throw new Error('Ce produit ne possède pas de code-barres utilisable.');
  }

  const normalizedBarcode = normalizeOpenFoodFactsBarcode(sourceBarcode);
  const candidate = await getRemoteProduct(normalizedBarcode, options.signal);
  if (!candidate) {
    throw new Error('Ce produit n’est plus disponible sur Open Food Facts.');
  }

  const preserveLocalOverrides = options.preserveLocalOverrides !== false;
  const productInput = createRemoteProductInput(
    candidate,
    normalizedBarcode,
    product,
    preserveLocalOverrides,
  );
  const { localOverrides: ignoredLocalOverrides, ...productInputWithoutOverrides } = productInput;
  void ignoredLocalOverrides;
  const updated = await foodRepository.updateProduct(
    product.id,
    preserveLocalOverrides
      ? productInput
      : { ...productInputWithoutOverrides, localOverrides: [] },
  );

  return {
    product: updated,
    preservedLocalOverrides: preserveLocalOverrides ? (product.localOverrides ?? []) : [],
  };
}
