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

  const handlePersisted = () => {
    const snapshot = client.getSnapshot();
    const currentUserId = snapshot.account.userId;
    if (
      snapshot.account.isLoggedIn !== true
      || !currentUserId
      || snapshot.realGoals?.enabled !== true
    ) {
      return;
    }

    queue = queue
      .catch(() => undefined)
      .then(() => (
        disposed
          ? undefined
          : stage(currentUserId)
      ))
      .catch((error: unknown) => {
        // Staging is best-effort. AppDB remains the local-first source and the
        // normal automatic controller will retry convergence when possible.
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
