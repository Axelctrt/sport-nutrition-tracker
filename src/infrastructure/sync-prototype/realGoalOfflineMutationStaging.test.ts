import { GOAL_STATE_PERSISTED_EVENT } from '@/domain/goals/goalState';
import {
  attachRealGoalOfflineMutationStaging,
} from '@/infrastructure/sync-prototype/realGoalOfflineMutationStaging';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'goal-offline-stage-user';

function snapshot(): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: USER_ID,
    },
    sync: {
      status: 'offline',
      phase: 'offline',
    },
    weights: {
      weights: [],
      deletedCount: 0,
      isLoading: false,
    },
    realGoals: {
      enabled: true,
      status: 'ready',
      preview: {
        localGoalCount: 1,
        cloudGoalCount: 0,
        localDeletionCount: 0,
        cloudDeletionCount: 0,
        differingEntityCount: 1,
        changeOrigin: 'local',
      },
    },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  };
}

describe('staging local Goals avant reconnexion', () => {
  it('capture la mutation dans le replica même lorsque le transport est offline', async () => {
    const current = snapshot();
    const client = {
      getSnapshot: () => current,
    } as unknown as SyncPrototypeClient;
    const eventTarget = new EventTarget();
    const stage = vi.fn(async () => undefined);

    const detach = attachRealGoalOfflineMutationStaging({
      client,
      eventTarget,
      stage,
    });

    eventTarget.dispatchEvent(new Event(GOAL_STATE_PERSISTED_EVENT));

    await vi.waitFor(() => {
      expect(stage).toHaveBeenCalledTimes(1);
    });
    expect(stage).toHaveBeenCalledWith(USER_ID);

    detach();
  });

  it('n’écrit rien sans compte Goals actif', async () => {
    const current = snapshot();
    const client = {
      getSnapshot: () => ({
        ...current,
        account: { isLoggedIn: false, isLoading: false },
      }),
    } as unknown as SyncPrototypeClient;
    const eventTarget = new EventTarget();
    const stage = vi.fn(async () => undefined);

    const detach = attachRealGoalOfflineMutationStaging({
      client,
      eventTarget,
      stage,
    });

    eventTarget.dispatchEvent(new Event(GOAL_STATE_PERSISTED_EVENT));
    await Promise.resolve();

    expect(stage).not.toHaveBeenCalled();
    detach();
  });
});
