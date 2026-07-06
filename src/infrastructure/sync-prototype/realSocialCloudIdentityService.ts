import type { Table } from 'dexie';
import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type {
  SocialCloudIdentityPort,
  SocialCloudMutationResult,
} from '@/domain/friends/socialCloudContract';
import type { SocialIdentity, SocialUserLookupResult } from '@/domain/friends/socialIdentity';
import {
  buildSocialCloudIdentityRecord,
  buildSocialHandleReservation,
  createSocialCloudIdentityRecordId,
  createSocialHandleReservationId,
  identityFromSocialCloudRecord,
  publicProfileFromSocialReservation,
  type SocialCloudIdentityRecord,
  type SocialHandleReservation,
} from '@/domain/friends/socialCloudIdentity';
import { validateSocialHandle } from '@/domain/friends/socialIdentity';
import {
  createSyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  readSyncPrototypeConfigSafely,
  type EnabledSyncPrototypeConfig,
  type SafeSyncPrototypeConfigResult,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createSocialDirectoryClient,
  type SocialDirectoryClient,
} from '@/infrastructure/sync-prototype/socialDirectoryGateway';

export interface SocialCloudIdentityDatabase {
  readonly socialIdentities: Table<SocialCloudIdentityRecord, EntityId>;
  readonly socialHandleReservations: Table<SocialHandleReservation, EntityId>;
}

export interface ClosableSocialCloudIdentityDatabase extends SocialCloudIdentityDatabase {
  readonly open?: () => Promise<unknown>;
  readonly close?: () => void;
  readonly cloud?: {
    readonly sync?: () => Promise<unknown>;
  };
}

export interface RuntimeSocialCloudIdentityPortOptions {
  readonly configResult?: SafeSyncPrototypeConfigResult;
  readonly databaseFactory?: (config: EnabledSyncPrototypeConfig) => ClosableSocialCloudIdentityDatabase;
  readonly identityPortFactory?: (database: SocialCloudIdentityDatabase) => SocialCloudIdentityPort;
  readonly socialDirectoryClient?: SocialDirectoryClient;
}

export interface SocialCloudIdentityClock {
  readonly now: () => IsoDateTime;
}

function defaultNow(): IsoDateTime {
  return new Date().toISOString();
}

async function cleanupPreviousHandleReservations(
  database: SocialCloudIdentityDatabase,
  identity: SocialIdentity,
  nextReservationId: EntityId,
): Promise<void> {
  const previousReservations = await database.socialHandleReservations
    .where('ownerUserId')
    .equals(identity.userId)
    .toArray();
  const obsoleteIds = previousReservations
    .filter((reservation) => reservation.id !== nextReservationId)
    .map((reservation) => reservation.id);

  if (obsoleteIds.length > 0) {
    await database.socialHandleReservations.bulkDelete(obsoleteIds);
  }
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Réservation cloud sociale impossible.';
}

function unavailableMessage(): string {
  return 'Backend social cloud indisponible : identité sociale cloud impossible pour le moment.';
}

function unavailableMutation<T>(message = unavailableMessage()): SocialCloudMutationResult<T> {
  return {
    status: 'unavailable',
    message,
  };
}

export const unavailableSocialCloudIdentityPort: SocialCloudIdentityPort = {
  async readCurrentIdentity() {
    return undefined;
  },
  async lookupByHandle(handle) {
    const validation = validateSocialHandle(handle);
    if (validation.status === 'invalid') return { status: 'invalidHandle' };
    return { status: 'unavailable' };
  },
  async reserveHandle() {
    return unavailableMutation();
  },
  async publishIdentity() {
    return unavailableMutation();
  },
};

function canUseRuntime(
  configResult: SafeSyncPrototypeConfigResult,
): configResult is SafeSyncPrototypeConfigResult & { readonly config: EnabledSyncPrototypeConfig } {
  return !configResult.errorMessage
    && configResult.config.enabled
    && configResult.config.realSocialCloudEnabled;
}

function createRuntimeDatabase(
  options: RuntimeSocialCloudIdentityPortOptions,
  config: EnabledSyncPrototypeConfig,
): ClosableSocialCloudIdentityDatabase {
  return options.databaseFactory ? options.databaseFactory(config) : createSyncPrototypeDatabase(config);
}

async function syncRuntimeDatabase(database: ClosableSocialCloudIdentityDatabase): Promise<void> {
  await database.cloud?.sync?.();
}

function shouldSyncAfterMutation(status: SocialCloudMutationResult<unknown>['status']): boolean {
  return ['created', 'updated', 'alreadyExists'].includes(status);
}

async function reserveSocialDirectoryHandle(
  client: SocialDirectoryClient,
  identity: SocialIdentity,
): Promise<SocialCloudMutationResult<SocialIdentity> | undefined> {
  const result = await client.reserveIdentity(identity);
  if (result.status === 'unavailable') return undefined;
  if (!shouldSyncAfterMutation(result.status)) return result;
  return undefined;
}

