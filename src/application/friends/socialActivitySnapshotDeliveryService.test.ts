import { vi } from 'vitest';

import { deliverSocialActivitySnapshotOutbox } from '@/application/friends/socialActivitySnapshotDeliveryService';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import { stageSocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import { SocialActivitySnapshotCloudError } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';

function outboxRecord() {
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

describe('social activity snapshot delivery service', () => {
  it('confirme la mutation exacte après un upsert cloud', async () => {
    const record = outboxRecord();
    const repository = {
      listReadyForDelivery: vi.fn(async () => [record]),
      markDelivered: vi.fn(async () => record),
      markFailed: vi.fn(),
    };
    const gateway = {
      publish: vi.fn(async () => ({ status: 'created' as const, mutationSequence: 1 })),
    };

    await expect(deliverSocialActivitySnapshotOutbox({
      credentials: { userId: 'owner-user', accessToken: 'token' },
      repository,
      gateway,
      now: new Date('2026-07-07T08:05:00.000Z'),
    })).resolves.toEqual({
      selectedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
      ignoredStaleAcknowledgementCount: 0,
    });
    expect(repository.markDelivered).toHaveBeenCalledWith({
      snapshotId: record.snapshotId,
      expectedMutationSequence: 1,
      deliveredAt: '2026-07-07T08:05:00.000Z',
    });
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it('planifie un retry sans conserver le message serveur brut', async () => {
    const record = outboxRecord();
    const repository = {
      listReadyForDelivery: vi.fn(async () => [record]),
      markDelivered: vi.fn(),
      markFailed: vi.fn(async () => record),
    };
    const gateway = {
      publish: vi.fn(async () => {
        throw new SocialActivitySnapshotCloudError(
          'Détail serveur potentiellement sensible.',
          'SOCIAL_ACTIVITY_AUTH_UNAVAILABLE',
          true,
        );
      }),
    };

    await expect(deliverSocialActivitySnapshotOutbox({
      credentials: { userId: 'owner-user', accessToken: 'token' },
      repository,
      gateway,
      now: new Date('2026-07-07T08:05:00.000Z'),
    })).resolves.toMatchObject({ failedCount: 1 });
    expect(repository.markFailed).toHaveBeenCalledWith({
      snapshotId: record.snapshotId,
      expectedMutationSequence: 1,
      failedAt: '2026-07-07T08:05:00.000Z',
      nextAttemptAt: '2026-07-07T08:06:00.000Z',
      errorCode: 'SOCIAL_ACTIVITY_AUTH_UNAVAILABLE',
    });
  });

  it('acquitte la mutation locale lorsque le serveur possède déjà une séquence plus récente', async () => {
    const record = outboxRecord();
    const repository = {
      listReadyForDelivery: vi.fn(async () => [record]),
      markDelivered: vi.fn(async () => record),
      markFailed: vi.fn(),
    };
    const gateway = {
      publish: vi.fn(async () => ({ status: 'stale' as const, mutationSequence: 4 })),
    };

    await expect(deliverSocialActivitySnapshotOutbox({
      credentials: { userId: 'owner-user', accessToken: 'token' },
      repository,
      gateway,
      now: new Date('2026-07-07T08:05:00.000Z'),
    })).resolves.toMatchObject({ deliveredCount: 1 });
    expect(repository.markDelivered).toHaveBeenCalledWith({
      snapshotId: record.snapshotId,
      expectedMutationSequence: 1,
      deliveredAt: '2026-07-07T08:05:00.000Z',
    });
  });

  it('ignore un accusé obsolète si une mutation plus récente a remplacé le record', async () => {
    const record = outboxRecord();
    const repository = {
      listReadyForDelivery: vi.fn(async () => [record]),
      markDelivered: vi.fn(async () => undefined),
      markFailed: vi.fn(),
    };
    const gateway = {
      publish: vi.fn(async () => ({ status: 'updated' as const, mutationSequence: 1 })),
    };

    await expect(deliverSocialActivitySnapshotOutbox({
      credentials: { userId: 'owner-user', accessToken: 'token' },
      repository,
      gateway,
      now: new Date('2026-07-07T08:05:00.000Z'),
    })).resolves.toMatchObject({
      deliveredCount: 0,
      ignoredStaleAcknowledgementCount: 1,
    });
  });

  it('expose la prochaine tentative afin que le runtime puisse reprendre sans nouvel événement', async () => {
    const record = outboxRecord();
    const repository = {
      listReadyForDelivery: vi.fn(async () => [record]),
      getNextRetryAt: vi.fn(async () => '2026-07-07T08:06:00.000Z'),
      markDelivered: vi.fn(),
      markFailed: vi.fn(async () => record),
    };
    const gateway = {
      publish: vi.fn(async () => {
        throw new SocialActivitySnapshotCloudError(
          'Réseau indisponible.',
          'social_activity_network_error',
          true,
        );
      }),
    };

    await expect(deliverSocialActivitySnapshotOutbox({
      credentials: { userId: 'owner-user', accessToken: 'token' },
      repository,
      gateway,
      now: new Date('2026-07-07T08:05:00.000Z'),
    })).resolves.toMatchObject({
      failedCount: 1,
      nextRetryAt: '2026-07-07T08:06:00.000Z',
    });
  });

  it('relit un retry futur déjà persiste après fermeture puis réouverture', async () => {
    const repository = {
      listReadyForDelivery: vi.fn(async () => []),
      getNextRetryAt: vi.fn(async () => '2026-07-07T08:10:00.000Z'),
      markDelivered: vi.fn(),
      markFailed: vi.fn(),
    };
    const gateway = { publish: vi.fn() };

    await expect(deliverSocialActivitySnapshotOutbox({
      credentials: { userId: 'owner-user', accessToken: 'token' },
      repository,
      gateway,
      now: new Date('2026-07-07T08:05:00.000Z'),
    })).resolves.toEqual({
      selectedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      ignoredStaleAcknowledgementCount: 0,
      nextRetryAt: '2026-07-07T08:10:00.000Z',
    });
  });

});
