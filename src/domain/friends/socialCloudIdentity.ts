import type { EntityId, IsoDateTime } from '@/domain/models/common';
import {
  publicProfileFromIdentity,
  validateSocialHandle,
  type PublicUserProfile,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';

export const SOCIAL_CLOUD_IDENTITY_CONTRACT_VERSION = '0.28.0-f2' as const;

export type SocialCloudIdentityProvisionStatus =
  | 'created'
  | 'updated'
  | 'alreadyExists'
  | 'conflict'
  | 'invalidHandle'
  | 'unavailable';

export interface SocialHandleReservation {
  readonly id: EntityId;
  readonly handle: string;
  readonly ownerUserId: EntityId;
  readonly ownerDisplayName: string;
  readonly reservedAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface SocialCloudIdentityRecord {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly handle: string;
  readonly displayName: string;
  readonly publicProfile: PublicUserProfile;
  readonly handleReservationId: EntityId;
  readonly handleReservedAt: IsoDateTime;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface SocialCloudIdentityAvailability {
  readonly status: 'available' | 'ownedByCurrentUser' | 'alreadyTaken' | 'invalidHandle';
  readonly handle: string;
  readonly displayHandle: string;
  readonly message: string;
  readonly ownerUserId?: EntityId;
}

function sanitizeCloudRecordToken(value: string): string {
  return value.replace(/[^a-z0-9._:-]/gu, '').toLowerCase();
}

export function createSocialHandleReservationId(handle: string): EntityId {
  const validation = validateSocialHandle(handle);
  if (validation.status === 'invalid') {
    throw new Error(validation.message);
  }

  return `social-handle:${validation.handle}` as EntityId;
}

export function createSocialCloudIdentityRecordId(userId: EntityId): EntityId {
  return `social-identity:${sanitizeCloudRecordToken(userId)}` as EntityId;
}

export function buildSocialHandleReservation(
  identity: SocialIdentity,
  now: IsoDateTime = new Date().toISOString(),
): SocialHandleReservation {
  const validation = validateSocialHandle(identity.handle);
  if (validation.status === 'invalid') {
    throw new Error(validation.message);
  }

  return {
    id: createSocialHandleReservationId(validation.handle),
    handle: validation.handle,
    ownerUserId: identity.userId,
    ownerDisplayName: identity.displayName.trim() || 'SportPilot',
    reservedAt: identity.handleUpdatedAt ?? now,
    updatedAt: now,
  };
}

export function buildSocialCloudIdentityRecord(
  identity: SocialIdentity,
  now: IsoDateTime = new Date().toISOString(),
): SocialCloudIdentityRecord {
  const reservation = buildSocialHandleReservation(identity, now);
  const normalizedIdentity: SocialIdentity = {
    ...identity,
    handle: reservation.handle,
    displayName: reservation.ownerDisplayName,
    updatedAt: now,
    handleUpdatedAt: reservation.reservedAt,
  };

  return {
    id: createSocialCloudIdentityRecordId(identity.userId),
    userId: identity.userId,
    handle: reservation.handle,
    displayName: reservation.ownerDisplayName,
    publicProfile: publicProfileFromIdentity(normalizedIdentity),
    handleReservationId: reservation.id,
    handleReservedAt: reservation.reservedAt,
    createdAt: identity.createdAt,
    updatedAt: now,
  };
}

export function identityFromSocialCloudRecord(record: SocialCloudIdentityRecord): SocialIdentity {
  return {
    userId: record.userId,
    handle: record.handle,
    displayName: record.displayName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    handleUpdatedAt: record.handleReservedAt,
  };
}

export function publicProfileFromSocialReservation(
  reservation: SocialHandleReservation,
  identity?: SocialCloudIdentityRecord,
): PublicUserProfile {
  if (identity) return identity.publicProfile;

  return {
    userId: reservation.ownerUserId,
    handle: reservation.handle,
    displayName: reservation.ownerDisplayName,
    createdAt: reservation.reservedAt,
    updatedAt: reservation.updatedAt,
  };
}

export function evaluateSocialHandleReservationAvailability(
  handle: string,
  currentUserId: EntityId,
  reservation?: SocialHandleReservation,
): SocialCloudIdentityAvailability {
  const validation = validateSocialHandle(handle);
  if (validation.status === 'invalid') {
    return {
      status: 'invalidHandle',
      handle: validation.handle,
      displayHandle: validation.displayHandle,
      message: validation.message,
    };
  }

  if (!reservation) {
    return {
      status: 'available',
      handle: validation.handle,
      displayHandle: validation.displayHandle,
      message: 'Identifiant cloud disponible.',
    };
  }

  if (reservation.ownerUserId === currentUserId) {
    return {
      status: 'ownedByCurrentUser',
      handle: validation.handle,
      displayHandle: validation.displayHandle,
      ownerUserId: reservation.ownerUserId,
      message: 'Identifiant déjà réservé par ce compte SportPilot.',
    };
  }

  return {
    status: 'alreadyTaken',
    handle: validation.handle,
    displayHandle: validation.displayHandle,
    ownerUserId: reservation.ownerUserId,
    message: 'Identifiant déjà réservé par un autre compte SportPilot.',
  };
}

export function assertSocialCloudIdentityContractIntegrity(): true {
  const sample = buildSocialHandleReservation({
    userId: 'social-user:sample' as EntityId,
    handle: 'sample.run',
    displayName: 'Sample Run',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    handleUpdatedAt: '2026-07-05T00:00:00.000Z',
  });

  if (sample.id !== 'social-handle:sample.run') {
    throw new Error('La réservation cloud doit être indexée par handle exact.');
  }

  if (sample.ownerUserId !== 'social-user:sample') {
    throw new Error('La réservation cloud doit conserver le userId propriétaire stable.');
  }

  return true;
}
