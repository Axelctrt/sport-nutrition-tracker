import { useCallback, useEffect, useState } from 'react';
import { loadHistory } from '@/application/analytics/analyticsService';
import type { HistoryDaySummary } from '@/domain/models/analytics';
import type { LocalDate } from '@/domain/models/common';

export function useHistory(from: LocalDate, to: LocalDate) {
  const [days, setDays] = useState<HistoryDaySummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setDays(await loadHistory(from, to));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger l’historique.');
      setStatus('error');
    }
  }, [from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { days, status, errorMessage, refresh };
}
