import { reconcileSocialActivitySnapshot } from '@/application/friends/socialActivitySnapshotLifecycleService';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import type { EntityId } from '@/domain/models/common';

class MemoryRepository {
  readonly records = new Map<EntityId, SocialActivitySnapshotOutboxRecord>();

  async get(snapshotId: EntityId) {
    return this.records.get(snapshotId);
  }

  async put(record: SocialActivitySnapshotOutboxRecord) {
    this.records.set(record.id, record);
  }
}

function snapshot(durationMinutes = 42) {
  return createActiveSocialActivitySnapshotV2({
    ownerUserId: 'owner',
    recipientUserId: 'friend',
    sourceKind: 'activity',
    sourceActivityId: 'activity-1',
    sourceRevision: `revision-${durationMinutes}`,
    visibility: 'summary',
    family: 'cardio',
    activityType: 'running',
    occurredOn: '2026-07-07',
    allowedFields: {
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: [],
    },
    summary: { durationMinutes, distanceKm: 7 },
    createdAt: '2026-07-07T08:00:00.000Z',
    updatedAt: `2026-07-07T10:${String(durationMinutes).padStart(2, '0')}:00.000Z`,
  });
}

describe('social activity snapshot lifecycle service', () => {
  it('crée puis met à jour un seul enregistrement par activité et destinataire', async () => {
    const repository = new MemoryRepository();
    const created = await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot: snapshot(42),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });
    const updated = await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot: snapshot(45),
      stagedAt: '2026-07-07T11:05:00.000Z',
    });

    expect(created.status).toBe('created');
    expect(updated.status).toBe('updated');
    expect(repository.records.size).toBe(1);
    expect(updated.record).toMatchObject({ mutationSequence: 2, deliveryStatus: 'pending' });
  });

  it('reste idempotent lorsque la projection ne change pas', async () => {
    const repository = new MemoryRepository();
    const nextSnapshot = snapshot();
    await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot,
      stagedAt: '2026-07-07T11:00:00.000Z',
    });
    const result = await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot,
      stagedAt: '2026-07-07T11:05:00.000Z',
    });

    expect(result.status).toBe('unchanged');
    expect(result.record?.mutationSequence).toBe(1);
  });

  it('ne crée aucun tombstone pour une activité jamais publiée', async () => {
    const repository = new MemoryRepository();
    const result = await reconcileSocialActivitySnapshot({
      repository,
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      sourceKind: 'activity',
      sourceActivityId: 'activity-1',
      sourceRevision: 'private-revision',
      removalReason: 'sharingDisabled',
      stagedAt: '2026-07-07T11:10:00.000Z',
    });

    expect(result.status).toBe('notFound');
    expect(repository.records.size).toBe(0);
  });

  it('remplace le snapshot actif par un tombstone lors du passage en privé', async () => {
    const repository = new MemoryRepository();
    await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot: snapshot(),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });
    const result = await reconcileSocialActivitySnapshot({
      repository,
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      sourceKind: 'activity',
      sourceActivityId: 'activity-1',
      sourceRevision: 'private-revision',
      removalReason: 'sharingDisabled',
      stagedAt: '2026-07-07T11:10:00.000Z',
    });

    expect(result).toMatchObject({
      status: 'deleted',
      record: {
        mutationSequence: 2,
        snapshotState: 'deleted',
        deliveryStatus: 'pending',
        snapshot: {
          state: 'deleted',
          deletionReason: 'sharingDisabled',
          createdAt: '2026-07-07T08:00:00.000Z',
        },
      },
    });
  });

  it('ne duplique pas un tombstone identique', async () => {
    const repository = new MemoryRepository();
    await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot: snapshot(),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });
    const removal = {
      repository,
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      sourceKind: 'activity' as const,
      sourceActivityId: 'activity-1',
      sourceRevision: 'deleted-revision',
      removalReason: 'sourceDeleted' as const,
    };
    await reconcileSocialActivitySnapshot({
      ...removal,
      stagedAt: '2026-07-07T11:10:00.000Z',
    });
    const second = await reconcileSocialActivitySnapshot({
      ...removal,
      stagedAt: '2026-07-07T11:20:00.000Z',
    });

    expect(second.status).toBe('unchanged');
    expect(second.record?.mutationSequence).toBe(2);
  });

  it('peut republier une activité après un tombstone livré ou en attente', async () => {
    const repository = new MemoryRepository();
    await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot: snapshot(),
      stagedAt: '2026-07-07T11:00:00.000Z',
    });
    await reconcileSocialActivitySnapshot({
      repository,
      ownerUserId: 'owner',
      recipientUserId: 'friend',
      sourceKind: 'activity',
      sourceActivityId: 'activity-1',
      sourceRevision: 'private-revision',
      removalReason: 'sharingDisabled',
      stagedAt: '2026-07-07T11:10:00.000Z',
    });
    const restored = await reconcileSocialActivitySnapshot({
      repository,
      nextSnapshot: snapshot(48),
      stagedAt: '2026-07-07T11:20:00.000Z',
    });

    expect(restored).toMatchObject({
      status: 'updated',
      record: {
        mutationSequence: 3,
        snapshotState: 'active',
        deliveryStatus: 'pending',
      },
    });
  });
});
