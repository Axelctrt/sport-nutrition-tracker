import type { EntityId } from '@/domain/models/common';
import type { SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import { validateSocialHandle, type SocialUserLookupResult } from '@/domain/friends/socialIdentity';
import type { SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import {
  createSyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  readSyncPrototypeConfigSafely,
  type EnabledSyncPrototypeConfig,
  type SafeSyncPrototypeConfigResult,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createRealSocialCloudIdentityPort,
  type SocialCloudIdentityDatabase,
} from '@/infrastructure/sync-prototype/realSocialCloudIdentityService';
import {
  createSocialDirectoryClient,
  type SocialDirectoryLookupClient,
} from '@/infrastructure/sync-prototype/socialDirectoryGateway';

export type ExactSocialCloudLookupIdentityPort = Pick<SocialCloudIdentityPort, 'lookupByHandle'>;

export interface ClosableSocialCloudIdentityDatabase extends SocialCloudIdentityDatabase {
  readonly open?: () => Promise<unknown>;
  readonly close?: () => void;
  readonly cloud?: {
    readonly sync?: () => Promise<unknown>;
  };
}

export interface RuntimeSocialCloudUserLookupGatewayOptions {
  readonly configResult?: SafeSyncPrototypeConfigResult;
  readonly databaseFactory?: (config: EnabledSyncPrototypeConfig) => ClosableSocialCloudIdentityDatabase;
  readonly identityPortFactory?: (database: SocialCloudIdentityDatabase) => ExactSocialCloudLookupIdentityPort;
  readonly socialDirectoryLookupClient?: SocialDirectoryLookupClient;
}

function unavailableResult(handle: string): SocialUserLookupResult {
  const validation = validateSocialHandle(handle);
  if (validation.status === 'invalid') return { status: 'invalidHandle' };
  return { status: 'unavailable' };
}

async function syncRuntimeDatabase(database: ClosableSocialCloudIdentityDatabase): Promise<void> {
  await database.cloud?.sync?.();
}

export function createRealSocialCloudUserLookupGateway(
  identityPort: ExactSocialCloudLookupIdentityPort,
): SocialUserLookupGateway {
  return {
    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };

      const result = await identityPort.lookupByHandle(validation.handle);
      if (result.status !== 'found') return result;

      if (result.profile.handle !== validation.handle) {
        return { status: 'notFound' };
      }

      return result;
    },
  };
}

export function createRuntimeSocialCloudUserLookupGateway(
  options: RuntimeSocialCloudUserLookupGatewayOptions = {},
): SocialUserLookupGateway {
  return {
    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };

      const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
      const config = configResult.config;
      if (configResult.errorMessage || !config.enabled || !config.realSocialCloudEnabled) {
        return unavailableResult(validation.handle);
      }

      const socialDirectoryLookupClient = options.socialDirectoryLookupClient ?? createSocialDirectoryClient();
      const directoryResult = await socialDirectoryLookupClient.lookupByHandle(validation.handle);
      if (directoryResult.status !== 'unavailable') return directoryResult;

      const database = options.databaseFactory
        ? options.databaseFactory(config)
        : createSyncPrototypeDatabase(config);
      const identityPort = options.identityPortFactory
        ? options.identityPortFactory(database)
        : createRealSocialCloudIdentityPort(database);

      try {
        await database.open?.();
        await syncRuntimeDatabase(database);
        return await createRealSocialCloudUserLookupGateway(identityPort).lookupByHandle(validation.handle);
      } catch {
        return { status: 'unavailable' };
      } finally {
        database.close?.();
      }
    },
  };
}

export function createStaticExactSocialCloudLookupIdentityPort(
  profiles: readonly {
    readonly userId: EntityId;
    readonly handle: string;
    readonly displayName: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }[],
): ExactSocialCloudLookupIdentityPort {
  return {
    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };
      const profile = profiles.find((candidate) => candidate.handle === validation.handle);
      return profile ? { status: 'found', profile } : { status: 'notFound' };
    },
  };
}
