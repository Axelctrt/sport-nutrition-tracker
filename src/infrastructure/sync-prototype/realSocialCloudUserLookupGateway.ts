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

export type ExactSocialCloudLookupIdentityPort = Pick<SocialCloudIdentityPort, 'lookupByHandle'>;

export interface ClosableSocialCloudIdentityDatabase extends SocialCloudIdentityDatabase {
  readonly open?: () => Promise<unknown>;
  readonly close?: () => void;
}

export interface RuntimeSocialCloudUserLookupGatewayOptions {
  readonly configResult?: SafeSyncPrototypeConfigResult;
  readonly databaseFactory?: (config: EnabledSyncPrototypeConfig) => ClosableSocialCloudIdentityDatabase;
  readonly identityPortFactory?: (database: SocialCloudIdentityDatabase) => ExactSocialCloudLookupIdentityPort;
}

function unavailableResult(handle: string): SocialUserLookupResult {
  const validation = validateSocialHandle(handle);
  if (validation.status === 'invalid') return { status: 'invalidHandle' };
  return { status: 'unavailable' };
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

      const database = options.databaseFactory
        ? options.databaseFactory(config)
        : createSyncPrototypeDatabase(config);
      const identityPort = options.identityPortFactory
        ? options.identityPortFactory(database)
        : createRealSocialCloudIdentityPort(database);

      try {
        await database.open?.();
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
