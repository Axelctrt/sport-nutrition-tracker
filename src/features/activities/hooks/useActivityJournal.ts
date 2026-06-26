import { useCallback, useEffect, useState } from 'react';
import {
  createActivityFromDraft,
  deleteActivityAndRecalculate,
  type ActivityDraft,
} from '@/application/activities/activityService';
import { useProfile } from '@/app/providers/profile/useProfile';
import type { Activity } from '@/domain/models/activity';
import type { EntityId } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export type ActivityJournalStatus = 'loading' | 'ready' | 'error';

export interface ActivityJournalDependencies {
  activities: Pick<ActivityRepository, 'listByDate'>;
  createActivity: (
    source: Activity,
    profile: UserProfile,
  ) => Promise<Activity>;
  deleteActivity: (
    activityId: EntityId,
    profile: UserProfile,
  ) => Promise<void>;
}

function toDuplicateActivityDraft(activity: Activity): ActivityDraft {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    calculation: _calculation,
    rpe: _rpe,
    ...draft
  } = activity;

  return draft as ActivityDraft;
}

const defaultDependencies: ActivityJournalDependencies = {
  activities: repositories.activities,
  createActivity: async (source, profile) =>
    createActivityFromDraft(toDuplicateActivityDraft(source), profile),
  deleteActivity: deleteActivityAndRecalculate,
};

export function useActivityJournal(
  date: string,
  dependencies: ActivityJournalDependencies = defaultDependencies,
) {
  const { profile } = useProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState<ActivityJournalStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setStatus('loading');
    }
    setErrorMessage(undefined);

    try {
      setActivities(await dependencies.activities.listByDate(date));
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Les activités de cette journée ne peuvent pas être chargées.',
      );
      if (showLoading) {
        setStatus('error');
      }
    }
  }, [date, dependencies.activities]);

  useEffect(() => {
    void load(true);
  }, [load]);

  const refresh = useCallback(async () => {
    await load(status !== 'ready');
  }, [load, status]);

  const duplicate = useCallback(async (activityId: string) => {
    if (!profile) {
      return undefined;
    }

    const source = activities.find((activity) => activity.id === activityId);
    if (!source) {
      setErrorMessage('Cette activité est introuvable ou a déjà été supprimée.');
      return undefined;
    }

    setBusyId(`duplicate-${activityId}`);
    setErrorMessage(undefined);
    try {
      const created = await dependencies.createActivity(source, profile);
      setActivities(await dependencies.activities.listByDate(date));
      setStatus('ready');
      return created;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Cette activité ne peut pas être dupliquée.',
      );
      return undefined;
    } finally {
      setBusyId(undefined);
    }
  }, [activities, date, dependencies, profile]);

  const remove = useCallback(async (activityId: string) => {
    if (!profile) {
      return false;
    }

    setBusyId(`delete-${activityId}`);
    setErrorMessage(undefined);
    try {
      await dependencies.deleteActivity(activityId, profile);
      setActivities((current) => current.filter((activity) => activity.id !== activityId));
      setStatus('ready');
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Cette activité ne peut pas être supprimée.',
      );
      return false;
    } finally {
      setBusyId(undefined);
    }
  }, [dependencies, profile]);

  const deletingId = busyId?.startsWith('delete-')
    ? busyId.slice('delete-'.length)
    : undefined;

  return {
    activities,
    status,
    errorMessage,
    busyId,
    deletingId,
    refresh,
    duplicate,
    remove,
  };
}
