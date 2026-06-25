import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createRecipeSummary } from '@/test/factories/foodLibraryFactory';

const mocks = vi.hoisted(() => ({
  listRecipeSummaries: vi.fn(),
  deleteRecipe: vi.fn(),
}));

vi.mock('@/application/recipes/recipeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/application/recipes/recipeService')>();
  return {
    ...actual,
    listRecipeSummaries: mocks.listRecipeSummaries,
    deleteRecipe: mocks.deleteRecipe,
  };
});

import { useRecipes } from '@/features/recipes/hooks/useRecipes';

const first = createRecipeSummary();
const second = createRecipeSummary({
  recipe: { ...first.recipe, id: 'recipe-2', name: 'Porridge' },
});

describe('useRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRecipeSummaries.mockResolvedValue([second, first]);
    mocks.deleteRecipe.mockResolvedValue(undefined);
  });

  it('supprime localement sans relancer le chargement', async () => {
    const { result } = renderHook(() => useRecipes());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.recipes.map((summary) => summary.recipe.name)).toEqual(['Bowl protéiné', 'Porridge']);

    await act(async () => {
      await result.current.remove('recipe-1');
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.recipes.map((summary) => summary.recipe.id)).toEqual(['recipe-2']);
    expect(mocks.listRecipeSummaries).toHaveBeenCalledTimes(1);
  });
});
