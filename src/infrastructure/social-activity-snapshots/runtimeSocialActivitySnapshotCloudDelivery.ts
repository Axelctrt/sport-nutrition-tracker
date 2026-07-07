import { deliverSocialActivitySnapshotOutbox } from '@/application/friends/socialActivitySnapshotDeliveryService';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSocialActivitySnapshotCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import { runtimeSocialActivitySnapshotOutboxRepository } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotOutbox';
import { SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotOutboxEvents';

export interface RuntimeSocialActivitySnapshotCloudDeliveryOptions {
  readonly client: Pick<SyncPrototypeClient, 'subscribe' | 'getCloudCredentials'>;
  readonly eventTarget?: EventTarget;
  readonly isOnline?: () => boolean;
  readonly deliver?: typeof deliverSocialActivitySnapshotOutbox;
}

export function attachRuntimeSocialActivitySnapshotCloudDelivery(
  options: RuntimeSocialActivitySnapshotCloudDeliveryOptions,
): () => void {
  const eventTarget = options.eventTarget;
  const isOnline = options.isOnline ?? (() => true);
  const deliver = options.deliver ?? deliverSocialActivitySnapshotOutbox;
  const gateway = createSocialActivitySnapshotCloudGateway();
  let disposed = false;
  let running: Promise<void> | undefined;
  let queued = false;

  const trigger = (): void => {
    if (disposed || !isOnline()) return;
    const credentials = options.client.getCloudCredentials?.();
    if (!credentials) return;

    if (running) {
      queued = true;
      return;
    }

    running = deliver({
      credentials,
      repository: runtimeSocialActivitySnapshotOutboxRepository,
      gateway,
    })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        running = undefined;
        if (queued) {
          queued = false;
          trigger();
        }
      });
  };

  const unsubscribeClient = options.client.subscribe(trigger);
  const handleLifecycle = () => trigger();
  eventTarget?.addEventListener('online', handleLifecycle);
  eventTarget?.addEventListener('focus', handleLifecycle);
  eventTarget?.addEventListener(
    SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT,
    handleLifecycle,
  );
  trigger();

  return () => {
    disposed = true;
    unsubscribeClient();
    eventTarget?.removeEventListener('online', handleLifecycle);
    eventTarget?.removeEventListener('focus', handleLifecycle);
    eventTarget?.removeEventListener(
      SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT,
      handleLifecycle,
    );
  };
}
