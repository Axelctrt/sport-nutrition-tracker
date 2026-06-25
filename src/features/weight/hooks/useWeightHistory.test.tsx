import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { WeightEntry } from '@/domain/models/weight';

const mocks = vi.hoisted(() => ({
  listAll: vi.fn(),
  upsert: vi.fn(),
  deleteByDate: vi.fn(),
}));

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({ profile: { initialWeightKg: 60 } }),
}));

vi.mock('@/infrastructure/repositories/repositories', () => ({
  repositories: {
    weight: {
      listAll: mocks.listAll,
      upsert: mocks.upsert,
      deleteByDate: mocks.deleteByDate,
    },
  },
}));

import { useWeightHistory } from '@/features/weight/hooks/useWeightHistory';

const original: WeightEntry = {
  id: 'weight-original',
  date: '2026-06-24',
  weightKg: 60,
  createdAt: '2026-06-24T08:00:00.000Z',
  updatedAt: '2026-06-24T08:00:00.000Z',
};
const saved: WeightEntry = {
  ...original,
  id: 'weight-saved',
  date: '2026-06-25',
  weightKg: 60.5,
};

describe('useWeightHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAll.mockResolvedValue([original]);
    mocks.upsert.mockResolvedValue(saved);
    mocks.deleteByDate.mockResolvedValue(undefined);
  });

  it('enregistre et supprime sans repasser en chargement', async () => {
    const { result } = renderHook(() => useWeightHistory());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.save({ date: saved.date, weightKg: saved.weightKg });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.entries).toEqual([original, saved]);
    expect(mocks.listAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.remove(original.date);
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.entries).toEqual([saved]);
    expect(mocks.listAll).toHaveBeenCalledTimes(1);
  });
});
