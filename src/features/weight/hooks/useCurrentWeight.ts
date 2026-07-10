import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';
import {
  loadCurrentWeight,
  resolveCurrentWeight,
  type CurrentWeightResolution,
} from '@/application/weight/currentWeightService';
import type { UserProfile } from '@/domain/models/profile';

export type CurrentWeightStatus = 'loading' | 'ready' | 'error';

export interface CurrentWeightState {
  status: CurrentWeightStatus;
  currentWeight: CurrentWeightResolution;
  errorMessage?: string;
}

export function useCurrentWeight(
  profile: Pick<UserProfile, 'id' | 'initialWeightKg'>,
): CurrentWeightState {
  const profileId = profile.id;
  const initialWeightKg = profile.initialWeightKg;
  const fallback = useMemo(
    () => resolveCurrentWeight(initialWeightKg, []),
    [initialWeightKg],
  );
  const [state, setState] = useState<CurrentWeightState>({
    status: 'loading',
    currentWeight: fallback,
  });

  useEffect(() => {
    setState({
      status: 'loading',
      currentWeight: fallback,
    });

    const subscription = liveQuery(() => loadCurrentWeight({
      initialWeightKg,
    })).subscribe({
      next: (currentWeight) => {
        setState({ status: 'ready', currentWeight });
      },
      error: (error: unknown) => {
        setState({
          status: 'error',
          currentWeight: fallback,
          errorMessage: error instanceof Error
            ? error.message
            : 'Le poids actuel ne peut pas être déterminé.',
        });
      },
    });

    return () => subscription.unsubscribe();
  }, [fallback, initialWeightKg, profileId]);

  return state;
}
