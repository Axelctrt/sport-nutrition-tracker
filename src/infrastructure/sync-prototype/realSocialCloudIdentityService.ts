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

export interface SocialCloudIdentityDatabase {
  readonly socialIdentities: Table<SocialCloudIdentityRecord, EntityId>;
  readonly socialHandleReservations: Table<SocialHandleReservation, EntityId>;
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
