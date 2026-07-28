import { deliverSocialActivitySnapshotOutbox } from '@/application/friends/socialActivitySnapshotDeliveryService';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSocialActivitySnapshotCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import { runtimeSocialActivitySnapshotOutboxRepository } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotOutbox';
import { SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotOutboxEvents';

export interface RuntimeSocialActivitySnapshotCloudDeliveryOptions {
  readonly client: Pick<
    SyncPrototypeClient,
    'subscribe' | 'getCloudCredentials' | 'ensureValidCloudCredentials'
  >;
  readonly eventTarget?: EventTarget;
  readonly isOnline?: () => boolean;
  readonly deliver?: typeof deliverSocialActivitySnapshotOutbox;
  readonly now?: () => number;
  readonly setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

export function attachRuntimeSocialActivitySnapshotCloudDelivery(
  options: RuntimeSocialActivitySnapshotCloudDeliveryOptions,
): () => void {
  const eventTarget = options.eventTarget;
  const isOnline = options.isOnline ?? (() => true);
  const deliver = options.deliver ?? deliverSocialActivitySnapshotOutbox;
  const now = options.now ?? Date.now;
  const setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
  const gateway = createSocialActivitySnapshotCloudGateway();
  let disposed = false;
  let running: Promise<void> | undefined;
  let queued = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const clearRetryTimer = (): void => {
    if (retryTimer === undefined) return;
    clearTimer(retryTimer);
    retryTimer = undefined;
  };

  const scheduleRetry = (nextRetryAt: string | undefined): void => {
    clearRetryTimer();
    if (disposed || !nextRetryAt) return;

    const target = Date.parse(nextRetryAt);
    if (Number.isNaN(target)) return;
    const delayMs = Math.max(0, target - now());
    retryTimer = setTimer(() => {
      retryTimer = undefined;
      trigger();
    }, delayMs);
  };

  const trigger = (): void => {
    if (disposed || !isOnline()) return;
    if (running) {
      queued = true;
      return;
    }

    clearRetryTimer();
    running = (async () => {
      const credentials = options.client.ensureValidCloudCredentials
        ? await options.client.ensureValidCloudCredentials()
        : options.client.getCloudCredentials?.();
      if (!credentials) return;
      const report = await deliver({
        credentials,
        repository: runtimeSocialActivitySnapshotOutboxRepository,
        gateway,
      });
      if (!disposed) {
        scheduleRetry(report.nextRetryAt);
      }
    })()
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
    clearRetryTimer();
    unsubscribeClient();
    eventTarget?.removeEventListener('online', handleLifecycle);
    eventTarget?.removeEventListener('focus', handleLifecycle);
    eventTarget?.removeEventListener(
      SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT,
      handleLifecycle,
    );
  };
}
