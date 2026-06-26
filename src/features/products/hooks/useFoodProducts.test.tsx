import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createFoodProduct } from '@/test/factories/foodLibraryFactory';

import { useFoodProducts } from '@/features/products/hooks/useFoodProducts';
import { repositories } from '@/infrastructure/repositories/repositories';

const yogurt = createFoodProduct({ id: 'yogurt', name: 'Yaourt grec' });
const rice = createFoodProduct({ id: 'rice', name: 'Riz basmati', brand: 'Maison' });

describe('useFoodProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(repositories.food, 'listProducts').mockResolvedValue([rice, yogurt]);
    vi.spyOn(repositories.food, 'archiveProduct').mockResolvedValue({ ...yogurt, isArchived: true });
  });

  it('filtre localement et archive sans repasser en chargement', async () => {
    const { result, rerender } = renderHook(({ query }) => useFoodProducts(query), {
      initialProps: { query: '' },
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.allProducts).toHaveLength(2);

    rerender({ query: 'yaourt' });
    expect(result.current.products.map((product) => product.id)).toEqual(['yogurt']);
    expect(repositories.food.listProducts).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.archive('yogurt');
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.allProducts.map((product) => product.id)).toEqual(['rice']);
    expect(repositories.food.listProducts).toHaveBeenCalledTimes(1);
  });
});
