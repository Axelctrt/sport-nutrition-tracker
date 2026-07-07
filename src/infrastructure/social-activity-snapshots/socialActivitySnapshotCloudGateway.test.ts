import { vi } from 'vitest';

import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import { stageSocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import {
  createSocialActivitySnapshotCloudGateway,
  SocialActivitySnapshotCloudError,
} from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';

function record() {
  const snapshot = createActiveSocialActivitySnapshotV2({
    ownerUserId: 'owner-user',
    recipientUserId: 'friend-user',
    sourceKind: 'activity',
    sourceActivityId: 'activity-1',
    sourceRevision: 'revision-1',
    visibility: 'summary',
    family: 'cardio',
    activityType: 'running',
    occurredOn: '2026-07-07',
    allowedFields: {
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: [],
    },
    summary: { durationMinutes: 42, distanceKm: 8 },
    createdAt: '2026-07-07T08:00:00.000Z',
    updatedAt: '2026-07-07T08:00:00.000Z',
  });
  return stageSocialActivitySnapshotOutboxRecord({
    snapshot,
    stagedAt: '2026-07-07T08:01:00.000Z',
  }).record;
}

describe('social activity snapshot cloud gateway', () => {
  it('envoie uniquement le snapshot filtré avec le bearer Dexie Cloud', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      status: 'created',
      mutationSequence: 1,
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }));
    const gateway = createSocialActivitySnapshotCloudGateway({
      endpoint: '/api/social-activity-snapshots/',
      fetcher: fetcher as typeof fetch,
    });
    const outboxRecord = record();

    await expect(gateway.publish({
      userId: 'owner-user',
      accessToken: 'secret-access-token',
    }, outboxRecord)).resolves.toEqual({ status: 'created', mutationSequence: 1 });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as Parameters<typeof fetch>;
    expect(url).toBe('/api/social-activity-snapshots/sync');
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer secret-access-token',
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      mutationSequence: 1,
      snapshot: outboxRecord.snapshot,
    });
  });

  it('refuse localement un snapshot appartenant à un autre compte', async () => {
    const gateway = createSocialActivitySnapshotCloudGateway({
      fetcher: vi.fn() as unknown as typeof fetch,
    });

    await expect(gateway.publish({
      userId: 'other-user',
      accessToken: 'token',
    }, record())).rejects.toMatchObject({
      code: 'social_activity_owner_mismatch',
      retryable: false,
    });
  });

  it('classe les erreurs réseau et serveur pour la stratégie de retry', async () => {
    const networkGateway = createSocialActivitySnapshotCloudGateway({
      fetcher: vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch,
    });
    await expect(networkGateway.publish({ userId: 'owner-user', accessToken: 'token' }, record()))
      .rejects.toBeInstanceOf(SocialActivitySnapshotCloudError);
    await expect(networkGateway.publish({ userId: 'owner-user', accessToken: 'token' }, record()))
      .rejects.toMatchObject({ retryable: true, code: 'social_activity_network_error' });

    const forbiddenGateway = createSocialActivitySnapshotCloudGateway({
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        code: 'SOCIAL_ACTIVITY_SCOPE_EXCEEDED',
        message: 'Refusé.',
      }), { status: 403 })) as unknown as typeof fetch,
    });
    await expect(forbiddenGateway.publish({ userId: 'owner-user', accessToken: 'token' }, record()))
      .rejects.toMatchObject({ retryable: false, code: 'SOCIAL_ACTIVITY_SCOPE_EXCEEDED' });
  });
});
