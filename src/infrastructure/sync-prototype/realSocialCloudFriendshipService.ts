import type { Table } from 'dexie';
import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  SocialCloudFriendPermissionPort,
  SocialCloudFriendshipPort,
  SocialCloudMutationResult,
} from '@/domain/friends/socialCloudContract';
import type { FriendActivityPermission } from '@/domain/friends/friendship';
import type { CloudFriendship } from '@/domain/friends/socialIdentity';
import {
  buildCloudFriendPermissionRecord,
  cloudPermissionRecordToLocalPermission,
  createCloudFriendshipId,
  type CloudFriendActivityPermissionRecord,
} from '@/domain/friends/socialCloudFriendship';
import { createSyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  readSyncPrototypeConfigSafely,
  type EnabledSyncPrototypeConfig,
  type SafeSyncPrototypeConfigResult,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export interface SocialCloudFriendshipDatabase {
  readonly socialFriendships: Table<CloudFriendship, EntityId | string>;
  readonly socialFriendPermissions: Table<CloudFriendActivityPermissionRecord, EntityId | string>;
}

export interface SocialCloudFriendshipClock {
  readonly now: () => IsoDateTime;
}

export interface ClosableSocialCloudFriendshipDatabase extends SocialCloudFriendshipDatabase {
  readonly open?: () => Promise<unknown>;
  readonly close?: () => void;
}

export interface RuntimeSocialCloudFriendshipPortOptions {
  readonly configResult?: SafeSyncPrototypeConfigResult;
  readonly databaseFactory?: (config: EnabledSyncPrototypeConfig) => ClosableSocialCloudFriendshipDatabase;
  readonly friendshipPortFactory?: (database: SocialCloudFriendshipDatabase) => SocialCloudFriendshipPort;
  readonly permissionPortFactory?: (database: SocialCloudFriendshipDatabase) => SocialCloudFriendPermissionPort;
}

function defaultNow(): IsoDateTime {
  return new Date().toISOString();
}

function unavailableMessage(): string {
  return 'Backend social cloud indisponible : amitiés et permissions cloud impossibles pour le moment.';
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Synchronisation cloud de l’amitié impossible.';
}

function isActiveFriendship(friendship: CloudFriendship): boolean {
  return friendship.status === 'active';
}

export const unavailableSocialCloudFriendshipPort: SocialCloudFriendshipPort = {
  async listFriendships() {
    return [];
  },
  async upsertFriendship(friendship) {
    return {
      status: friendship.userAId === friendship.userBId ? 'forbidden' : 'unavailable',
      message: friendship.userAId === friendship.userBId
        ? 'Une amitié cloud doit relier deux userId distincts.'
        : unavailableMessage(),
    };
  },
};

export const unavailableSocialCloudFriendPermissionPort: SocialCloudFriendPermissionPort = {
  async listPermissions() {
    return [];
  },
  async savePermission(_userId, permission) {
    return {
      status: permission.friendUserId ? 'unavailable' : 'forbidden',
      message: permission.friendUserId
        ? unavailableMessage()
        : 'Une permission cloud doit cibler un friendUserId stable.',
    };
  },
};

export function createRealSocialCloudFriendshipPort(
  database: SocialCloudFriendshipDatabase,
  clock: SocialCloudFriendshipClock = { now: defaultNow },
): SocialCloudFriendshipPort {
  return {
    async listFriendships(userId) {
      const [asA, asB] = await Promise.all([
        database.socialFriendships.where('userAId').equals(userId).toArray(),
        database.socialFriendships.where('userBId').equals(userId).toArray(),
      ]);
      const byId = new Map<string, CloudFriendship>();
      for (const friendship of [...asA, ...asB]) {
        if (isActiveFriendship(friendship)) byId.set(friendship.id, friendship);
      }
      return [...byId.values()];
    },

    async upsertFriendship(friendship): Promise<SocialCloudMutationResult<CloudFriendship>> {
      if (friendship.userAId === friendship.userBId) {
        return {
          status: 'forbidden',
          message: 'Une amitié cloud doit relier deux userId distincts.',
        };
      }

      try {
        const id = createCloudFriendshipId(friendship.userAId as EntityId, friendship.userBId as EntityId);
        const existing = await database.socialFriendships.get(id);
        const now = clock.now();
        const next: CloudFriendship = {
          ...friendship,
          id,
          status: 'active',
          createdAt: existing?.createdAt ?? friendship.createdAt ?? now,
          updatedAt: now,
        };
        await database.socialFriendships.put(next);

        return {
          status: existing ? 'updated' : 'created',
          value: next,
          message: existing ? 'Amitié cloud mise à jour.' : 'Amitié cloud créée.',
        };
      } catch (error) {
        return {
          status: 'unavailable',
          message: mutationErrorMessage(error),
        };
      }
    },
  };
}

export function createRealSocialCloudFriendPermissionPort(
  database: SocialCloudFriendshipDatabase,
  clock: SocialCloudFriendshipClock = { now: defaultNow },
): SocialCloudFriendPermissionPort {
  return {
    async listPermissions(userId) {
      const records = await database.socialFriendPermissions
        .where('ownerUserId')
        .equals(userId)
        .toArray();
      return records.map(cloudPermissionRecordToLocalPermission);
    },

    async savePermission(userId, permission): Promise<SocialCloudMutationResult<FriendActivityPermission>> {
      if (!permission.friendUserId) {
        return {
          status: 'forbidden',
          message: 'Une permission cloud doit cibler un friendUserId stable.',
        };
      }

      try {
        const now = clock.now();
        const record = buildCloudFriendPermissionRecord(
          userId,
          {
            id: permission.friendUserId,
            userId: permission.friendUserId,
            displayName: permission.friendHandle,
            handle: permission.friendHandle,
            initials: permission.friendHandle.slice(0, 2).toUpperCase(),
          },
          permission,
          now,
        );
        const existing = await database.socialFriendPermissions.get(record.id);
        const next: CloudFriendActivityPermissionRecord = {
          ...record,
          createdAt: existing?.createdAt ?? record.createdAt,
          updatedAt: now,
        };
        await database.socialFriendPermissions.put(next);

        return {
          status: existing ? 'updated' : 'created',
          value: cloudPermissionRecordToLocalPermission(next),
          message: existing ? 'Permission cloud mise à jour.' : 'Permission cloud créée.',
        };
      } catch (error) {
        return {
          status: 'unavailable',
          message: mutationErrorMessage(error),
        };
      }
    },
  };
}

function canUseRuntime(configResult: SafeSyncPrototypeConfigResult): configResult is SafeSyncPrototypeConfigResult & { readonly config: EnabledSyncPrototypeConfig } {
  return !configResult.errorMessage && configResult.config.enabled && configResult.config.realSocialCloudEnabled;
}

function createRuntimeDatabase(
  options: RuntimeSocialCloudFriendshipPortOptions,
  config: EnabledSyncPrototypeConfig,
): ClosableSocialCloudFriendshipDatabase {
  return options.databaseFactory ? options.databaseFactory(config) : createSyncPrototypeDatabase(config);
}

export function createRuntimeSocialCloudFriendshipPort(
  options: RuntimeSocialCloudFriendshipPortOptions = {},
): SocialCloudFriendshipPort {
  return {
    async listFriendships(userId) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      if (!canUseRuntime(configResult)) return [];

      const database = createRuntimeDatabase(options, configResult.config);
      const port = options.friendshipPortFactory
        ? options.friendshipPortFactory(database)
        : createRealSocialCloudFriendshipPort(database);

      try {
        await database.open?.();
        return await port.listFriendships(userId);
      } catch {
        return [];
      } finally {
        database.close?.();
      }
    },

    async upsertFriendship(friendship) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      if (!canUseRuntime(configResult)) return unavailableSocialCloudFriendshipPort.upsertFriendship(friendship);

      const database = createRuntimeDatabase(options, configResult.config);
      const port = options.friendshipPortFactory
        ? options.friendshipPortFactory(database)
        : createRealSocialCloudFriendshipPort(database);

      try {
        await database.open?.();
        return await port.upsertFriendship(friendship);
      } catch {
        return {
          status: 'unavailable',
          message: unavailableMessage(),
        };
      } finally {
        database.close?.();
      }
    },
  };
}

export function createRuntimeSocialCloudFriendPermissionPort(
  options: RuntimeSocialCloudFriendshipPortOptions = {},
): SocialCloudFriendPermissionPort {
  return {
    async listPermissions(userId) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      if (!canUseRuntime(configResult)) return [];

      const database = createRuntimeDatabase(options, configResult.config);
      const port = options.permissionPortFactory
        ? options.permissionPortFactory(database)
        : createRealSocialCloudFriendPermissionPort(database);

      try {
        await database.open?.();
        return await port.listPermissions(userId);
      } catch {
        return [];
      } finally {
        database.close?.();
      }
    },

    async savePermission(userId, permission) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      if (!canUseRuntime(configResult)) {
        return unavailableSocialCloudFriendPermissionPort.savePermission(userId, permission);
      }

      const database = createRuntimeDatabase(options, configResult.config);
      const port = options.permissionPortFactory
        ? options.permissionPortFactory(database)
        : createRealSocialCloudFriendPermissionPort(database);

      try {
        await database.open?.();
        return await port.savePermission(userId, permission);
      } catch {
        return {
          status: 'unavailable',
          message: unavailableMessage(),
        };
      } finally {
        database.close?.();
      }
    },
  };
}
