import type { Table } from 'dexie';
import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  SocialCloudActivitySnapshotPort,
  SocialCloudMutationResult,
} from '@/domain/friends/socialCloudContract';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  buildCloudSocialActivitySnapshotRecords,
  cloudSocialActivitySnapshotRecordToFeedSnapshot,
  type CloudSocialActivitySnapshotRecord,
} from '@/domain/friends/socialCloudActivitySnapshot';
import { createSyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  readSyncPrototypeConfigSafely,
  type EnabledSyncPrototypeConfig,
  type SafeSyncPrototypeConfigResult,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export interface SocialCloudActivitySnapshotDatabase {
  readonly socialActivitySnapshots: Table<CloudSocialActivitySnapshotRecord, EntityId | string>;
}

export interface SocialCloudActivitySnapshotClock {
  readonly now: () => IsoDateTime;
}

export interface ClosableSocialCloudActivitySnapshotDatabase extends SocialCloudActivitySnapshotDatabase {
  readonly open?: () => Promise<unknown>;
  readonly close?: () => void;
}

export interface RuntimeSocialCloudActivitySnapshotPortOptions {
  readonly configResult?: SafeSyncPrototypeConfigResult;
  readonly databaseFactory?: (config: EnabledSyncPrototypeConfig) => ClosableSocialCloudActivitySnapshotDatabase;
  readonly portFactory?: (database: SocialCloudActivitySnapshotDatabase) => SocialCloudActivitySnapshotPort;
}

function defaultNow(): IsoDateTime {
  return new Date().toISOString();
}

function unavailableMessage(): string {
  return 'Backend social cloud indisponible : publication et lecture des snapshots sociaux impossibles pour le moment.';
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Synchronisation cloud des snapshots sociaux impossible.';
}

function canUseRuntime(configResult: SafeSyncPrototypeConfigResult): configResult is SafeSyncPrototypeConfigResult & { readonly config: EnabledSyncPrototypeConfig } {
  return !configResult.errorMessage && configResult.config.enabled && configResult.config.realSocialCloudEnabled;
}

export const unavailableSocialCloudActivitySnapshotPort: SocialCloudActivitySnapshotPort = {
  async publishSnapshots(_userId, snapshots) {
    return {
      status: snapshots.length === 0 ? 'notFound' : 'unavailable',
      message: snapshots.length === 0 ? 'Aucun snapshot filtré à publier.' : unavailableMessage(),
    };
  },
  async listFeedSnapshots() {
    return [];
  },
};

export function createRealSocialCloudActivitySnapshotPort(
  database: SocialCloudActivitySnapshotDatabase,
  clock: SocialCloudActivitySnapshotClock = { now: defaultNow },
): SocialCloudActivitySnapshotPort {
  return {
    async publishSnapshots(userId, snapshots): Promise<SocialCloudMutationResult<readonly SocialActivitySnapshot[]>> {
      if (snapshots.length === 0) {
        return {
          status: 'notFound',
          message: 'Aucun snapshot filtré à publier.',
        };
      }

      try {
        const records = buildCloudSocialActivitySnapshotRecords(userId, snapshots, clock.now());
        await database.socialActivitySnapshots.bulkPut(records as CloudSocialActivitySnapshotRecord[]);

        return {
          status: 'created',
          value: snapshots,
          message: 'Snapshots sociaux cloud publiés sans activité brute.',
        };
      } catch (error) {
        return {
          status: 'unavailable',
          message: mutationErrorMessage(error),
        };
      }
    },

    async listFeedSnapshots(userId) {
      const records = await database.socialActivitySnapshots
        .where('publishedForUserId')
        .equals(userId)
        .toArray();

      return records
        .filter((record) => record.rawActivityShared === false)
        .map(cloudSocialActivitySnapshotRecordToFeedSnapshot);
    },
  };
}

function createRuntimeDatabase(
  options: RuntimeSocialCloudActivitySnapshotPortOptions,
  config: EnabledSyncPrototypeConfig,
): ClosableSocialCloudActivitySnapshotDatabase {
  return options.databaseFactory ? options.databaseFactory(config) : createSyncPrototypeDatabase(config);
}

export function createRuntimeSocialCloudActivitySnapshotPort(
  options: RuntimeSocialCloudActivitySnapshotPortOptions = {},
): SocialCloudActivitySnapshotPort {
  return {
    async publishSnapshots(userId, snapshots) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      if (!canUseRuntime(configResult)) return unavailableSocialCloudActivitySnapshotPort.publishSnapshots(userId, snapshots);

      const database = createRuntimeDatabase(options, configResult.config);
      const port = options.portFactory ? options.portFactory(database) : createRealSocialCloudActivitySnapshotPort(database);

      try {
        await database.open?.();
        return await port.publishSnapshots(userId, snapshots);
      } catch {
        return {
          status: 'unavailable',
          message: unavailableMessage(),
        };
      } finally {
        database.close?.();
      }
    },

    async listFeedSnapshots(userId) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      if (!canUseRuntime(configResult)) return [];

      const database = createRuntimeDatabase(options, configResult.config);
      const port = options.portFactory ? options.portFactory(database) : createRealSocialCloudActivitySnapshotPort(database);

      try {
        await database.open?.();
        return await port.listFeedSnapshots(userId);
      } catch {
        return [];
      } finally {
        database.close?.();
      }
    },
  };
}
