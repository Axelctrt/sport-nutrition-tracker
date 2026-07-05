import {
  addOutgoingFriendRequestForProfile,
  evaluateFriendRequestEligibility,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import {
  formatSocialHandle,
  validateSocialHandle,
  type PublicUserProfile,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';
import type { SocialUserLookupGateway } from '@/application/friends/socialIdentityService';

export type ExactFriendRequestStatus =
  | 'sent'
  | 'invalidHandle'
  | 'notFound'
  | 'self'
  | 'alreadyFriend'
  | 'alreadySent'
  | 'alreadyReceived'
  | 'unavailable';

export interface SendExactFriendRequestInput {
  readonly snapshot: FriendsPrivacySnapshot;
  readonly identity: SocialIdentity;
  readonly handle: string;
  readonly lookupGateway: SocialUserLookupGateway;
  readonly now?: string;
}

export interface SendExactFriendRequestResult {
  readonly status: ExactFriendRequestStatus;
  readonly snapshot: FriendsPrivacySnapshot;
  readonly message: string;
  readonly profile?: PublicUserProfile;
}

export async function sendExactFriendRequest(
  input: SendExactFriendRequestInput,
): Promise<SendExactFriendRequestResult> {
  const validation = validateSocialHandle(input.handle);
  if (validation.status === 'invalid') {
    return {
      status: 'invalidHandle',
      snapshot: input.snapshot,
      message: validation.message,
    };
  }

  const lookup = await input.lookupGateway.lookupByHandle(validation.handle);

  if (lookup.status === 'invalidHandle') {
    return {
      status: 'invalidHandle',
      snapshot: input.snapshot,
      message: 'Identifiant invalide : vérifie le format avant la recherche.',
    };
  }

  if (lookup.status === 'notFound') {
    return {
      status: 'notFound',
      snapshot: input.snapshot,
      message: 'Identifiant inexistant.',
    };
  }

  if (lookup.status === 'unavailable') {
    return {
      status: 'unavailable',
      snapshot: input.snapshot,
      message: 'Service cloud indisponible : recherche réelle impossible pour le moment.',
    };
  }

  const eligibility = evaluateFriendRequestEligibility(input.snapshot, input.identity, lookup.profile);
  if (eligibility.status !== 'allowed') {
    return {
      status: eligibility.status,
      snapshot: input.snapshot,
      message: eligibility.message,
      profile: lookup.profile,
    };
  }

  const nextSnapshot = addOutgoingFriendRequestForProfile(
    input.snapshot,
    lookup.profile,
    input.identity.userId,
    input.now,
  );

  return {
    status: 'sent',
    snapshot: nextSnapshot,
    message: `Demande envoyée à ${formatSocialHandle(lookup.profile.handle)}. Elle devra être acceptée avant tout accès ami.`,
    profile: lookup.profile,
  };
}
