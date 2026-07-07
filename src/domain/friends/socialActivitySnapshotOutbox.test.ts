import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import {
  areSocialActivitySnapshotsEquivalent,
  isSocialActivitySnapshotOutboxRecordReady,
  markSocialActivitySnapshotOutboxDelivered,
  markSocialActivitySnapshotOutboxFailed,
  stageSocialActivitySnapshotOutboxRecord,
} from '@/domain/friends/socialActivitySnapshotOutbox';
import type { ActiveSocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshotContract';

function activeSnapshot(overrides: Partial<ActiveSocialActivitySnapshot> = {}) {
  return createActiveSocialActivitySnapshotV2({
    ownerUserId: 'owner',
    recipientUserId: 'friend',
    sourceKind: 'activity',
    sourceActivityId: 'activity-1',
    sourceRevision: '2026-07-07T10:00:00.000Z',
    visibility: 'summary',
    family: 'cardio',
    activityType: 'running',
    title: 'Sortie du matin',
    occurredOn: '2026-07-07',
    allowedFields: {
      common: ['activityType', 'title', 'date', 'duration'],
      cardio: ['distance'],
      strength: [],
    },
    summary: { durationMinutes: 42, distanceKm: 7 },
    createdAt: '2026-07-07T08:00:00.000Z',
    updatedAt: '2026-07-07T10:00:00.000Z',
    ...overrides,
  });
}

describe('social activity snapshot outbox', () => {
  it('crée une mutation pending déterministe à partir du snapshot filtré', () => {
    const snapshot = activeSnapshot();
    const staged = stageSocialActivitySnapshotOutboxRecord({
      snapshot,
      stagedAt: '2026-07-07T10:01:00.000Z',
    });

    expect(staged.changed).toBe(true);
    expect(staged.record).toMatchObject({
      id: snapshot.snapshotId,
      snapshotId: snapshot.snapshotId,
      mutationSequence: 1,
      deliveryStatus: 'pending',
      attemptCount: 0,
      snapshotState: 'active',
      pendingSince: '2026-07-07T10:01:00.000Z',
    });
  });

  it('considère deux snapshots équivalents indépendamment de l’ordre des clés', () => {
    const snapshot = activeSnapshot();
    const reordered = {
      ...snapshot,
      summary: {
        distanceKm: 7,
        durationMinutes: 42,
      },
    };

    expect(areSocialActivitySnapshotsEquivalent(snapshot, reordered)).toBe(true);
  });

  it('ne remet pas en file une mutation strictement identique', () => {
    const first = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot(),
      stagedAt: '2026-07-07T10:01:00.000Z',
    }).record;
    const second = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot(),
      stagedAt: '2026-07-07T10:05:00.000Z',
      previous: first,
    });

    expect(second).toEqual({ record: first, changed: false });
  });

  it('incrémente la séquence et réinitialise la livraison après une modification', () => {
    const first = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot(),
      stagedAt: '2026-07-07T10:01:00.000Z',
    }).record;
    const delivered = markSocialActivitySnapshotOutboxDelivered({
      record: first,
      expectedMutationSequence: 1,
      deliveredAt: '2026-07-07T10:02:00.000Z',
    });
    const second = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot({ summary: { durationMinutes: 45, distanceKm: 7.5 } }),
      stagedAt: '2026-07-07T10:06:00.000Z',
      previous: delivered!,
    });

    expect(second.record).toMatchObject({
      mutationSequence: 2,
      deliveryStatus: 'pending',
      attemptCount: 0,
      pendingSince: '2026-07-07T10:06:00.000Z',
      createdAt: '2026-07-07T10:01:00.000Z',
    });
    expect(second.record).not.toHaveProperty('deliveredAt');
  });

  it('refuse de réutiliser les métadonnées d’un autre snapshot', () => {
    const previous = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot(),
      stagedAt: '2026-07-07T10:01:00.000Z',
    }).record;
    const otherSnapshot = createActiveSocialActivitySnapshotV2({
      ...activeSnapshot(),
      sourceActivityId: 'activity-2',
    });

    expect(() => stageSocialActivitySnapshotOutboxRecord({
      snapshot: otherSnapshot,
      stagedAt: '2026-07-07T10:05:00.000Z',
      previous,
    })).toThrow('ne correspond pas');
  });

  it('ignore un accusé de réception devenu obsolète', () => {
    const record = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot(),
      stagedAt: '2026-07-07T10:01:00.000Z',
    }).record;

    expect(markSocialActivitySnapshotOutboxDelivered({
      record,
      expectedMutationSequence: 0,
      deliveredAt: '2026-07-07T10:02:00.000Z',
    })).toBeUndefined();
  });

  it('planifie un retry sans conserver le message d’erreur brut', () => {
    const record = stageSocialActivitySnapshotOutboxRecord({
      snapshot: activeSnapshot(),
      stagedAt: '2026-07-07T10:01:00.000Z',
    }).record;
    const failed = markSocialActivitySnapshotOutboxFailed({
      record,
      expectedMutationSequence: 1,
      failedAt: '2026-07-07T10:02:00.000Z',
      nextAttemptAt: '2026-07-07T10:07:00.000Z',
      errorCode: 'HTTP 503 / backend indisponible',
    });

    expect(failed).toMatchObject({
      deliveryStatus: 'failed',
      attemptCount: 1,
      lastErrorCode: 'http_503_backend_indisponible',
      nextAttemptAt: '2026-07-07T10:07:00.000Z',
    });
    expect(isSocialActivitySnapshotOutboxRecordReady(
      failed!,
      '2026-07-07T10:06:59.000Z',
    )).toBe(false);
    expect(isSocialActivitySnapshotOutboxRecordReady(
      failed!,
      '2026-07-07T10:07:00.000Z',
    )).toBe(true);
  });
});
