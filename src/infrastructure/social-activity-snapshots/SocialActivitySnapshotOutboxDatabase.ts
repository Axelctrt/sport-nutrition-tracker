import Dexie, { type Table } from 'dexie';

import type { SocialActivitySnapshotOutboxRecord } from '@/domain/friends/socialActivitySnapshotOutbox';
import type { EntityId } from '@/domain/models/common';

export const SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_NAME =
  'sportpilot-social-activity-snapshot-outbox';
export const SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION = 1;
export const SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_TABLE_NAME = 'records' as const;

export class SocialActivitySnapshotOutboxDatabase extends Dexie {
  declare records: Table<SocialActivitySnapshotOutboxRecord, EntityId>;

  constructor(databaseName: string = SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_NAME) {
    super(databaseName);

    this.version(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION).stores({
      records:
        'id, ownerUserId, recipientUserId, sourceActivityId, snapshotState, deliveryStatus, pendingSince, nextAttemptAt, [ownerUserId+sourceActivityId], [ownerUserId+deliveryStatus]',
    });
  }
}
