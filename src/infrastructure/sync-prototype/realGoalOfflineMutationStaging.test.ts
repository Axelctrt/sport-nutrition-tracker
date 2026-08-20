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

  it('retient le cycle automatique online jusqu’à la fin du staging puis publie la mutation courante', async () => {
    const current = {
      ...snapshot(),
      sync: {
        status: 'connected',
        phase: 'in-sync',
      },
    } as SyncPrototypeSnapshot;
    const client = {
      getSnapshot: () => current,
    } as unknown as SyncPrototypeClient;
    const eventTarget = new EventTarget();

    let stagedTarget = 10_000;
    let serverTarget = 10_000;
    let releaseStage: () => void = () => undefined;
    const stageGate = new Promise<void>((resolve) => {
      releaseStage = resolve;
    });
    let markStageStarted: () => void = () => undefined;
    const stageStarted = new Promise<void>((resolve) => {
      markStageStarted = resolve;
    });

    const stage = vi.fn(async () => {
      markStageStarted();
      await stageGate;
      stagedTarget = 55_000;
    });
    const automaticCycle = vi.fn(() => {
      serverTarget = stagedTarget;
    });

    const detach = attachRealGoalOfflineMutationStaging({
      client,
      eventTarget,
      stage,
    });
    eventTarget.addEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      automaticCycle,
    );

    eventTarget.dispatchEvent(new Event(GOAL_STATE_PERSISTED_EVENT));
    await stageStarted;

    expect(automaticCycle).not.toHaveBeenCalled();
    expect(serverTarget).toBe(10_000);

    releaseStage();

    await vi.waitFor(() => {
      expect(automaticCycle).toHaveBeenCalledTimes(1);
    });
    expect(stagedTarget).toBe(55_000);
    expect(serverTarget).toBe(55_000);

    eventTarget.removeEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      automaticCycle,
    );
    detach();
  });

  it('coalesce les mutations rapides et ne réveille le contrôleur qu’après le dernier staging', async () => {
    const current = snapshot();
    const client = {
      getSnapshot: () => current,
    } as unknown as SyncPrototypeClient;
    const eventTarget = new EventTarget();
    const stageReleases: Array<() => void> = [];
    const stage = vi.fn(() => new Promise<void>((resolve) => {
      stageReleases.push(resolve);
    }));
    const automaticCycle = vi.fn();

    const detach = attachRealGoalOfflineMutationStaging({
      client,
      eventTarget,
      stage,
    });
    eventTarget.addEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      automaticCycle,
    );

    eventTarget.dispatchEvent(new Event(GOAL_STATE_PERSISTED_EVENT));
    await vi.waitFor(() => expect(stage).toHaveBeenCalledTimes(1));

    eventTarget.dispatchEvent(new Event(GOAL_STATE_PERSISTED_EVENT));
    expect(automaticCycle).not.toHaveBeenCalled();

    stageReleases[0]?.();
    await vi.waitFor(() => expect(stage).toHaveBeenCalledTimes(2));
    expect(automaticCycle).not.toHaveBeenCalled();

    stageReleases[1]?.();
    await vi.waitFor(() => {
      expect(automaticCycle).toHaveBeenCalledTimes(1);
    });

    eventTarget.removeEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      automaticCycle,
    );
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
