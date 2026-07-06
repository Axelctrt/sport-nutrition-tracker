import type { Table } from 'dexie';
import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  SocialCloudFriendRequestPort,
  SocialCloudMutationResult,
} from '@/domain/friends/socialCloudContract';
import type { CloudFriendRequest } from '@/domain/friends/socialIdentity';
import { createCloudFriendRequestId } from '@/domain/friends/friendship';
import {
  createSyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { createSocialFriendRequestsClient } from '@/infrastructure/sync-prototype/socialFriendRequestsGateway';
import {
  readSyncPrototypeConfigSafely,
  type EnabledSyncPrototypeConfig,
  type SafeSyncPrototypeConfigResult,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export interface SocialCloudFriendRequestDatabase {
  readonly socialFriendRequests: Table<CloudFriendRequest, EntityId | string>;
}

export interface SocialCloudFriendRequestClock {
  readonly now: () => IsoDateTime;
}

export interface ClosableSocialCloudFriendRequestDatabase extends SocialCloudFriendRequestDatabase {
  readonly open?: () => Promise<unknown>;
  readonly close?: () => void;
}

export interface RuntimeSocialCloudFriendRequestPortOptions {
  readonly configResult?: SafeSyncPrototypeConfigResult;
  readonly databaseFactory?: (config: EnabledSyncPrototypeConfig) => ClosableSocialCloudFriendRequestDatabase;
  readonly portFactory?: (database: SocialCloudFriendRequestDatabase) => SocialCloudFriendRequestPort;
  readonly serverPortFactory?: () => SocialCloudFriendRequestPort;
}

function defaultNow(): IsoDateTime {
  return new Date().toISOString();
}

function unavailableMessage(): string {
  return 'Backend social cloud indisponible : demande d’ami cloud impossible pour le moment.';
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Demande d’ami cloud impossible.';
}

function isTerminalStatus(status: CloudFriendRequest['status']): boolean {
  return status === 'accepted' || status === 'declined' || status === 'cancelled';
}

function normalizeRequestId(request: CloudFriendRequest): EntityId {
  return createCloudFriendRequestId(
    request.requesterUserId as EntityId,
    request.recipientUserId as EntityId,
  );
}

export const unavailableSocialCloudFriendRequestPort: SocialCloudFriendRequestPort = {
  async sendRequest(request) {
    return {
      status: request.requesterUserId === request.recipientUserId ? 'forbidden' : 'unavailable',
      message: request.requesterUserId === request.recipientUserId
        ? 'Impossible de t’envoyer une demande à toi-même.'
        : unavailableMessage(),
    };
  },
  async listIncomingRequests() {
    return [];
  },
  async listOutgoingRequests() {
    return [];
  },
  async updateRequestStatus() {
    return {
      status: 'unavailable',
      message: unavailableMessage(),
    };
  },
};

function createServerFriendRequestPort(options: RuntimeSocialCloudFriendRequestPortOptions): SocialCloudFriendRequestPort {
  return options.serverPortFactory ? options.serverPortFactory() : createSocialFriendRequestsClient();
}

export function createRealSocialCloudFriendRequestPort(
  database: SocialCloudFriendRequestDatabase,
  clock: SocialCloudFriendRequestClock = { now: defaultNow },
): SocialCloudFriendRequestPort {
  return {
    async sendRequest(request): Promise<SocialCloudMutationResult<CloudFriendRequest>> {
      if (request.requesterUserId === request.recipientUserId) {
        return {
          status: 'forbidden',
          message: 'Impossible de t’envoyer une demande à toi-même.',
        };
      }

      try {
        const id = normalizeRequestId(request);
        const existing = await database.socialFriendRequests.get(id);
        if (existing?.status === 'pending') {
          return {
            status: 'alreadyExists',
            value: existing,
            message: 'Une demande cloud est déjà en attente pour cet utilisateur.',
          };
        }

        if (existing && isTerminalStatus(existing.status)) {
          return {
            status: 'conflict',
            value: existing,
            message: 'Une ancienne demande cloud existe déjà pour cette relation userId.',
          };
        }

        const now = clock.now();
        const next: CloudFriendRequest = {
          ...request,
          id,
          status: 'pending',
          requestedAt: request.requestedAt || now,
          createdAt: request.createdAt || now,
          updatedAt: now,
        };
        await database.socialFriendRequests.put(next);

        return {
          status: 'created',
          value: next,
          message: 'Demande d’ami cloud envoyée. Elle devra être acceptée avant toute relation.',
        };
      } catch (error) {
        return {
          status: 'unavailable',
          message: mutationErrorMessage(error),
        };
      }
    },

    async listIncomingRequests(userId) {
      return database.socialFriendRequests
        .where('recipientUserId')
        .equals(userId)
        .toArray();
    },

    async listOutgoingRequests(userId) {
      return database.socialFriendRequests
        .where('requesterUserId')
        .equals(userId)
        .toArray();
    },

    async updateRequestStatus(requestId, status, respondedAt): Promise<SocialCloudMutationResult<CloudFriendRequest>> {
      try {
        const existing = await database.socialFriendRequests.get(requestId);
        if (!existing) {
          return {
            status: 'notFound',
            message: 'Demande cloud introuvable.',
          };
        }

        const next: CloudFriendRequest = {
          ...existing,
          status,
          ...(status === 'accepted' || status === 'declined' ? { respondedAt } : {}),
          updatedAt: respondedAt,
        };
        await database.socialFriendRequests.put(next);

        return {
          status: 'updated',
          value: next,
          message: `Demande cloud ${status}.`,
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

export function createRuntimeSocialCloudFriendRequestPort(
  options: RuntimeSocialCloudFriendRequestPortOptions = {},
): SocialCloudFriendRequestPort {
  return {
    async sendRequest(request) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      const config = configResult.config;
      if (configResult.errorMessage || !config.enabled || !config.realSocialCloudEnabled) {
        return unavailableSocialCloudFriendRequestPort.sendRequest(request);
      }

      const serverResult = await createServerFriendRequestPort(options).sendRequest(request);
      if (serverResult.status !== 'unavailable') return serverResult;

      const database = options.databaseFactory
        ? options.databaseFactory(config)
        : createSyncPrototypeDatabase(config);
      const port = options.portFactory
        ? options.portFactory(database)
        : createRealSocialCloudFriendRequestPort(database);

      try {
        await database.open?.();
        return await port.sendRequest(request);
      } catch {
        return {
          status: 'unavailable',
          message: unavailableMessage(),
        };
      } finally {
        database.close?.();
      }
    },

    async listIncomingRequests(userId) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      const config = configResult.config;
      if (configResult.errorMessage || !config.enabled || !config.realSocialCloudEnabled) return [];

      const serverRequests = await createServerFriendRequestPort(options).listIncomingRequests(userId);
      if (serverRequests.length > 0 || !options.databaseFactory) return serverRequests;

      const database = options.databaseFactory(config);
      const port = options.portFactory
        ? options.portFactory(database)
        : createRealSocialCloudFriendRequestPort(database);

      try {
        await database.open?.();
        return await port.listIncomingRequests(userId);
      } catch {
        return [];
      } finally {
        database.close?.();
      }
    },

    async listOutgoingRequests(userId) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      const config = configResult.config;
      if (configResult.errorMessage || !config.enabled || !config.realSocialCloudEnabled) return [];

      const serverRequests = await createServerFriendRequestPort(options).listOutgoingRequests(userId);
      if (serverRequests.length > 0 || !options.databaseFactory) return serverRequests;

      const database = options.databaseFactory(config);
      const port = options.portFactory
        ? options.portFactory(database)
        : createRealSocialCloudFriendRequestPort(database);

      try {
        await database.open?.();
        return await port.listOutgoingRequests(userId);
      } catch {
        return [];
      } finally {
        database.close?.();
      }
    },

    async updateRequestStatus(requestId, status, respondedAt) {
      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      const config = configResult.config;
      if (configResult.errorMessage || !config.enabled || !config.realSocialCloudEnabled) {
        return unavailableSocialCloudFriendRequestPort.updateRequestStatus(requestId, status, respondedAt);
      }

      const serverResult = await createServerFriendRequestPort(options).updateRequestStatus(requestId, status, respondedAt);
      if (serverResult.status !== 'unavailable') return serverResult;

      const database = options.databaseFactory
        ? options.databaseFactory(config)
        : createSyncPrototypeDatabase(config);
      const port = options.portFactory
        ? options.portFactory(database)
        : createRealSocialCloudFriendRequestPort(database);

      try {
        await database.open?.();
        return await port.updateRequestStatus(requestId, status, respondedAt);
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
