import type { FoodProduct } from '@/domain/models/food';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export interface MealFoodSelectorData {
  allProducts: FoodProduct[];
  favoriteProducts: FoodProduct[];
  recentProducts: FoodProduct[];
}

export interface MealFoodSelectorDependencies {
  food: FoodRepository;
}

const defaultDependencies: MealFoodSelectorDependencies = {
  food: repositories.food,
};

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim();
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;

  if (left.length === right.length) {
    const mismatches: number[] = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches.push(index);
    }
    if (mismatches.length === 2) {
      const firstMismatch = mismatches[0]!;
      const secondMismatch = mismatches[1]!;
      if (
        secondMismatch === firstMismatch + 1
        && left[firstMismatch] === right[secondMismatch]
        && left[secondMismatch] === right[firstMismatch]
      ) {
        return true;
      }
    }
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let differences = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    differences += 1;
    if (differences > 1) return false;

    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) differences += 1;
  return differences <= 1;
}

function matchesSearchToken(searchableText: string, token: string): boolean {
  if (searchableText.includes(token)) return true;
  if (token.length < 4) return false;

  return searchableText
    .split(/[^a-z0-9]+/u)
    .filter(Boolean)
    .some((word) => editDistanceAtMostOne(word, token));
}

function sortProducts(products: FoodProduct[]): FoodProduct[] {
  return [...products].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'fr');
  });
}

export async function loadMealFoodSelectorData(
  dependencies: MealFoodSelectorDependencies = defaultDependencies,
): Promise<MealFoodSelectorData> {
  const [allProducts, recentProducts] = await Promise.all([
    dependencies.food.listProducts(),
    dependencies.food.listRecentProducts(8),
  ]);

  return {
    allProducts: sortProducts(allProducts),
    favoriteProducts: sortProducts(allProducts.filter((product) => product.isFavorite)),
    recentProducts,
  };
}

export function filterMealFoodProducts(
  products: FoodProduct[],
  query: string,
): FoodProduct[] {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length === 0) {
    return products;
  }

  const queryTokens = normalizedQuery.split(/\s+/u).filter(Boolean);

  return products.filter((product) => {
    const searchableText = normalizeSearchText(
      `${product.name} ${product.brand ?? ''} ${product.barcode ?? ''}`,
    );
    return queryTokens.every((token) => matchesSearchToken(searchableText, token));
  });
}
