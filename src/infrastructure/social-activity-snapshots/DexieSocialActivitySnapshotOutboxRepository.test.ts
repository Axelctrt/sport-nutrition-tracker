import Dexie from 'dexie';

import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';
import { stageSocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import {
  DexieSocialActivitySnapshotOutboxRepository,
} from '@/infrastructure/social-activity-snapshots/DexieSocialActivitySnapshotOutboxRepository';
import {
  SocialActivitySnapshotOutboxDatabase,
} from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';

function pendingRecord(input: {
  readonly recipientUserId: string;
  readonly stagedAt: string;
  readonly ownerUserId?: string;
  readonly sourceActivityId?: string;
}) {
  const snapshot = createActiveSocialActivitySnapshotV2({
    ownerUserId: input.ownerUserId ?? 'owner',
    recipientUserId: input.recipientUserId,
    sourceKind: 'activity',
    sourceActivityId: input.sourceActivityId ?? `activity-${input.recipientUserId}`,
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
    summary: { durationMinutes: 42, distanceKm: 7 },
    createdAt: '2026-07-07T08:00:00.000Z',
    updatedAt: '2026-07-07T10:00:00.000Z',
  });

  return stageSocialActivitySnapshotOutboxRecord({
    snapshot,
    stagedAt: input.stagedAt,
  }).record;
}

describe('DexieSocialActivitySnapshotOutboxRepository', () => {
  it('persiste la file après fermeture puis réouverture de la PWA', async () => {
    const databaseName = `sportpilot-social-outbox-reopen-${crypto.randomUUID()}`;
    const firstDatabase = new SocialActivitySnapshotOutboxDatabase(databaseName);
    let reopenedDatabase: SocialActivitySnapshotOutboxDatabase | undefined;

    try {
      await firstDatabase.open();
      const firstRepository = new DexieSocialActivitySnapshotOutboxRepository(firstDatabase);
      const record = pendingRecord({
        recipientUserId: 'friend',
        stagedAt: '2026-07-07T10:01:00.000Z',
      });
      await firstRepository.put(record);
      firstDatabase.close();

      reopenedDatabase = new SocialActivitySnapshotOutboxDatabase(databaseName);
      await reopenedDatabase.open();
      const reopenedRepository = new DexieSocialActivitySnapshotOutboxRepository(reopenedDatabase);

      await expect(reopenedRepository.get(record.id)).resolves.toEqual(record);
    } finally {
      firstDatabase.close();
      reopenedDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });

  it('retourne les mutations prêtes dans un ordre stable et limité', async () => {
    const database = new SocialActivitySnapshotOutboxDatabase(
      `sportpilot-social-outbox-ready-${crypto.randomUUID()}`,
    );
    const repository = new DexieSocialActivitySnapshotOutboxRepository(database);

    try {
      await database.open();
      const later = pendingRecord({
        recipientUserId: 'later',
        stagedAt: '2026-07-07T10:02:00.000Z',
      });
      const earlier = pendingRecord({
        recipientUserId: 'earlier',
        stagedAt: '2026-07-07T10:01:00.000Z',
      });
      await repository.put(later);
      await repository.put(earlier);

      const ready = await repository.listReadyForDelivery({
        ownerUserId: 'owner',
        now: '2026-07-07T10:03:00.000Z',
        limit: 1,
      });

      expect(ready.map(({ id }) => id)).toEqual([earlier.id]);
    } finally {
      database.close();
      await Dexie.delete(database.name);
    }
  });

  it('respecte le délai de retry et isole les comptes propriétaires', async () => {
    const database = new SocialActivitySnapshotOutboxDatabase(
      `sportpilot-social-outbox-retry-${crypto.randomUUID()}`,
    );
    const repository = new DexieSocialActivitySnapshotOutboxRepository(database);

    try {
      await database.open();
      const record = pendingRecord({
        recipientUserId: 'friend',
        stagedAt: '2026-07-07T10:01:00.000Z',
      });
      await repository.put(record);
      await repository.markFailed({
        snapshotId: record.id,
        expectedMutationSequence: 1,
        failedAt: '2026-07-07T10:02:00.000Z',
        nextAttemptAt: '2026-07-07T10:12:00.000Z',
        errorCode: 'network_error',
      });

      await expect(repository.listReadyForDelivery({
        ownerUserId: 'owner',
        now: '2026-07-07T10:11:59.000Z',
      })).resolves.toEqual([]);
      await expect(repository.listReadyForDelivery({
        ownerUserId: 'other-owner',
        now: '2026-07-07T10:12:00.000Z',
      })).resolves.toEqual([]);
      await expect(repository.listReadyForDelivery({
        ownerUserId: 'owner',
        now: '2026-07-07T10:12:00.000Z',
      })).resolves.toHaveLength(1);
    } finally {
      database.close();
      await Dexie.delete(database.name);
    }
  });

  it('n’écrase pas une mutation récente avec l’accusé de réception d’une ancienne', async () => {
    const database = new SocialActivitySnapshotOutboxDatabase(
      `sportpilot-social-outbox-stale-${crypto.randomUUID()}`,
    );
    const repository = new DexieSocialActivitySnapshotOutboxRepository(database);

    try {
      await database.open();
      const first = pendingRecord({
        recipientUserId: 'friend',
        stagedAt: '2026-07-07T10:01:00.000Z',
      });
      if (first.snapshot.state !== 'active') throw new Error('Snapshot actif attendu.');
      const second = stageSocialActivitySnapshotOutboxRecord({
        snapshot: {
          ...first.snapshot,
          sourceRevision: 'revision-2',
          updatedAt: '2026-07-07T10:05:00.000Z',
          summary: { durationMinutes: 45, distanceKm: 7.5 },
        },
        stagedAt: '2026-07-07T10:05:00.000Z',
        previous: first,
      }).record;
      await repository.put(second);

      await expect(repository.markDelivered({
        snapshotId: second.id,
        expectedMutationSequence: 1,
        deliveredAt: '2026-07-07T10:06:00.000Z',
      })).resolves.toBeUndefined();
      await expect(repository.get(second.id)).resolves.toMatchObject({
        mutationSequence: 2,
        deliveryStatus: 'pending',
      });
    } finally {
      database.close();
      await Dexie.delete(database.name);
    }
  });

  it('liste tous les destinataires d’une même source sans mélanger les propriétaires', async () => {
    const database = new SocialActivitySnapshotOutboxDatabase(
      `sportpilot-social-outbox-source-${crypto.randomUUID()}`,
    );
    const repository = new DexieSocialActivitySnapshotOutboxRepository(database);

    try {
      await database.open();
      await repository.put(pendingRecord({
        recipientUserId: 'friend-b',
        sourceActivityId: 'activity-shared',
        stagedAt: '2026-07-07T10:02:00.000Z',
      }));
      await repository.put(pendingRecord({
        recipientUserId: 'friend-a',
        sourceActivityId: 'activity-shared',
        stagedAt: '2026-07-07T10:01:00.000Z',
      }));
      await repository.put(pendingRecord({
        ownerUserId: 'other-owner',
        recipientUserId: 'friend-c',
        sourceActivityId: 'activity-shared',
        stagedAt: '2026-07-07T10:03:00.000Z',
      }));

      const records = await repository.listBySource({
        ownerUserId: 'owner',
        sourceKind: 'activity',
        sourceActivityId: 'activity-shared',
      });

      expect(records.map((record) => record.recipientUserId)).toEqual([
        'friend-a',
        'friend-b',
      ]);
    } finally {
      database.close();
      await Dexie.delete(database.name);
    }
  });

});
