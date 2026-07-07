import type { IsoDateTime } from '@/domain/models/common';
import type { SocialActivitySnapshotLifecycleRepository } from '@/application/friends/socialActivitySnapshotLifecycleService';
import {
  isSocialActivitySnapshotOutboxRecordReady,
  markSocialActivitySnapshotOutboxDelivered,
  markSocialActivitySnapshotOutboxFailed,
  type SocialActivitySnapshotOutboxRecord,
} from '@/domain/friends/socialActivitySnapshotOutbox';
import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshotOutboxDatabase } from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';

const DEFAULT_DELIVERY_BATCH_SIZE = 50;
const MAX_DELIVERY_BATCH_SIZE = 100;

function normalizeBatchSize(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_DELIVERY_BATCH_SIZE;
  return Math.min(MAX_DELIVERY_BATCH_SIZE, Math.max(1, Math.trunc(limit)));
}

export class DexieSocialActivitySnapshotOutboxRepository
implements SocialActivitySnapshotLifecycleRepository {
  private readonly database: SocialActivitySnapshotOutboxDatabase;

  constructor(database: SocialActivitySnapshotOutboxDatabase) {
    this.database = database;
  }

  get(snapshotId: EntityId): Promise<SocialActivitySnapshotOutboxRecord | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire le snapshot social local.',
      () => this.database.records.get(snapshotId),
    );
  }

  put(record: SocialActivitySnapshotOutboxRecord): Promise<void> {
    return runRepositoryOperation(
      'update',
      'Impossible de mettre en file le snapshot social local.',
      async () => {
        await this.database.records.put(record);
      },
    );
  }

  listReadyForDelivery(input: {
    readonly ownerUserId: EntityId;
    readonly now: IsoDateTime;
    readonly limit?: number;
  }): Promise<readonly SocialActivitySnapshotOutboxRecord[]> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les snapshots sociaux en attente.',
      async () => {
        const records = await this.database.records
          .where('ownerUserId')
          .equals(input.ownerUserId)
          .filter((record) => isSocialActivitySnapshotOutboxRecordReady(record, input.now))
          .toArray();

        return records
          .sort((left, right) => {
            const timeComparison = left.pendingSince.localeCompare(right.pendingSince);
            return timeComparison === 0 ? left.id.localeCompare(right.id) : timeComparison;
          })
          .slice(0, normalizeBatchSize(input.limit));
      },
    );
  }

  markDelivered(input: {
    readonly snapshotId: EntityId;
    readonly expectedMutationSequence: number;
    readonly deliveredAt: IsoDateTime;
  }): Promise<SocialActivitySnapshotOutboxRecord | undefined> {
    return runRepositoryOperation(
      'update',
      'Impossible de confirmer la livraison du snapshot social.',
      () => this.database.transaction('rw', this.database.records, async () => {
        const current = await this.database.records.get(input.snapshotId);
        if (!current) return undefined;

        const updated = markSocialActivitySnapshotOutboxDelivered({
          record: current,
          expectedMutationSequence: input.expectedMutationSequence,
          deliveredAt: input.deliveredAt,
        });
        if (!updated) return undefined;

        await this.database.records.put(updated);
        return updated;
      }),
    );
  }

  markFailed(input: {
    readonly snapshotId: EntityId;
    readonly expectedMutationSequence: number;
    readonly failedAt: IsoDateTime;
    readonly nextAttemptAt: IsoDateTime;
    readonly errorCode: string;
  }): Promise<SocialActivitySnapshotOutboxRecord | undefined> {
    return runRepositoryOperation(
      'update',
      'Impossible de planifier une nouvelle tentative du snapshot social.',
      () => this.database.transaction('rw', this.database.records, async () => {
        const current = await this.database.records.get(input.snapshotId);
        if (!current) return undefined;

        const updated = markSocialActivitySnapshotOutboxFailed({
          record: current,
          expectedMutationSequence: input.expectedMutationSequence,
          failedAt: input.failedAt,
          nextAttemptAt: input.nextAttemptAt,
          errorCode: input.errorCode,
        });
        if (!updated) return undefined;

        await this.database.records.put(updated);
        return updated;
      }),
    );
  }
}
