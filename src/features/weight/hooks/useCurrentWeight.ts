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

export interface CurrentWeightObserver {
  next: (currentWeight: CurrentWeightResolution) => void;
  error: (error: unknown) => void;
}

export interface CurrentWeightSubscription {
  unsubscribe: () => void;
}

export type CurrentWeightSubscriber = (
  initialWeightKg: number,
  observer: CurrentWeightObserver,
) => CurrentWeightSubscription;

export const subscribeToCurrentWeight: CurrentWeightSubscriber = (
  initialWeightKg,
  observer,
) => liveQuery(() => loadCurrentWeight({ initialWeightKg })).subscribe(observer);

export function useCurrentWeight(
  profile?: Pick<UserProfile, 'id' | 'initialWeightKg'>,
  subscribe: CurrentWeightSubscriber = subscribeToCurrentWeight,
): CurrentWeightState {
  const profileId = profile?.id ?? 'profile-unavailable';
  const initialWeightKg = profile?.initialWeightKg ?? 1;
  const fallback = useMemo(
    () => resolveCurrentWeight(initialWeightKg, []),
    [initialWeightKg],
  );
  const [state, setState] = useState<CurrentWeightState>({
    status: 'loading',
    currentWeight: fallback,
  });

  useEffect(() => {
    if (profileId === 'profile-unavailable') {
      setState({ status: 'loading', currentWeight: fallback });
      return undefined;
    }

    setState({
      status: 'loading',
      currentWeight: fallback,
    });

    const subscription = subscribe(initialWeightKg, {
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
  }, [fallback, initialWeightKg, profileId, subscribe]);

  return state;
}
