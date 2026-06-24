import { useCallback, useEffect, useState } from 'react';
import { deleteActivityAndRecalculate } from '@/application/activities/activityService';
import { useProfile } from '@/app/providers/profile/useProfile';
import type { Activity } from '@/domain/models/activity';
import { repositories } from '@/infrastructure/repositories/repositories';

export type ActivityJournalStatus = 'loading' | 'ready' | 'error';

export function useActivityJournal(date: string) {
  const { profile } = useProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState<ActivityJournalStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      setActivities(await repositories.activities.listByDate(date));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Les activités de cette journée ne peuvent pas être chargées.',
      );
      setStatus('error');
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(async (activityId: string) => {
    if (!profile) {
      return;
    }

    setDeletingId(activityId);
    setErrorMessage(undefined);
    try {
      await deleteActivityAndRecalculate(activityId, profile);
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Cette activité ne peut pas être supprimée.',
      );
      setStatus('error');
    } finally {
      setDeletingId(undefined);
    }
  }, [profile, refresh]);

  return {
    activities,
    status,
    errorMessage,
    deletingId,
    refresh,
    remove,
  };
}
