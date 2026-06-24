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

  return products.filter((product) => {
    const searchableText = normalizeSearchText(
      `${product.name} ${product.brand ?? ''} ${product.barcode ?? ''}`,
    );
    return searchableText.includes(normalizedQuery);
  });
}
