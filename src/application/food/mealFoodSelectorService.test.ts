import type { FoodProduct } from '@/domain/models/food';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import {
  filterMealFoodProducts,
  loadMealFoodSelectorData,
} from '@/application/food/mealFoodSelectorService';

function product(
  id: string,
  name: string,
  options: { brand?: string; barcode?: string; favorite?: boolean } = {},
): FoodProduct {
  return {
    id,
    name,
    ...(options.brand ? { brand: options.brand } : {}),
    ...(options.barcode ? { barcode: options.barcode } : {}),
    basisUnit: 'g',
    nutritionPer100: {
      caloriesKcal: 100,
      proteinGrams: 5,
      carbohydratesGrams: 10,
      fatGrams: 2,
    },
    source: { type: 'manual' },
    isNutritionComplete: true,
    isFavorite: options.favorite ?? false,
    isArchived: false,
    createdAt: '2026-06-24T10:00:00.000Z',
    updatedAt: '2026-06-24T10:00:00.000Z',
  };
}

describe('mealFoodSelectorService', () => {
  it('sépare les aliments favoris et conserve l’ordre des aliments récents', async () => {
    const banana = product('banana', 'Banane');
    const yogurt = product('yogurt', 'Yaourt grec', { favorite: true });
    const rice = product('rice', 'Riz complet');
    const food = {
      listProducts: vi.fn().mockResolvedValue([rice, banana, yogurt]),
      listRecentProducts: vi.fn().mockResolvedValue([rice, banana]),
    } as unknown as FoodRepository;

    const result = await loadMealFoodSelectorData({ food });

    expect(result.recentProducts.map((item) => item.id)).toEqual(['rice', 'banana']);
    expect(result.favoriteProducts.map((item) => item.id)).toEqual(['yogurt']);
    expect(result.allProducts.map((item) => item.id)).toEqual(['yogurt', 'banana', 'rice']);
    expect(food.listRecentProducts).toHaveBeenCalledWith(8);
  });

  it('recherche sans tenir compte des accents dans le nom, la marque ou le code-barres', () => {
    const products = [
      product('cereal', 'Céréales complètes', { brand: 'Énergie', barcode: '3012345678901' }),
      product('milk', 'Lait demi-écrémé'),
    ];

    expect(filterMealFoodProducts(products, 'cereales')).toEqual([products[0]]);
    expect(filterMealFoodProducts(products, 'energie')).toEqual([products[0]]);
    expect(filterMealFoodProducts(products, '301234')).toEqual([products[0]]);
  });
});
