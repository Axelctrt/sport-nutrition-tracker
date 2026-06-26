import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { RunningActivity } from '@/domain/models/activity';
import { useActivityJournal, type ActivityJournalDependencies } from '@/features/activities/hooks/useActivityJournal';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({
    profile: {
      id: 'profile',
      initialWeightKg: 60,
    },
  }),
}));

const original = createEntity<RunningActivity>(createRunningActivityInput(), 'activity-original');
const copy = createEntity<RunningActivity>(createRunningActivityInput(), 'activity-copy');

describe('useActivityJournal', () => {
  it('duplique et supprime sans repasser le journal en chargement', async () => {
    const listByDate = vi
      .fn<ActivityJournalDependencies['activities']['listByDate']>()
      .mockResolvedValueOnce([original])
      .mockResolvedValueOnce([original, copy]);
    const createActivity = vi
      .fn<ActivityJournalDependencies['createActivity']>()
      .mockResolvedValue(copy);
    const deleteActivity = vi
      .fn<ActivityJournalDependencies['deleteActivity']>()
      .mockResolvedValue(undefined);
    const dependencies: ActivityJournalDependencies = {
      activities: { listByDate },
      createActivity,
      deleteActivity,
    };

    const { result } = renderHook(() =>
      useActivityJournal('2026-06-23', dependencies),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.activities).toEqual([original]);

    await act(async () => {
      await result.current.duplicate(original.id);
    });

    expect(createActivity).toHaveBeenCalledWith(
      original,
      expect.objectContaining({ initialWeightKg: 60 }),
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.activities).toEqual([original, copy]);
    expect(result.current.busyId).toBeUndefined();

    await act(async () => {
      await result.current.remove(original.id);
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.activities).toEqual([copy]);
    expect(deleteActivity).toHaveBeenCalledWith(
      original.id,
      expect.objectContaining({ initialWeightKg: 60 }),
    );
  });
});
