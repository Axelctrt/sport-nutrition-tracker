import { vi } from 'vitest';

import { runSocialActivitySnapshotObserverBestEffort } from '@/application/friends/socialActivitySnapshotObserver';

describe('social activity snapshot observer best effort', () => {
  it('ignore proprement une tâche absente', async () => {
    await expect(runSocialActivitySnapshotObserverBestEffort(undefined)).resolves.toBe('skipped');
  });

  it('confirme une tâche sociale réussie', async () => {
    const task = vi.fn(async () => undefined);

    await expect(runSocialActivitySnapshotObserverBestEffort(task)).resolves.toBe('completed');
    expect(task).toHaveBeenCalledOnce();
  });

  it('absorbe une panne sociale sans la propager au flux sportif', async () => {
    const task = vi.fn(async () => {
      throw new Error('social unavailable');
    });

    await expect(runSocialActivitySnapshotObserverBestEffort(task)).resolves.toBe('failed');
  });
});
