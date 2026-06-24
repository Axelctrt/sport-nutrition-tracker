import { useCallback, useEffect, useState } from 'react';
import {
  copyDay,
  copyMeal,
  duplicateFoodEntry,
  loadFoodJournal,
  removeFoodEntry,
  setJournalComplete,
  type CopyMealInput,
  type FoodJournalSnapshot,
} from '@/application/food/foodJournalService';
import type { EntityId, LocalDate } from '@/domain/models/common';
import type { MealSlot } from '@/domain/models/food';
import { saveMealAsFavorite } from '@/application/food/favoriteMealService';

export function useFoodJournal(date: LocalDate) {
  const [snapshot, setSnapshot] = useState<FoodJournalSnapshot>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
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

  const run = useCallback(async (key: string, operation: () => Promise<unknown>) => {
    setBusyId(key);
    setErrorMessage(undefined);
    try {
      await operation();
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'L’opération alimentaire a échoué.');
    } finally {
      setBusyId(undefined);
    }
  }, [refresh]);

  return {
    snapshot,
    status,
    errorMessage,
    busyId,
    refresh,
    duplicate: (id: EntityId) => run(`duplicate-${id}`, () => duplicateFoodEntry(id)),
    remove: (id: EntityId) => run(`delete-${id}`, () => removeFoodEntry(id)),
    copyMealTo: (input: CopyMealInput) => run(`copy-meal-${input.sourceSlot}`, () => copyMeal(input)),
    copyDayTo: (targetDate: LocalDate) => run('copy-day', () => copyDay(date, targetDate)),
    toggleComplete: (complete: boolean) => run('complete', () => setJournalComplete(date, complete)),
    saveFavorite: (slot: MealSlot, name: string) => run(`favorite-${slot}`, () => saveMealAsFavorite(date, slot, name)),
  };
}
