import { useCallback, useEffect, useState } from 'react';
import {
  loadProgressionHubSummary,
  type ProgressionHubSummary,
} from '@/application/progression/progressionHubSummaryService';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export function useProgressionHubSummary(
  referenceDate: LocalDate,
  profile: UserProfile | undefined,
) {
  const [data, setData] = useState<ProgressionHubSummary>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    if (!profile) return;

    setStatus('loading');
    setErrorMessage(undefined);

    try {
      setData(await loadProgressionHubSummary(referenceDate, profile));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'La synthèse de progression ne peut pas être chargée.',
      );
      setStatus('error');
    }
  }, [profile, referenceDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, errorMessage, refresh };
}
