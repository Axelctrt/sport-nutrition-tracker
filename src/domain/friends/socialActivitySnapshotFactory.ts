import {
  normalizeSocialActivityFieldSelection,
  selectSocialActivityFieldsForFamily,
} from '@/domain/friends/socialActivitySharingPolicy';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
  createSocialActivitySnapshotV2Id,
  type ActiveSocialActivitySnapshot,
  type CreateActiveSocialActivitySnapshotInput,
  type CreateDeletedSocialActivitySnapshotInput,
  type DeletedSocialActivitySnapshot,
} from '@/domain/friends/socialActivitySnapshotContract';
import { assertValidSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotValidation';

export function createActiveSocialActivitySnapshotV2(
  input: CreateActiveSocialActivitySnapshotInput,
): ActiveSocialActivitySnapshot {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const allowedFields = selectSocialActivityFieldsForFamily(
    normalizeSocialActivityFieldSelection(input.allowedFields),
    input.family,
  );
  const snapshot: ActiveSocialActivitySnapshot = {
    contractVersion: SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
    snapshotId: createSocialActivitySnapshotV2Id(input),
    ownerUserId: input.ownerUserId,
    recipientUserId: input.recipientUserId,
    sourceKind: input.sourceKind,
    sourceActivityId: input.sourceActivityId,
    sourceRevision: input.sourceRevision,
    createdAt: input.createdAt ?? updatedAt,
    updatedAt,
    state: 'active',
    visibility: input.visibility,
    family: input.family,
    activityType: input.activityType,
    ...(input.title === undefined ? {} : { title: input.title }),
    occurredOn: input.occurredOn,
    ...(input.occurredAt === undefined ? {} : { occurredAt: input.occurredAt }),
    allowedFields,
    summary: input.summary,
    ...(input.detail === undefined ? {} : { detail: input.detail }),
  };
  assertValidSocialActivitySnapshotV2(snapshot);
  return snapshot;
}

export function createDeletedSocialActivitySnapshotV2(
  input: CreateDeletedSocialActivitySnapshotInput,
): DeletedSocialActivitySnapshot {
  const deletedAt = input.deletedAt ?? new Date().toISOString();
  const snapshot: DeletedSocialActivitySnapshot = {
    contractVersion: SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
    snapshotId: createSocialActivitySnapshotV2Id(input),
    ownerUserId: input.ownerUserId,
    recipientUserId: input.recipientUserId,
    sourceKind: input.sourceKind,
    sourceActivityId: input.sourceActivityId,
    sourceRevision: input.sourceRevision,
    createdAt: input.createdAt,
    updatedAt: deletedAt,
    state: 'deleted',
    deletedAt,
    deletionReason: input.deletionReason,
  };
  assertValidSocialActivitySnapshotV2(snapshot);
  return snapshot;
}
