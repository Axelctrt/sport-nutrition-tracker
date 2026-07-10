import { useCallback, useEffect, useRef, useState } from 'react';

import { loadTrainingAgenda } from '@/features/dashboard/hooks/useTrainingAgenda';
import {
  buildSportHubSnapshot,
  type SportHubSnapshot,
} from '@/application/sport/sportHubService';
import { ENDURANCE_PLANNING_CHANGED_EVENT } from '@/domain/planning/endurancePlanningState';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export type SportHubLoader = (today: string) => Promise<SportHubSnapshot>;

export interface SportHubDependencies {
  activities: Pick<ActivityRepository, 'listAll'>;
  loadAgenda: typeof loadTrainingAgenda;
}

const defaultDependencies: SportHubDependencies = {
  activities: repositories.activities,
  loadAgenda: loadTrainingAgenda,
};

export async function loadSportHub(
  today: string,
  dependencies: SportHubDependencies = defaultDependencies,
): Promise<SportHubSnapshot> {
  const [activities, agenda] = await Promise.all([
    dependencies.activities.listAll(),
    dependencies.loadAgenda(today),
  ]);

  return buildSportHubSnapshot(activities, agenda, today);
}

export function useSportHub(loader: SportHubLoader = loadSportHub) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<SportHubSnapshot>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const snapshotRef = useRef<SportHubSnapshot | undefined>(undefined);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading || !snapshotRef.current) setStatus('loading');
    else setIsRefreshing(true);
    setErrorMessage(undefined);

    try {
      const nextSnapshot = await loader(toLocalDate());
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Le hub Sport ne peut pas être chargé.',
      );
      if (!snapshotRef.current) setStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  }, [loader]);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    const handleRefresh = () => {
      void refresh(false);
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener(ENDURANCE_PLANNING_CHANGED_EVENT, handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener(ENDURANCE_PLANNING_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  return {
    status,
    snapshot,
    errorMessage,
    isRefreshing,
    refresh,
  };
}
