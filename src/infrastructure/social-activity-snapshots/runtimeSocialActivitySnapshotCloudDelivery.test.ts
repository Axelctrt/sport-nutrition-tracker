import { vi } from 'vitest';

import { deliverSocialActivitySnapshotOutbox, type SocialActivitySnapshotDeliveryReport } from '@/application/friends/socialActivitySnapshotDeliveryService';
import { attachRuntimeSocialActivitySnapshotCloudDelivery } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery';
import { SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotOutboxEvents';

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('runtime social activity snapshot cloud delivery', () => {
  it('déclenche au démarrage, lors du changement d’outbox et au retour en ligne', async () => {
    const target = new EventTarget();
    const deliver = vi.fn(async () => ({
      selectedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      ignoredStaleAcknowledgementCount: 0,
    }));
    let listener: () => void = () => {};
    const client = {
      subscribe: vi.fn((next: () => void) => {
        listener = next;
        return vi.fn();
      }),
      getCloudCredentials: vi.fn(() => ({ userId: 'owner-user', accessToken: 'token' })),
    };

    const detach = attachRuntimeSocialActivitySnapshotCloudDelivery({
      client,
      eventTarget: target,
      deliver,
    });
    await flushPromises();
    expect(deliver).toHaveBeenCalledTimes(1);

    target.dispatchEvent(new Event(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT));
    await flushPromises();
    expect(deliver).toHaveBeenCalledTimes(2);

    target.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(deliver).toHaveBeenCalledTimes(3);

    listener();
    await flushPromises();
    expect(deliver).toHaveBeenCalledTimes(4);
    detach();
  });

  it('ne publie ni hors ligne ni sans jeton et se désabonne proprement', async () => {
    const target = new EventTarget();
    const unsubscribe = vi.fn();
    const deliver = vi.fn();
    const client = {
      subscribe: vi.fn(() => unsubscribe),
      getCloudCredentials: vi.fn(() => undefined),
    };
    const detach = attachRuntimeSocialActivitySnapshotCloudDelivery({
      client,
      eventTarget: target,
      isOnline: () => false,
      deliver,
    });

    target.dispatchEvent(new Event('online'));
    target.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(deliver).not.toHaveBeenCalled();

    detach();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('coalesce les déclenchements concurrents sans lancer deux livraisons simultanées', async () => {
    const target = new EventTarget();
    let resolveDelivery: () => void = () => {};
    const deliver = vi.fn<typeof deliverSocialActivitySnapshotOutbox>(() => new Promise<SocialActivitySnapshotDeliveryReport>((resolve) => {
      resolveDelivery = () => resolve({
        selectedCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        ignoredStaleAcknowledgementCount: 0,
      });
    }));
    const client = {
      subscribe: vi.fn(() => vi.fn()),
      getCloudCredentials: vi.fn(() => ({ userId: 'owner-user', accessToken: 'token' })),
    };
    const detach = attachRuntimeSocialActivitySnapshotCloudDelivery({
      client,
      eventTarget: target,
      deliver,
    });

    target.dispatchEvent(new Event(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT));
    target.dispatchEvent(new Event(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT));
    expect(deliver).toHaveBeenCalledTimes(1);
    resolveDelivery();
    await flushPromises();
    await flushPromises();
    expect(deliver).toHaveBeenCalledTimes(2);
    detach();
  });
});
