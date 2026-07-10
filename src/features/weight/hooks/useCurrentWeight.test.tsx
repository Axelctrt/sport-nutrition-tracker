import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type {
  CurrentWeightObserver,
  CurrentWeightSubscriber,
} from '@/features/weight/hooks/useCurrentWeight';
import { useCurrentWeight } from '@/features/weight/hooks/useCurrentWeight';

describe('useCurrentWeight', () => {
  let observer: CurrentWeightObserver | undefined;
  const unsubscribe = vi.fn();
  const subscribe: CurrentWeightSubscriber = vi.fn((_, nextObserver) => {
    observer = nextObserver;
    return { unsubscribe };
  });

  beforeEach(() => {
    observer = undefined;
    unsubscribe.mockClear();
    vi.mocked(subscribe).mockClear();
  });

  it('utilise le poids initial pendant le chargement puis suit les changements de pesée', async () => {
    const { result, unmount } = renderHook(() => useCurrentWeight({
      id: 'profile-1',
      initialWeightKg: 70,
    }, subscribe));

    expect(result.current).toMatchObject({
      status: 'loading',
      currentWeight: { source: 'profile', weightKg: 70 },
    });

    act(() => {
      observer?.next({
        source: 'entry',
        weightKg: 68.7,
        measuredAt: '2026-07-10',
        entry: {
          id: 'weight:2026-07-10',
          date: '2026-07-10',
          weightKg: 68.7,
          createdAt: '2026-07-10T08:00:00.000Z',
          updatedAt: '2026-07-10T08:00:00.000Z',
        },
      });
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        currentWeight: { source: 'entry', weightKg: 68.7 },
      });
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('revient au poids initial lorsque la lecture réactive échoue', async () => {
    const { result } = renderHook(() => useCurrentWeight({
      id: 'profile-1',
      initialWeightKg: 70,
    }, subscribe));

    act(() => {
      observer?.error(new Error('Lecture impossible'));
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'error',
        currentWeight: { source: 'profile', weightKg: 70 },
        errorMessage: 'Lecture impossible',
      });
    });
  });
});
