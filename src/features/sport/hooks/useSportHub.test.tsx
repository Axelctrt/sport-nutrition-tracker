import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import type { SportHubSnapshot } from '@/application/sport/sportHubService';
import { useSportHub } from '@/features/sport/hooks/useSportHub';

const snapshot: SportHubSnapshot = {
  today: '2026-07-10',
  plannedEntries: [],
  recentActivities: [],
  activityTypeOrder: [
    'running',
    'strengthTraining',
    'walking',
    'cycling',
    'swimming',
    'otherCardio',
  ],
  week: {
    startDate: '2026-07-06',
    endDate: '2026-07-12',
    activityCount: 0,
    totalDurationMinutes: 0,
    totalCaloriesKcal: 0,
    distanceKm: 0,
    swimmingDistanceMeters: 0,
  },
};

describe('useSportHub', () => {
  it('charge le hub puis actualise les données sans les masquer', async () => {
    let resolveRefresh: ((value: SportHubSnapshot) => void) | undefined;
    const loader = vi
      .fn<() => Promise<SportHubSnapshot>>()
      .mockResolvedValueOnce(snapshot)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveRefresh = resolve;
      }));

    const { result } = renderHook(() => useSportHub(loader));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.snapshot).toBe(snapshot);

    act(() => {
      void result.current.refresh(false);
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.snapshot).toBe(snapshot);

    act(() => resolveRefresh?.({
      ...snapshot,
      week: { ...snapshot.week, activityCount: 2 },
    }));

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.snapshot?.week.activityCount).toBe(2);
  });

  it('conserve le dernier aperçu si une actualisation échoue', async () => {
    const loader = vi
      .fn<() => Promise<SportHubSnapshot>>()
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error('Lecture impossible'));

    const { result } = renderHook(() => useSportHub(loader));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.refresh(false);
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.snapshot).toBe(snapshot);
    expect(result.current.errorMessage).toBe('Lecture impossible');
  });
});
