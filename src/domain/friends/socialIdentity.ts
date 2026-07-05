import type { EntityId, IsoDateTime } from '@/domain/models/common';

export const SOCIAL_IDENTITY_STORAGE_KEY = 'friends-privacy-social-identity' as EntityId;

export const RESERVED_SOCIAL_HANDLES = [
  'admin',
  'support',
  'sportpilot',
  'root',
  'api',
  'system',
  'moderator',
  'null',
  'undefined',
  'me',
] as const;

export type ReservedSocialHandle = (typeof RESERVED_SOCIAL_HANDLES)[number];
export type SocialHandleValidationStatus = 'valid' | 'invalid';
export type SocialIdentityAvailabilityStatus =
  | 'idle'
  | 'available'
  | 'alreadyTaken'
  | 'invalidHandle'
  | 'unavailable'
  | 'notConnected';

export interface SocialIdentity {
  readonly userId: EntityId;
  readonly handle: string;
  readonly displayName: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly handleUpdatedAt?: IsoDateTime;
}

export interface StoredSocialIdentity extends SocialIdentity {
  readonly id: EntityId;
}

export interface PublicUserProfile {
  readonly userId: EntityId;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export type SocialUserLookupResult =
  | { readonly status: 'found'; readonly profile: PublicUserProfile }
  | { readonly status: 'notFound' }
  | { readonly status: 'invalidHandle' }
  | { readonly status: 'unavailable' };

export interface CloudFriendRequest {
  readonly id: string;
  readonly requesterUserId: string;
  readonly recipientUserId: string;
  readonly status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  readonly requestedAt: string;
  readonly respondedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CloudFriendship {
  readonly id: string;
  readonly userAId: string;
  readonly userBId: string;
  readonly status: 'active' | 'blocked' | 'removed';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SocialHandleValidationResult {
  readonly status: SocialHandleValidationStatus;
  readonly handle: string;
  readonly displayHandle: string;
  readonly message: string;
}

export interface SocialIdentityAvailabilityResult {
  readonly status: SocialIdentityAvailabilityStatus;
  readonly message: string;
  readonly profile?: PublicUserProfile;
}

function randomToken(): string {
  const cryptoUuid = globalThis.crypto?.randomUUID?.();
  const seed = cryptoUuid ?? Math.random().toString(36).slice(2);
  return seed.replace(/[^a-z0-9]/gu, '').toLowerCase().slice(0, 10) || 'localuser';
}

export function createSocialUserId(token: string = randomToken()): EntityId {
  return `social-user:${token.replace(/[^a-z0-9._-]/gu, '').toLowerCase()}` as EntityId;
}

export function stripSocialHandlePrefix(value: string): string {
  return value.trim().startsWith('@') ? value.trim().slice(1) : value.trim();
}

export function formatSocialHandle(handle: string): string {
  return `@${stripSocialHandlePrefix(handle)}`;
}

export function validateSocialHandle(value: string): SocialHandleValidationResult {
  const withoutPrefix = stripSocialHandlePrefix(value);
  const displayHandle = withoutPrefix.length > 0 ? formatSocialHandle(withoutPrefix) : '@';

  if (withoutPrefix.length < 3 || withoutPrefix.length > 24) {
    return {
      status: 'invalid',
      handle: withoutPrefix,
      displayHandle,
      message: 'Identifiant invalide : 3 à 24 caractères requis.',
    };
  }

  if (withoutPrefix !== withoutPrefix.toLowerCase()) {
    return {
      status: 'invalid',
      handle: withoutPrefix,
      displayHandle,
      message: 'Identifiant invalide : seules les minuscules sont autorisées.',
    };
  }

  if (!/^[a-z0-9._-]+$/u.test(withoutPrefix)) {
    return {
      status: 'invalid',
      handle: withoutPrefix,
      displayHandle,
      message: 'Identifiant invalide : lettres, chiffres, point, tiret et underscore uniquement.',
    };
  }

  if (RESERVED_SOCIAL_HANDLES.includes(withoutPrefix as ReservedSocialHandle)) {
    return {
      status: 'invalid',
      handle: withoutPrefix,
      displayHandle,
      message: 'Identifiant invalide : ce mot est réservé.',
    };
  }

  return {
    status: 'valid',
    handle: withoutPrefix,
    displayHandle,
    message: 'Identifiant valide.',
  };
}

export function createDefaultSocialIdentity(
  now: IsoDateTime = new Date().toISOString(),
  token: string = randomToken(),
): SocialIdentity {
  const sanitizedToken = token.replace(/[^a-z0-9]/gu, '').toLowerCase().slice(0, 10) || 'localuser';
  return {
    userId: createSocialUserId(sanitizedToken),
    handle: `sp-${sanitizedToken}`.slice(0, 24),
    displayName: 'SportPilot',
    createdAt: now,
    updatedAt: now,
    handleUpdatedAt: now,
  };
}

export function toStoredSocialIdentity(identity: SocialIdentity): StoredSocialIdentity {
  return {
    id: SOCIAL_IDENTITY_STORAGE_KEY,
    ...identity,
  };
}

export function updateSocialIdentity(
  current: SocialIdentity,
  changes: { readonly handle?: string; readonly displayName?: string },
  now: IsoDateTime = new Date().toISOString(),
): SocialIdentity {
  const validation = changes.handle === undefined
    ? validateSocialHandle(current.handle)
    : validateSocialHandle(changes.handle);

  if (validation.status === 'invalid') {
    throw new Error(validation.message);
  }

  const displayName = changes.displayName?.trim() || current.displayName.trim() || 'SportPilot';
  const handleChanged = validation.handle !== current.handle;

  const updated: SocialIdentity = {
    ...current,
    handle: validation.handle,
    displayName: displayName.slice(0, 80),
    updatedAt: now,
  };

  if (handleChanged) {
    return { ...updated, handleUpdatedAt: now };
  }

  return current.handleUpdatedAt
    ? { ...updated, handleUpdatedAt: current.handleUpdatedAt }
    : updated;
}

export function publicProfileFromIdentity(identity: SocialIdentity): PublicUserProfile {
  return {
    userId: identity.userId,
    handle: identity.handle,
    displayName: identity.displayName,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
  };
}

export function mapLookupResultToAvailability(
  result: SocialUserLookupResult,
): SocialIdentityAvailabilityResult {
  if (result.status === 'found') {
    return {
      status: 'alreadyTaken',
      message: `Identifiant déjà pris par ${result.profile.displayName}.`,
      profile: result.profile,
    };
  }

  if (result.status === 'notFound') {
    return {
      status: 'available',
      message: 'Identifiant disponible.',
    };
  }

  if (result.status === 'invalidHandle') {
    return {
      status: 'invalidHandle',
      message: 'Identifiant invalide : vérifie le format avant la recherche.',
    };
  }

  return {
    status: 'unavailable',
    message: 'Compte cloud indisponible : disponibilité réelle impossible pour le moment.',
  };
}
