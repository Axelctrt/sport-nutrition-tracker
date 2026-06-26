import { useCallback, useEffect, useState } from 'react';
import {
  deleteRecipe,
  listRecipeSummaries,
  type RecipeSummary,
} from '@/application/recipes/recipeService';

function sortRecipes(recipes: readonly RecipeSummary[]): RecipeSummary[] {
  return [...recipes].sort((left, right) => left.recipe.name.localeCompare(right.recipe.name, 'fr'));
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setRecipes(sortRecipes(await listRecipeSummaries()));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les recettes.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(async (recipeId: string): Promise<boolean> => {
    setBusyId(recipeId);
    setErrorMessage(undefined);
    try {
      await deleteRecipe(recipeId);
      setRecipes((current) => current.filter((summary) => summary.recipe.id !== recipeId));
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de supprimer la recette.');
      return false;
    } finally {
      setBusyId(undefined);
    }
  }, []);

  return {
    recipes,
    status,
    errorMessage,
    busyId,
    refresh,
    remove,
  };
}
