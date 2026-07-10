import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { CurrentWeightResolution } from '@/application/weight/currentWeightService';
import { useCurrentWeight } from '@/features/weight/hooks/useCurrentWeight';

const observable = vi.hoisted(() => ({
  observer: undefined as
    | {
        next: (value: CurrentWeightResolution) => void;
        error: (error: unknown) => void;
      }
    | undefined,
  unsubscribe: vi.fn(),
}));

vi.mock('dexie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('dexie')>();
  return {
    ...actual,
    liveQuery: vi.fn(() => ({
      subscribe: (observer: typeof observable.observer) => {
        observable.observer = observer;
        return { unsubscribe: observable.unsubscribe };
      },
    })),
  };
});

describe('useCurrentWeight', () => {
  beforeEach(() => {
    observable.observer = undefined;
    observable.unsubscribe.mockClear();
  });

  it('utilise le poids initial pendant le chargement puis suit les changements de pesée', async () => {
    const { result, unmount } = renderHook(() => useCurrentWeight({
      id: 'profile-1',
      initialWeightKg: 70,
    }));

    expect(result.current).toMatchObject({
      status: 'loading',
      currentWeight: { source: 'profile', weightKg: 70 },
    });

    act(() => {
      observable.observer?.next({
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
    expect(observable.unsubscribe).toHaveBeenCalledOnce();
  });

  it('revient au poids initial lorsque la lecture réactive échoue', async () => {
    const { result } = renderHook(() => useCurrentWeight({
      id: 'profile-1',
      initialWeightKg: 70,
    }));

    act(() => {
      observable.observer?.error(new Error('Lecture impossible'));
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
