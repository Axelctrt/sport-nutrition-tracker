import { useCallback, useEffect, useState } from 'react';
import {
  applyFavoriteMeal,
  deleteFavoriteMeal,
  listFavoriteMealSummaries,
  type FavoriteMealSummary,
} from '@/application/food/favoriteMealService';
import type { MealSlot } from '@/domain/models/food';

function sortFavorites(favorites: readonly FavoriteMealSummary[]): FavoriteMealSummary[] {
  return [...favorites].sort((left, right) => left.favoriteMeal.name.localeCompare(right.favoriteMeal.name, 'fr'));
}

export function useFavoriteMeals() {
  const [favorites, setFavorites] = useState<FavoriteMealSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setFavorites(sortFavorites(await listFavoriteMealSummaries()));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les repas favoris.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apply = useCallback(async (favoriteId: string, date: string, slot: MealSlot): Promise<number | undefined> => {
    setBusyId(`apply-${favoriteId}`);
    setErrorMessage(undefined);
    try {
      return await applyFavoriteMeal(favoriteId, date, slot);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d’ajouter ce favori.');
      return undefined;
    } finally {
      setBusyId(undefined);
    }
  }, []);

  const remove = useCallback(async (favoriteId: string): Promise<boolean> => {
    setBusyId(`delete-${favoriteId}`);
    setErrorMessage(undefined);
    try {
      await deleteFavoriteMeal(favoriteId);
      setFavorites((current) => current.filter((summary) => summary.favoriteMeal.id !== favoriteId));
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de supprimer ce favori.');
      return false;
    } finally {
      setBusyId(undefined);
    }
  }, []);

  return {
    favorites,
    status,
    errorMessage,
    busyId,
    refresh,
    apply,
    remove,
  };
}
