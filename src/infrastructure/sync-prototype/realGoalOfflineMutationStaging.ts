import { GOAL_STATE_PERSISTED_EVENT } from '@/domain/goals/goalState';
import { appDatabase } from '@/infrastructure/database/database';
import {
  createSyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  registeredGoalSyncContext,
  synchronizeRealGoalsToCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import {
  readSyncPrototypeConfig,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import type {
  SyncPrototypeClient,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

type StageRealGoalsMutation = (
  currentUserId: string,
) => Promise<unknown>;

export async function stageRealGoalsMutationIntoLocalCloudReplica(
  currentUserId: string,
): Promise<unknown> {
  const registered = (() => {
    try {
      return registeredGoalSyncContext(currentUserId);
    } catch {
      return undefined;
    }
  })();

  if (registered) {
    return synchronizeRealGoalsToCloud(
      registered.localDatabase,
      registered.cloudDatabase,
      currentUserId,
    );
  }

  /*
   * A Goals mutation may happen after an offline reload, before the automatic
   * controller has had any chance to analyze/register this account. Open a
   * second connection to the deterministic Dexie Cloud replica so the mutation
   * is still recorded locally at mutation time. disableEagerSync keeps this as
   * an IndexedDB operation until the explicit transport cycle runs later.
   *
   * synchronizeRealGoalsToCloud remains provenance-safe: without an existing
   * local baseline it refuses an ambiguous first reconciliation instead of
   * overwriting an unknown cloud state.
   */
  const config = readSyncPrototypeConfig();
  if (!config.enabled || !config.realGoalSyncEnabled) {
    return undefined;
  }

  const cloudDatabase = createSyncPrototypeDatabase(config);
  try {
    await Promise.all([
      appDatabase.open(),
      cloudDatabase.open(),
    ]);
    return await synchronizeRealGoalsToCloud(
      appDatabase,
      cloudDatabase,
      currentUserId,
    );
  } finally {
    cloudDatabase.close();
  }
}

interface AttachRealGoalOfflineMutationStagingOptions {
  readonly client: SyncPrototypeClient;
  readonly eventTarget?: EventTarget;
  readonly stage?: StageRealGoalsMutation;
}

export function attachRealGoalOfflineMutationStaging({
  client,
  eventTarget = window,
  stage = stageRealGoalsMutationIntoLocalCloudReplica,
}: AttachRealGoalOfflineMutationStagingOptions): () => void {
  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();
  let latestGeneration = 0;
  const replayedEvents = new WeakSet<Event>();

  const handlePersisted = (event: Event) => {
    if (replayedEvents.has(event)) {
      replayedEvents.delete(event);
      return;
    }

    const snapshot = client.getSnapshot();
    const currentUserId = snapshot.account.userId;
    if (
      snapshot.account.isLoggedIn !== true
      || !currentUserId
      || snapshot.realGoals?.enabled !== true
    ) {
      return;
    }

    /*
     * The automatic controller listens to the same persisted event. Listener
     * registration order alone is not a causal barrier: staging is async, so
     * the controller could otherwise start transport before this mutation has
     * reached the local Dexie Cloud replica. Hold the original event here and
     * replay it only after staging has completed.
     */
    event.stopImmediatePropagation();
    const generation = ++latestGeneration;

    queue = queue
      .catch(() => undefined)
      .then(async () => {
        if (disposed) return;
        await stage(currentUserId);
        if (disposed || generation !== latestGeneration) return;

        const replayedEvent = new Event(GOAL_STATE_PERSISTED_EVENT);
        replayedEvents.add(replayedEvent);
        eventTarget.dispatchEvent(replayedEvent);
      })
      .catch((error: unknown) => {
        // Fail closed for this automatic cycle: AppDB remains authoritative and
        // no replay reaches the controller until a later mutation stages safely.
        console.error(
          'Le staging local Dexie Cloud des objectifs a échoué.',
          error,
        );
      });
  };

  eventTarget.addEventListener(
    GOAL_STATE_PERSISTED_EVENT,
    handlePersisted,
  );

  return () => {
    disposed = true;
    eventTarget.removeEventListener(
      GOAL_STATE_PERSISTED_EVENT,
      handlePersisted,
    );
  };
}
