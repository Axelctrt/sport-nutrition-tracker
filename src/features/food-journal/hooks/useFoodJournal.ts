import { useCallback, useEffect, useState } from 'react';
import {
  copyDay,
  copyMeal,
  duplicateFoodEntry,
  loadFoodJournal,
  removeFoodEntry,
  saveProductEntry,
  setJournalComplete,
  type CopyMealInput,
  type FoodEntryWithProduct,
  type FoodJournalSnapshot,
} from '@/application/food/foodJournalService';
import { saveMealAsFavorite } from '@/application/food/favoriteMealService';
import { saveRecipeEntry } from '@/application/recipes/recipeService';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { MealSlot } from '@/domain/models/food';
import { useToast } from '@/shared/toast/useToast';

interface RefreshOptions {
  silent?: boolean;
}

export function useFoodJournal(date: LocalDate) {
  const [snapshot, setSnapshot] = useState<FoodJournalSnapshot>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const toast = useToast();

  const refresh = useCallback(async ({ silent = false }: RefreshOptions = {}) => {
    if (!silent) setStatus('loading');
    setErrorMessage(undefined);
    try {
      setSnapshot(await loadFoodJournal(date));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger le journal alimentaire.');
      setStatus('error');
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(async <T,>(
    key: string,
    operation: () => Promise<T>,
    successMessage?: string,
  ): Promise<T | undefined> => {
    setBusyId(key);
    setErrorMessage(undefined);
    try {
      const result = await operation();
      await refresh({ silent: true });
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'L’opération alimentaire a échoué.');
      return undefined;
    } finally {
      setBusyId(undefined);
    }
  }, [refresh, toast]);

  const updateQuantity = useCallback((item: FoodEntryWithProduct, quantity: number) => {
    const { entry } = item;
    const reference = entry.reference;
    if (reference.sourceType === 'recipe') {
      return run(`update-${entry.id}`, () => saveRecipeEntry({
        entryId: entry.id,
        recipeId: reference.recipeId,
        date: entry.date,
        mealSlot: entry.mealSlot,
        servingsConsumed: quantity,
      }), 'Quantité mise à jour');
    }

    return run(`update-${entry.id}`, () => saveProductEntry({
      entryId: entry.id,
      date: entry.date,
      mealSlot: entry.mealSlot,
      productId: reference.productId,
      inputMode: reference.inputMode,
      inputQuantity: quantity,
    }), 'Quantité mise à jour');
  }, [run]);

  return {
    snapshot,
    status,
    errorMessage,
    busyId,
    refresh,
    updateQuantity,
    duplicate: (id: EntityId) => run(`duplicate-${id}`, () => duplicateFoodEntry(id), 'Entrée dupliquée'),
    remove: (id: EntityId) => run(`delete-${id}`, () => removeFoodEntry(id), 'Entrée supprimée'),
    copyMealTo: (input: CopyMealInput) => run(`copy-meal-${input.sourceSlot}`, () => copyMeal(input), 'Repas copié'),
    copyDayTo: (targetDate: LocalDate) => run('copy-day', () => copyDay(date, targetDate), 'Journée copiée'),
    toggleComplete: (complete: boolean) => run(
      'complete',
      () => setJournalComplete(date, complete),
      complete ? 'Journée terminée' : 'Journée rouverte',
    ),
    saveFavorite: (slot: MealSlot, name: string) => run(
      `favorite-${slot}`,
      () => saveMealAsFavorite(date, slot, name),
      'Repas enregistré dans les favoris',
    ),
  };
}
