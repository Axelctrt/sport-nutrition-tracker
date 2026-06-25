import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createFavoriteMealSummary } from '@/test/factories/foodLibraryFactory';

const mocks = vi.hoisted(() => ({
  listFavoriteMealSummaries: vi.fn(),
  applyFavoriteMeal: vi.fn(),
  deleteFavoriteMeal: vi.fn(),
}));

vi.mock('@/application/food/favoriteMealService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/application/food/favoriteMealService')>();
  return {
    ...actual,
    listFavoriteMealSummaries: mocks.listFavoriteMealSummaries,
    applyFavoriteMeal: mocks.applyFavoriteMeal,
    deleteFavoriteMeal: mocks.deleteFavoriteMeal,
  };
});

import { useFavoriteMeals } from '@/features/favorite-meals/hooks/useFavoriteMeals';

const favorite = createFavoriteMealSummary();

describe('useFavoriteMeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFavoriteMealSummaries.mockResolvedValue([favorite]);
    mocks.applyFavoriteMeal.mockResolvedValue(1);
    mocks.deleteFavoriteMeal.mockResolvedValue(undefined);
  });

  it('ajoute au journal et supprime sans recharger la liste', async () => {
    const { result } = renderHook(() => useFavoriteMeals());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    let count: number | undefined;
    await act(async () => {
      count = await result.current.apply('favorite-1', '2026-06-25', 'breakfast');
    });
    expect(count).toBe(1);
    expect(result.current.status).toBe('ready');

    await act(async () => {
      await result.current.remove('favorite-1');
    });
    expect(result.current.favorites).toEqual([]);
    expect(mocks.listFavoriteMealSummaries).toHaveBeenCalledTimes(1);
  });
});
