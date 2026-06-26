import type { EntityId } from '@/domain/models/common';
import type { FoodProduct } from '@/domain/models/food';
import { normalizeOpenFoodFactsBarcode } from '@/infrastructure/open-food-facts/barcode';

export type FoodProductDuplicateReason = 'barcode' | 'name-and-brand';

export interface FoodProductDuplicateMatch {
  product: FoodProduct;
  reason: FoodProductDuplicateReason;
}

interface FoodProductDuplicateCandidate {
  name: string;
  brand?: string;
  barcode?: string;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function findFoodProductDuplicates(
  candidate: FoodProductDuplicateCandidate,
  products: readonly FoodProduct[],
  excludeId?: EntityId,
): FoodProductDuplicateMatch[] {
  const normalizedName = normalizeText(candidate.name);
  const normalizedBrand = normalizeText(candidate.brand);
  const normalizedBarcode = candidate.barcode
    ? normalizeOpenFoodFactsBarcode(candidate.barcode)
    : undefined;

  return products.flatMap((product): FoodProductDuplicateMatch[] => {
    if (product.id === excludeId || product.isArchived) return [];
    if (
      normalizedBarcode
      && product.barcode
      && normalizeOpenFoodFactsBarcode(product.barcode) === normalizedBarcode
    ) {
      return [{ product, reason: 'barcode' }];
    }

    if (
      normalizedName.length > 0
      && normalizeText(product.name) === normalizedName
      && normalizeText(product.brand) === normalizedBrand
    ) {
      return [{ product, reason: 'name-and-brand' }];
    }

    return [];
  });
}
