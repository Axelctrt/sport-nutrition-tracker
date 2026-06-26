import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createFoodProduct } from '@/test/factories/foodLibraryFactory';

const mocks = vi.hoisted(() => ({
  listProducts: vi.fn(),
  archiveProduct: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/repositories', () => ({
  repositories: {
    food: {
      listProducts: mocks.listProducts,
      archiveProduct: mocks.archiveProduct,
    },
  },
}));

import { useFoodProducts } from '@/features/products/hooks/useFoodProducts';

const yogurt = createFoodProduct({ id: 'yogurt', name: 'Yaourt grec' });
const rice = createFoodProduct({ id: 'rice', name: 'Riz basmati', brand: 'Maison' });

describe('useFoodProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProducts.mockResolvedValue([rice, yogurt]);
    mocks.archiveProduct.mockResolvedValue({ ...yogurt, isArchived: true });
  });

  it('filtre localement et archive sans repasser en chargement', async () => {
    const { result, rerender } = renderHook(({ query }) => useFoodProducts(query), {
      initialProps: { query: '' },
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.allProducts).toHaveLength(2);

    rerender({ query: 'yaourt' });
    expect(result.current.products.map((product) => product.id)).toEqual(['yogurt']);
    expect(mocks.listProducts).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.archive('yogurt');
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.allProducts.map((product) => product.id)).toEqual(['rice']);
    expect(mocks.listProducts).toHaveBeenCalledTimes(1);
  });
});
