import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Activity } from '@/domain/models/activity';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { EntityId } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import type {
  EnabledSyncPrototypeConfig,
  SyncPrototypeConfig,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export const SYNC_PROTOTYPE_DATABASE_NAME = 'sportpilot-sync-prototype';
export const SYNC_PROTOTYPE_DATABASE_VERSION = 3;
export const SYNC_PROTOTYPE_TABLE_NAMES = [
  'weights',
  'deletionRecords',
  'realWeights',
  'realWeightDeletionRecords',
  'realActivities',
  'realActivityDeletionRecords',
] as const;

export class SyncPrototypeDatabase extends Dexie {
  declare weights: Table<WeightEntry, EntityId>;
  declare deletionRecords: Table<DeletionRecord, EntityId>;
  declare realWeights: Table<WeightEntry, EntityId>;
  declare realWeightDeletionRecords: Table<DeletionRecord, EntityId>;
  declare realActivities: Table<Activity, EntityId>;
  declare realActivityDeletionRecords: Table<DeletionRecord, EntityId>;

  constructor(
    { databaseUrl }: EnabledSyncPrototypeConfig,
    databaseName: string = SYNC_PROTOTYPE_DATABASE_NAME,
  ) {
    super(databaseName, { addons: [dexieCloud] });

    this.version(1).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.version(2).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.version(SYNC_PROTOTYPE_DATABASE_VERSION).stores({
      weights: 'id, &date, updatedAt',
      deletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
      realActivities: 'id, date, type, [date+type], updatedAt',
      realActivityDeletionRecords:
        'id, entityType, entityId, status, deletedAt, restoredAt, updatedAt, [entityType+entityId]',
    });

    this.cloud.configure({
      databaseUrl,
      requireAuth: false,
      customLoginGui: true,
      tryUseServiceWorker: false,
      nameSuffix: true,
      socialAuth: false,
    });
  }
}

export function createSyncPrototypeDatabase(
  config: SyncPrototypeConfig,
): SyncPrototypeDatabase {
  if (!config.enabled) {
    throw new Error(
      'Le prototype de synchronisation est désactivé.',
    );
  }

  return new SyncPrototypeDatabase(config);
}
