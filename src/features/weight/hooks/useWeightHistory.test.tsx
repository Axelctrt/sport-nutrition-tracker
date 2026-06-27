import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { WeightEntry } from '@/domain/models/weight';

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({ profile: { initialWeightKg: 60 } }),
}));

import { useWeightHistory } from '@/features/weight/hooks/useWeightHistory';
import { repositories } from '@/infrastructure/repositories/repositories';

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
    vi.spyOn(repositories.weight, 'listAll').mockResolvedValue([original]);
    vi.spyOn(repositories.weight, 'upsert').mockResolvedValue(saved);
    vi.spyOn(repositories.weight, 'deleteByDate').mockResolvedValue(undefined);
  });

  it('enregistre et supprime sans repasser en chargement', async () => {
    const { result } = renderHook(() => useWeightHistory());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.save({ date: saved.date, weightKg: saved.weightKg });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.entries).toEqual([original, saved]);
    expect(repositories.weight.listAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.remove(original.date);
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.entries).toEqual([saved]);
    expect(repositories.weight.listAll).toHaveBeenCalledTimes(1);
  });
});
