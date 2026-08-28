import { useCallback, useEffect, useState } from 'react';
import { loadCoachHub } from '@/application/coach/coachHubService';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export function useCoachHub(
  referenceDate: LocalDate,
  profile: UserProfile | undefined,
) {
  const [data, setData] = useState<CoachHubSnapshot>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    if (!profile) return;
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setData(await loadCoachHub(referenceDate, profile));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Le Coach ne peut pas être chargé pour le moment.',
      );
      setStatus('error');
    }
  }, [profile, referenceDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, errorMessage, refresh };
}
