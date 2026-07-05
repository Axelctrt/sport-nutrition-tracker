import {
  createDefaultSocialIdentity,
  mapLookupResultToAvailability,
  publicProfileFromIdentity,
  updateSocialIdentity,
  validateSocialHandle,
  type PublicUserProfile,
  type SocialIdentity,
  type SocialIdentityAvailabilityResult,
  type SocialUserLookupResult,
} from '@/domain/friends/socialIdentity';

export interface SocialIdentityRepository {
  readonly readIdentity: () => Promise<SocialIdentity>;
  readonly saveIdentity: (identity: SocialIdentity) => Promise<void>;
}

export interface SocialUserLookupGateway {
  readonly lookupByHandle: (handle: string) => Promise<SocialUserLookupResult>;
}

export interface SocialIdentitySaveInput {
  readonly handle: string;
  readonly displayName: string;
}

export interface SocialIdentitySaveResult {
  readonly status: 'saved' | 'invalidHandle' | 'notConnected';
  readonly identity: SocialIdentity;
  readonly message: string;
}

export const unavailableSocialUserLookupGateway: SocialUserLookupGateway = {
  async lookupByHandle(handle) {
    const validation = validateSocialHandle(handle);
    if (validation.status === 'invalid') return { status: 'invalidHandle' };
    return { status: 'unavailable' };
  },
};

export function createFoundSocialUserLookupGateway(
  profiles: readonly PublicUserProfile[],
): SocialUserLookupGateway {
  return {
    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };

      const profile = profiles.find((candidate) => candidate.handle === validation.handle);
      return profile ? { status: 'found', profile } : { status: 'notFound' };
    },
  };
}

export async function loadSocialIdentity(
  repository?: SocialIdentityRepository,
): Promise<SocialIdentity> {
  return repository?.readIdentity() ?? createDefaultSocialIdentity();
}

export async function saveSocialIdentity(
  repository: SocialIdentityRepository | undefined,
  current: SocialIdentity,
  input: SocialIdentitySaveInput,
): Promise<SocialIdentitySaveResult> {
  const validation = validateSocialHandle(input.handle);
  if (validation.status === 'invalid') {
    return {
      status: 'invalidHandle',
      identity: current,
      message: validation.message,
    };
  }

  const next = updateSocialIdentity(current, {
    handle: validation.handle,
    displayName: input.displayName,
  });

  await repository?.saveIdentity(next);

  return {
    status: 'saved',
    identity: next,
    message: 'Sauvegarde locale OK. La disponibilité réelle dépendra du backend social.',
  };
}

export async function checkSocialHandleAvailability(
  gateway: SocialUserLookupGateway,
  handle: string,
): Promise<SocialIdentityAvailabilityResult> {
  const validation = validateSocialHandle(handle);
  if (validation.status === 'invalid') {
    return {
      status: 'invalidHandle',
      message: validation.message,
    };
  }

  const result = await gateway.lookupByHandle(validation.handle);
  return mapLookupResultToAvailability(result);
}

export function exposePublicProfile(identity: SocialIdentity): PublicUserProfile {
  return publicProfileFromIdentity(identity);
}
