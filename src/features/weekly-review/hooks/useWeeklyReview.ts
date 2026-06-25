import { useCallback, useEffect, useState } from 'react';
import {
  acceptWeeklyReview,
  loadWeeklyReview,
  rejectWeeklyReview,
  type WeeklyReviewSnapshot,
} from '@/application/weekly-review/weeklyReviewService';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export function useWeeklyReview(referenceDate: LocalDate, profile: UserProfile | undefined) {
  const [data, setData] = useState<WeeklyReviewSnapshot>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [actionStatus, setActionStatus] = useState<'idle' | 'accepting' | 'rejecting'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();

  const load = useCallback(async (silent = false) => {
    if (!profile) return;
    if (!silent) setStatus('loading');
    setErrorMessage(undefined);
    try {
      setData(await loadWeeklyReview(referenceDate, profile));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger le bilan hebdomadaire.');
      if (!silent) setStatus('error');
    }
  }, [profile, referenceDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const accept = useCallback(async () => {
    if (!data) return;
    setActionStatus('accepting');
    setErrorMessage(undefined);
    try {
      await acceptWeeklyReview(data.review.weekStart);
      await load(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d’accepter la proposition.');
    } finally {
      setActionStatus('idle');
    }
  }, [data, load]);

  const reject = useCallback(async () => {
    if (!data) return;
    setActionStatus('rejecting');
    setErrorMessage(undefined);
    try {
      await rejectWeeklyReview(data.review.weekStart);
      await load(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de refuser la proposition.');
    } finally {
      setActionStatus('idle');
    }
  }, [data, load]);

  return { data, status, actionStatus, errorMessage, refresh, accept, reject };
}
