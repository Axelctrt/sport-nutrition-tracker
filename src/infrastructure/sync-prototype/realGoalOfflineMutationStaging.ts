import {
  GOAL_STATE_PERSISTED_EVENT,
  type GoalStatePersistedEventDetail,
} from '@/domain/goals/goalState';
import type {
  SyncPrototypeClient,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

type StageRealGoalsMutation = (
  currentUserId: string,
  goalIds?: readonly string[],
) => Promise<unknown>;

interface AttachRealGoalOfflineMutationStagingOptions {
  readonly client: SyncPrototypeClient;
  readonly eventTarget?: EventTarget;
  readonly stage?: StageRealGoalsMutation;
}

export function attachRealGoalOfflineMutationStaging({
  client,
  eventTarget = window,
  stage = (currentUserId, goalIds) => {
    if (!client.stageRealGoalsMutation) {
      return Promise.reject(new Error(
        'Le client Dexie Cloud actif ne peut pas stager les objectifs.',
      ));
    }
    return client.stageRealGoalsMutation(currentUserId, goalIds);
  },
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
    const goalIds = event instanceof CustomEvent
      ? (event as CustomEvent<GoalStatePersistedEventDetail>).detail?.goalIds
      : undefined;

    queue = queue
      .catch(() => undefined)
      .then(async () => {
        if (disposed) return;
        if (goalIds === undefined) {
          await stage(currentUserId);
        } else {
          await stage(currentUserId, goalIds);
        }
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
