import type {
  SocialActivitySnapshotSourceKind,
  SocialActivitySnapshotState,
  SocialActivitySnapshotV2,
} from '@/domain/friends/socialActivitySnapshotContract';
import { assertValidSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotValidation';
import type { EntityId, IsoDateTime } from '@/domain/models/common';

export const SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION = '0.29.0-a4' as const;

export type SocialActivitySnapshotDeliveryStatus = 'pending' | 'failed' | 'delivered';

export interface SocialActivitySnapshotOutboxRecord {
  readonly recordVersion: typeof SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION;
  readonly id: EntityId;
  readonly snapshotId: EntityId;
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly sourceKind: SocialActivitySnapshotSourceKind;
  readonly sourceActivityId: EntityId;
  readonly sourceRevision: string;
  readonly snapshotState: SocialActivitySnapshotState;
  readonly mutationSequence: number;
  readonly deliveryStatus: SocialActivitySnapshotDeliveryStatus;
  readonly attemptCount: number;
  readonly pendingSince: IsoDateTime;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly lastAttemptAt?: IsoDateTime;
  readonly nextAttemptAt?: IsoDateTime;
  readonly deliveredAt?: IsoDateTime;
  readonly lastErrorCode?: string;
  readonly snapshot: SocialActivitySnapshotV2;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

export function areSocialActivitySnapshotsEquivalent(
  left: SocialActivitySnapshotV2,
  right: SocialActivitySnapshotV2,
): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

export function stageSocialActivitySnapshotOutboxRecord(input: {
  readonly snapshot: SocialActivitySnapshotV2;
  readonly stagedAt: IsoDateTime;
  readonly previous?: SocialActivitySnapshotOutboxRecord;
}): {
  readonly record: SocialActivitySnapshotOutboxRecord;
  readonly changed: boolean;
} {
  assertValidSocialActivitySnapshotV2(input.snapshot);

  if (input.previous && input.previous.snapshotId !== input.snapshot.snapshotId) {
    throw new Error('Le snapshot précédent ne correspond pas à la mutation mise en file.');
  }

  if (
    input.previous
    && areSocialActivitySnapshotsEquivalent(input.previous.snapshot, input.snapshot)
  ) {
    return { record: input.previous, changed: false };
  }

  const record: SocialActivitySnapshotOutboxRecord = {
    recordVersion: SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION,
    id: input.snapshot.snapshotId,
    snapshotId: input.snapshot.snapshotId,
    ownerUserId: input.snapshot.ownerUserId,
    recipientUserId: input.snapshot.recipientUserId,
    sourceKind: input.snapshot.sourceKind,
    sourceActivityId: input.snapshot.sourceActivityId,
    sourceRevision: input.snapshot.sourceRevision,
    snapshotState: input.snapshot.state,
    mutationSequence: (input.previous?.mutationSequence ?? 0) + 1,
    deliveryStatus: 'pending',
    attemptCount: 0,
    pendingSince: input.stagedAt,
    createdAt: input.previous?.createdAt ?? input.stagedAt,
    updatedAt: input.stagedAt,
    snapshot: input.snapshot,
  };

  return { record, changed: true };
}

export function markSocialActivitySnapshotOutboxDelivered(input: {
  readonly record: SocialActivitySnapshotOutboxRecord;
  readonly expectedMutationSequence: number;
  readonly deliveredAt: IsoDateTime;
}): SocialActivitySnapshotOutboxRecord | undefined {
  if (input.record.mutationSequence !== input.expectedMutationSequence) return undefined;

  const {
    nextAttemptAt: _nextAttemptAt,
    lastErrorCode: _lastErrorCode,
    ...record
  } = input.record;

  return {
    ...record,
    deliveryStatus: 'delivered',
    attemptCount: input.record.attemptCount + 1,
    updatedAt: input.deliveredAt,
    lastAttemptAt: input.deliveredAt,
    deliveredAt: input.deliveredAt,
  };
}

function sanitizeDeliveryErrorCode(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/gu, '_');
  return normalized.slice(0, 64) || 'delivery_failed';
}

export function markSocialActivitySnapshotOutboxFailed(input: {
  readonly record: SocialActivitySnapshotOutboxRecord;
  readonly expectedMutationSequence: number;
  readonly failedAt: IsoDateTime;
  readonly nextAttemptAt: IsoDateTime;
  readonly errorCode: string;
}): SocialActivitySnapshotOutboxRecord | undefined {
  if (input.record.mutationSequence !== input.expectedMutationSequence) return undefined;

  const { deliveredAt: _deliveredAt, ...record } = input.record;

  return {
    ...record,
    deliveryStatus: 'failed',
    attemptCount: input.record.attemptCount + 1,
    updatedAt: input.failedAt,
    lastAttemptAt: input.failedAt,
    nextAttemptAt: input.nextAttemptAt,
    lastErrorCode: sanitizeDeliveryErrorCode(input.errorCode),
  };
}

export function isSocialActivitySnapshotOutboxRecordReady(
  record: SocialActivitySnapshotOutboxRecord,
  now: IsoDateTime,
): boolean {
  if (record.deliveryStatus === 'delivered') return false;
  if (record.deliveryStatus === 'pending') return true;
  return !record.nextAttemptAt || record.nextAttemptAt <= now;
}