export function createRealSocialCloudIdentityPort(
  database: SocialCloudIdentityDatabase,
  clock: SocialCloudIdentityClock = { now: defaultNow },
): SocialCloudIdentityPort {
  const identityPort: SocialCloudIdentityPort = {
    async readCurrentIdentity(userId) {
      const record = await database.socialIdentities.get(
        createSocialCloudIdentityRecordId(userId),
      );
      return record ? identityFromSocialCloudRecord(record) : undefined;
    },

    async lookupByHandle(handle): Promise<SocialUserLookupResult> {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };

      const reservation = await database.socialHandleReservations.get(
        createSocialHandleReservationId(validation.handle),
      );
      if (!reservation) return { status: 'notFound' };

      const identity = await database.socialIdentities.get(
        createSocialCloudIdentityRecordId(reservation.ownerUserId),
      );

      return {
        status: 'found',
        profile: publicProfileFromSocialReservation(reservation, identity),
      };
    },

    async reserveHandle(identity): Promise<SocialCloudMutationResult<SocialIdentity>> {
      const validation = validateSocialHandle(identity.handle);
      if (validation.status === 'invalid') {
        return {
          status: 'invalidHandle',
          message: validation.message,
        };
      }

      try {
        const now = clock.now();
        const reservation = buildSocialHandleReservation(identity, now);
        const existing = await database.socialHandleReservations.get(reservation.id);

        if (existing && existing.ownerUserId !== identity.userId) {
          return {
            status: 'conflict',
            message: 'Identifiant déjà réservé par un autre compte SportPilot.',
          };
        }

        await cleanupPreviousHandleReservations(database, identity, reservation.id);
        await database.socialHandleReservations.put(reservation);

        return {
          status: existing ? 'alreadyExists' : 'created',
          value: identity,
          message: existing
            ? 'Identifiant déjà réservé par ce compte SportPilot.'
            : 'Identifiant cloud réservé pour ce compte SportPilot.',
        };
      } catch (error) {
        return {
          status: 'unavailable',
          message: mutationErrorMessage(error),
        };
      }
    },

    async publishIdentity(identity): Promise<SocialCloudMutationResult<SocialIdentity>> {
      const reservation = await identityPort.reserveHandle(identity);
      if (!['created', 'alreadyExists', 'updated'].includes(reservation.status)) {
        return reservation;
      }

      try {
        const now = clock.now();
        const record = buildSocialCloudIdentityRecord(identity, now);
        const previous = await database.socialIdentities.get(record.id);
        await database.socialIdentities.put(record);

        return {
          status: previous ? 'updated' : 'created',
          value: identityFromSocialCloudRecord(record),
          message: previous
            ? 'Identité sociale cloud mise à jour.'
            : 'Identité sociale cloud créée.',
        };
      } catch (error) {
        return {
          status: 'unavailable',
          message: mutationErrorMessage(error),
        };
      }
    },
  };

  return identityPort;
}

export function createRuntimeSocialCloudIdentityPort(
  options: RuntimeSocialCloudIdentityPortOptions = {},
): SocialCloudIdentityPort {
  const socialDirectoryClient = options.socialDirectoryClient ?? createSocialDirectoryClient();
  const createPort = () => {
    const configResult = options.configResult ?? readSyncPrototypeConfigSafely();
    if (!canUseRuntime(configResult)) {
      return undefined;
    }

    const database = createRuntimeDatabase(options, configResult.config);
    const port = options.identityPortFactory
      ? options.identityPortFactory(database)
      : createRealSocialCloudIdentityPort(database);

    return { database, port };
  };

  return {
    async readCurrentIdentity(userId) {
      const runtime = createPort();
      if (!runtime) return unavailableSocialCloudIdentityPort.readCurrentIdentity(userId);

      try {
        await runtime.database.open?.();
        await syncRuntimeDatabase(runtime.database);
        return await runtime.port.readCurrentIdentity(userId);
      } catch {
        return undefined;
      } finally {
        runtime.database.close?.();
      }
    },

    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };

      const runtime = createPort();
      if (!runtime) return unavailableSocialCloudIdentityPort.lookupByHandle(validation.handle);

      try {
        await runtime.database.open?.();
        await syncRuntimeDatabase(runtime.database);
        return await runtime.port.lookupByHandle(validation.handle);
      } catch {
        return { status: 'unavailable' };
      } finally {
        runtime.database.close?.();
      }
    },

    async reserveHandle(identity) {
      const runtime = createPort();
      if (!runtime) return unavailableSocialCloudIdentityPort.reserveHandle(identity);

      try {
        await runtime.database.open?.();
        await syncRuntimeDatabase(runtime.database);
        const result = await runtime.port.reserveHandle(identity);
        if (shouldSyncAfterMutation(result.status)) {
          await syncRuntimeDatabase(runtime.database);
        }
        return result;
      } catch (error) {
        return unavailableMutation(mutationErrorMessage(error));
      } finally {
        runtime.database.close?.();
      }
    },

    async publishIdentity(identity) {
      const runtime = createPort();
      if (!runtime) return unavailableSocialCloudIdentityPort.publishIdentity(identity);

      try {
        await runtime.database.open?.();
        await syncRuntimeDatabase(runtime.database);
        const directoryResult = await reserveSocialDirectoryHandle(socialDirectoryClient, identity);
        if (directoryResult) return directoryResult;
        const result = await runtime.port.publishIdentity(identity);
        if (shouldSyncAfterMutation(result.status)) {
          await syncRuntimeDatabase(runtime.database);
        }
        return result;
      } catch (error) {
        return unavailableMutation(mutationErrorMessage(error));
      } finally {
        runtime.database.close?.();
      }
    },
  };
}
