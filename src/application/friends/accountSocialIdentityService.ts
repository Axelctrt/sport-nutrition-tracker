import type { SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import {
  createAccountSocialIdentityCandidate,
  isAccountSocialIdentityComplete,
  validateSocialHandle,
  type SocialIdentity,
  type SocialIdentityAvailabilityResult,
} from '@/domain/friends/socialIdentity';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';

export interface AccountSocialIdentityProvisionInput {
  readonly accountUserId: string;
  readonly currentIdentity: SocialIdentity;
  readonly handle: string;
  readonly displayName?: string;
  readonly repository: SocialIdentityRepository;
  readonly cloudPort: Pick<SocialCloudIdentityPort, 'publishIdentity'>;
  readonly now?: string;
}

export type AccountSocialIdentityProvisionResult =
  | {
      readonly status: 'saved';
      readonly identity: SocialIdentity;
      readonly message: string;
    }
  | {
      readonly status: 'invalidHandle' | 'conflict' | 'unavailable';
      readonly identity: SocialIdentity;
      readonly message: string;
    };

export async function checkAccountSocialHandleAvailability(
  cloudPort: Pick<SocialCloudIdentityPort, 'lookupByHandle'>,
  handle: string,
  accountUserId: string,
): Promise<SocialIdentityAvailabilityResult> {
  const validation = validateSocialHandle(handle);
  if (validation.status === 'invalid') {
    return {
      status: 'invalidHandle',
      message: validation.message,
    };
  }

  const result = await cloudPort.lookupByHandle(validation.handle);
  if (result.status === 'found') {
    if (result.profile.userId === accountUserId.trim()) {
      return {
        status: 'available',
        message: 'Identifiant déjà réservé par ce compte SportPilot.',
        profile: result.profile,
      };
    }

    return {
      status: 'alreadyTaken',
      message: 'Identifiant déjà réservé par un autre compte SportPilot.',
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
    message: 'Vérification indisponible. La réservation finale restera atomique.',
  };
}

export async function provisionAccountSocialIdentity(
  input: AccountSocialIdentityProvisionInput,
): Promise<AccountSocialIdentityProvisionResult> {
  const validation = validateSocialHandle(input.handle);
  if (validation.status === 'invalid') {
    return {
      status: 'invalidHandle',
      identity: input.currentIdentity,
      message: validation.message,
    };
  }

  let candidate: SocialIdentity;
  try {
    candidate = createAccountSocialIdentityCandidate(
      input.currentIdentity,
      input.accountUserId,
      {
        handle: validation.handle,
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      },
      input.now,
    );
  } catch (error) {
    return {
      status: 'invalidHandle',
      identity: input.currentIdentity,
      message: error instanceof Error ? error.message : 'Identité sociale invalide.',
    };
  }

  const cloudResult = await input.cloudPort.publishIdentity(candidate);
  if (!['created', 'updated', 'alreadyExists'].includes(cloudResult.status)) {
    return {
      status: cloudResult.status === 'conflict'
        ? 'conflict'
        : cloudResult.status === 'invalidHandle'
          ? 'invalidHandle'
          : 'unavailable',
      identity: input.currentIdentity,
      message: cloudResult.message,
    };
  }

  const publishedIdentity = cloudResult.value ?? candidate;
  if (!isAccountSocialIdentityComplete(publishedIdentity, input.accountUserId)) {
    return {
      status: 'unavailable',
      identity: input.currentIdentity,
      message: 'Le serveur social n’a pas confirmé une identité valide pour ce compte.',
    };
  }

  await input.repository.saveIdentity(publishedIdentity);

  return {
    status: 'saved',
    identity: publishedIdentity,
    message: cloudResult.message,
  };
}
