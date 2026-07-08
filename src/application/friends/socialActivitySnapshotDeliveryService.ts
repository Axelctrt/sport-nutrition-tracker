import type { SocialActivitySnapshotCloudCredentials, SocialActivitySnapshotCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import { SocialActivitySnapshotCloudError } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import type { EntityId, IsoDateTime } from '@/domain/models/common';

export interface SocialActivitySnapshotDeliveryRepository {
  readonly listReadyForDelivery: (input: {
    readonly ownerUserId: EntityId;
    readonly now: IsoDateTime;
    readonly limit?: number;
  }) => Promise<readonly SocialActivitySnapshotOutboxRecord[]>;
  readonly markDelivered: (input: {
    readonly snapshotId: EntityId;
    readonly expectedMutationSequence: number;
    readonly deliveredAt: IsoDateTime;
  }) => Promise<SocialActivitySnapshotOutboxRecord | undefined>;
  readonly getNextRetryAt?: (input: {
    readonly ownerUserId: EntityId;
  }) => Promise<IsoDateTime | undefined>;
  readonly markFailed: (input: {
    readonly snapshotId: EntityId;
    readonly expectedMutationSequence: number;
    readonly failedAt: IsoDateTime;
    readonly nextAttemptAt: IsoDateTime;
    readonly errorCode: string;
  }) => Promise<SocialActivitySnapshotOutboxRecord | undefined>;
}

export interface SocialActivitySnapshotDeliveryReport {
  readonly selectedCount: number;
  readonly deliveredCount: number;
  readonly failedCount: number;
  readonly ignoredStaleAcknowledgementCount: number;
  readonly nextRetryAt?: IsoDateTime;
}

const MIN_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;

function retryDelayMs(attemptCount: number): number {
  return Math.min(MAX_RETRY_DELAY_MS, MIN_RETRY_DELAY_MS * (2 ** Math.min(attemptCount, 6)));
}

function retryAt(now: Date, attemptCount: number): IsoDateTime {
  return new Date(now.getTime() + retryDelayMs(attemptCount)).toISOString();
}

function deliveryErrorCode(error: unknown): string {
  if (error instanceof SocialActivitySnapshotCloudError) return error.code;
  return error instanceof Error && error.name
    ? error.name.toLowerCase().replace(/[^a-z0-9._-]+/gu, '_').slice(0, 64)
    : 'social_activity_delivery_failed';
}

export async function deliverSocialActivitySnapshotOutbox(input: {
  readonly credentials: SocialActivitySnapshotCloudCredentials;
  readonly repository: SocialActivitySnapshotDeliveryRepository;
  readonly gateway: SocialActivitySnapshotCloudGateway;
  readonly now?: Date;
  readonly limit?: number;
}): Promise<SocialActivitySnapshotDeliveryReport> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const records = await input.repository.listReadyForDelivery({
    ownerUserId: input.credentials.userId as EntityId,
    now: nowIso,
    ...(input.limit === undefined ? {} : { limit: input.limit }),
  });

  let deliveredCount = 0;
  let failedCount = 0;
  let ignoredStaleAcknowledgementCount = 0;
  let nextRetryAt: IsoDateTime | undefined;

  for (const record of records) {
    try {
      await input.gateway.publish(input.credentials, record);
      const delivered = await input.repository.markDelivered({
        snapshotId: record.snapshotId,
        expectedMutationSequence: record.mutationSequence,
        deliveredAt: nowIso,
      });
      if (delivered) deliveredCount += 1;
      else ignoredStaleAcknowledgementCount += 1;
    } catch (error) {
      const nextAttemptAt = retryAt(now, record.attemptCount);
      const failed = await input.repository.markFailed({
        snapshotId: record.snapshotId,
        expectedMutationSequence: record.mutationSequence,
        failedAt: nowIso,
        nextAttemptAt,
        errorCode: deliveryErrorCode(error),
      });
      if (failed) {
        failedCount += 1;
        if (!nextRetryAt || nextAttemptAt < nextRetryAt) nextRetryAt = nextAttemptAt;
      } else {
        ignoredStaleAcknowledgementCount += 1;
      }
    }
  }

  if (input.repository.getNextRetryAt) {
    const persistedNextRetryAt = await input.repository.getNextRetryAt({
      ownerUserId: input.credentials.userId as EntityId,
    });
    if (persistedNextRetryAt && (!nextRetryAt || persistedNextRetryAt < nextRetryAt)) {
      nextRetryAt = persistedNextRetryAt;
    }
  }

  return {
    selectedCount: records.length,
    deliveredCount,
    failedCount,
    ignoredStaleAcknowledgementCount,
    ...(nextRetryAt ? { nextRetryAt } : {}),
  };
}
