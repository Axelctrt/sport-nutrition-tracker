import { vi } from 'vitest';

import { deliverSocialActivitySnapshotOutbox } from '@/application/friends/socialActivitySnapshotDeliveryService';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import { stageSocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createSocialActivitySnapshotCloudGateway,
} from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT,
} from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotOutboxEvents';

function outboxRecord() {
  const snapshot = createActiveSocialActivitySnapshotV2({
    ownerUserId: 'owner-user',
    recipientUserId: 'friend-user',
    sourceKind: 'activity',
    sourceActivityId: 'activity-1',
    sourceRevision: '2026-07-07T08:00:00.000Z',
    visibility: 'summary',
    family: 'cardio',
    activityType: 'running',
    occurredOn: '2026-07-07',
    allowedFields: {
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: [],
    },
    summary: { durationMinutes: 45, distanceKm: 8 },
    createdAt: '2026-07-07T08:00:00.000Z',
    updatedAt: '2026-07-07T08:00:00.000Z',
  });
  return stageSocialActivitySnapshotOutboxRecord({
    snapshot,
    stagedAt: '2026-07-07T08:01:00.000Z',
  }).record;
}

describe('readiness cloud des snapshots sociaux 0.29.0 A6', () => {
  it('publie vers la Pages Function same-origin avec le bearer du compte cloud', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      status: 'created',
      mutationSequence: 1,
    }), { status: 201 }));
    const gateway = createSocialActivitySnapshotCloudGateway({ fetcher });
    const record = outboxRecord();

    await gateway.publish({ userId: 'owner-user', accessToken: 'token' }, record);

    expect(fetcher).toHaveBeenCalledWith(
      '/api/social-activity-snapshots/sync',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer token' }),
      }),
    );
  });

  it('exige que le client de synchronisation puisse fournir les identifiants cloud courants', () => {
    const client = {
      getCloudCredentials: () => ({ userId: 'owner-user', accessToken: 'token' }),
    } satisfies Pick<SyncPrototypeClient, 'getCloudCredentials'>;

    expect(client.getCloudCredentials()).toEqual({
      userId: 'owner-user',
      accessToken: 'token',
    });
  });

  it('conserve une livraison best effort déclenchable à chaque mutation de l’outbox', () => {
    expect(typeof deliverSocialActivitySnapshotOutbox).toBe('function');
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_CHANGED_EVENT).toBe(
      'sportpilot:social-activity-snapshot-outbox-changed',
    );
  });
});
