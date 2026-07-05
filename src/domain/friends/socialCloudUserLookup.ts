import type { EntityId } from '@/domain/models/common';
import {
  formatSocialHandle,
  validateSocialHandle,
  type PublicUserProfile,
  type SocialUserLookupResult,
} from '@/domain/friends/socialIdentity';

export const SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION = '0.28.0-f3' as const;

export const SOCIAL_CLOUD_USER_LOOKUP_RESULT_STATUSES = [
  'found',
  'notFound',
  'invalidHandle',
  'unavailable',
] as const;

export type SocialCloudUserLookupResultStatus =
  (typeof SOCIAL_CLOUD_USER_LOOKUP_RESULT_STATUSES)[number];

export const SOCIAL_CLOUD_USER_LOOKUP_FORBIDDEN_BEHAVIORS = [
  'globalUserDirectory',
  'publicSuggestions',
  'partialHandleSearch',
  'fuzzyMatching',
  'automaticFriendship',
  'automaticFriendRequest',
  'rawActivityExport',
] as const;

export type SocialCloudUserLookupForbiddenBehavior =
  (typeof SOCIAL_CLOUD_USER_LOOKUP_FORBIDDEN_BEHAVIORS)[number];

export interface ExactSocialCloudUserLookupReport {
  readonly status: SocialCloudUserLookupResultStatus;
  readonly handle: string;
  readonly displayHandle: string;
  readonly message: string;
  readonly profile?: PublicUserProfile;
  readonly isCurrentUser: boolean;
  readonly createsFriendship: false;
  readonly createsFriendRequest: false;
  readonly exposesSuggestions: false;
  readonly exposesDirectory: false;
}

function reportBase(
  status: SocialCloudUserLookupResultStatus,
  handle: string,
  message: string,
): Omit<ExactSocialCloudUserLookupReport, 'profile'> {
  return {
    status,
    handle,
    displayHandle: handle.length > 0 ? formatSocialHandle(handle) : '@',
    message,
    isCurrentUser: false,
    createsFriendship: false,
    createsFriendRequest: false,
    exposesSuggestions: false,
    exposesDirectory: false,
  };
}

export function normalizeExactSocialCloudUserLookupResult(
  rawHandle: string,
  result: SocialUserLookupResult,
  currentUserId?: EntityId,
): ExactSocialCloudUserLookupReport {
  const validation = validateSocialHandle(rawHandle);
  if (validation.status === 'invalid') {
    return {
      ...reportBase('invalidHandle', validation.handle, validation.message),
      displayHandle: validation.displayHandle,
    };
  }

  if (result.status === 'invalidHandle') {
    return reportBase(
      'invalidHandle',
      validation.handle,
      'Identifiant invalide : vérifie le format avant la recherche.',
    );
  }

  if (result.status === 'unavailable') {
    return reportBase(
      'unavailable',
      validation.handle,
      'Service cloud indisponible : recherche exacte réelle impossible pour le moment.',
    );
  }

  if (result.status === 'notFound') {
    return reportBase('notFound', validation.handle, 'Identifiant inexistant.');
  }

  if (result.profile.handle !== validation.handle) {
    return reportBase(
      'notFound',
      validation.handle,
      'Identifiant inexistant.',
    );
  }

  return {
    ...reportBase(
      'found',
      validation.handle,
      currentUserId === result.profile.userId
        ? 'Identifiant trouvé : il correspond à ton propre compte.'
        : `Identifiant trouvé : ${result.profile.displayName}.`,
    ),
    profile: result.profile,
    isCurrentUser: currentUserId === result.profile.userId,
  };
}

export function assertSocialCloudUserLookupContractIntegrity(): true {
  const statuses = new Set(SOCIAL_CLOUD_USER_LOOKUP_RESULT_STATUSES);
  for (const status of ['found', 'notFound', 'invalidHandle', 'unavailable'] as const) {
    if (!statuses.has(status)) {
      throw new Error(`La recherche exacte doit gérer le statut ${status}.`);
    }
  }

  for (const forbidden of [
    'globalUserDirectory',
    'publicSuggestions',
    'partialHandleSearch',
    'automaticFriendship',
    'rawActivityExport',
  ] as const) {
    if (!SOCIAL_CLOUD_USER_LOOKUP_FORBIDDEN_BEHAVIORS.includes(forbidden)) {
      throw new Error(`La recherche exacte doit interdire ${forbidden}.`);
    }
  }

  const found = normalizeExactSocialCloudUserLookupResult('@alex.run', {
    status: 'found',
    profile: {
      userId: 'social-user:alex' as EntityId,
      handle: 'alex.run',
      displayName: 'Alex Run',
      createdAt: '2026-07-05T00:00:00.000Z',
      updatedAt: '2026-07-05T00:00:00.000Z',
    },
  });

  if (found.createsFriendRequest || found.createsFriendship) {
    throw new Error('La recherche exacte ne doit pas créer de relation sociale.');
  }

  if (found.exposesDirectory || found.exposesSuggestions) {
    throw new Error('La recherche exacte ne doit pas ouvrir d’annuaire ni de suggestions.');
  }

  return true;
}
