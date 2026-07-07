import {
  createDeletedSocialActivitySnapshotV2,
} from '@/domain/friends/socialActivitySnapshotFactory';
import {
  createSocialActivitySnapshotV2Id,
  type ActiveSocialActivitySnapshot,
  type SocialActivitySnapshotDeletionReason,
  type SocialActivitySnapshotSourceKind,
} from '@/domain/friends/socialActivitySnapshotContract';
import {
  stageSocialActivitySnapshotOutboxRecord,
  type SocialActivitySnapshotOutboxRecord,
} from '@/domain/friends/socialActivitySnapshotOutbox';
import type { EntityId, IsoDateTime } from '@/domain/models/common';

export interface SocialActivitySnapshotLifecycleRepository {
  readonly get: (snapshotId: EntityId) => Promise<SocialActivitySnapshotOutboxRecord | undefined>;
  readonly put: (record: SocialActivitySnapshotOutboxRecord) => Promise<void>;
}

interface StageActiveSocialActivitySnapshotInput {
  readonly repository: SocialActivitySnapshotLifecycleRepository;
  readonly nextSnapshot: ActiveSocialActivitySnapshot;
  readonly stagedAt?: IsoDateTime;
}

interface RemoveSocialActivitySnapshotInput {
  readonly repository: SocialActivitySnapshotLifecycleRepository;
  readonly nextSnapshot?: undefined;
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly sourceRevision: string;
  readonly removalReason: SocialActivitySnapshotDeletionReason;
  readonly stagedAt?: IsoDateTime;
}

export type ReconcileSocialActivitySnapshotInput =
  | StageActiveSocialActivitySnapshotInput
  | RemoveSocialActivitySnapshotInput;

export interface ReconcileSocialActivitySnapshotResult {
  readonly status: 'created' | 'updated' | 'deleted' | 'unchanged' | 'notFound';
  readonly record?: SocialActivitySnapshotOutboxRecord;
}

function nowIsoDateTime(): IsoDateTime {
  return new Date().toISOString();
}

export async function reconcileSocialActivitySnapshot(
  input: ReconcileSocialActivitySnapshotInput,
): Promise<ReconcileSocialActivitySnapshotResult> {
  const stagedAt = input.stagedAt ?? nowIsoDateTime();

  if (input.nextSnapshot) {
    const previous = await input.repository.get(input.nextSnapshot.snapshotId);
    const staged = stageSocialActivitySnapshotOutboxRecord({
      snapshot: input.nextSnapshot,
      stagedAt,
      ...(previous ? { previous } : {}),
    });

    if (!staged.changed) return { status: 'unchanged', record: staged.record };

    await input.repository.put(staged.record);
    return {
      status: previous ? 'updated' : 'created',
      record: staged.record,
    };
  }

  const snapshotId = createSocialActivitySnapshotV2Id(input);
  const previous = await input.repository.get(snapshotId);
  if (!previous) return { status: 'notFound' };

  if (
    previous.snapshot.state === 'deleted'
    && previous.snapshot.deletionReason === input.removalReason
    && previous.snapshot.sourceRevision === input.sourceRevision
  ) {
    return { status: 'unchanged', record: previous };
  }

  const deletedSnapshot = createDeletedSocialActivitySnapshotV2({
    ownerUserId: input.ownerUserId,
    recipientUserId: input.recipientUserId,
    sourceKind: input.sourceKind,
    sourceActivityId: input.sourceActivityId,
    sourceRevision: input.sourceRevision,
    deletionReason: input.removalReason,
    createdAt: previous.snapshot.createdAt,
    deletedAt: stagedAt,
  });
  const staged = stageSocialActivitySnapshotOutboxRecord({
    snapshot: deletedSnapshot,
    stagedAt,
    previous,
  });

  await input.repository.put(staged.record);
  return { status: 'deleted', record: staged.record };
}
