import { useCallback, useEffect, useState } from 'react';

import {
  loadProgressInsights,
} from '@/application/analytics/progressInsightsService';
import type { ProgressInsights } from '@/domain/analytics/progressInsights';
import type { LocalDate } from '@/domain/models/common';

export function useProgressInsights(referenceDate: LocalDate) {
  const [data, setData] = useState<ProgressInsights>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      setData(await loadProgressInsights(referenceDate));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger l’adhérence et les records.',
      );
      setStatus('error');
    }
  }, [referenceDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, errorMessage, refresh };
}
