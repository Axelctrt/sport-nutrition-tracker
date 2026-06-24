import { useCallback, useEffect, useState } from 'react';
import {
  loadMealFoodSelectorData,
  type MealFoodSelectorData,
} from '@/application/food/mealFoodSelectorService';

export function useMealFoodSelector() {
  const [data, setData] = useState<MealFoodSelectorData>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      setData(await loadMealFoodSelectorData());
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les aliments disponibles.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, errorMessage, refresh };
}
