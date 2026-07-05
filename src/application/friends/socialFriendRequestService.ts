import {
  addOutgoingFriendRequestForProfile,
  evaluateFriendRequestEligibility,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import {
  formatSocialHandle,
  type PublicUserProfile,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';
import type { SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { lookupExactSocialCloudUser } from '@/application/friends/socialCloudUserLookupService';

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
  const lookup = await lookupExactSocialCloudUser({
    handle: input.handle,
    lookupGateway: input.lookupGateway,
    currentUserId: input.identity.userId,
  });

  if (lookup.status === 'invalidHandle') {
    return {
      status: 'invalidHandle',
      snapshot: input.snapshot,
      message: lookup.message,
    };
  }

  if (lookup.status === 'notFound') {
    return {
      status: 'notFound',
      snapshot: input.snapshot,
      message: lookup.message,
    };
  }

  if (lookup.status === 'unavailable' || !lookup.profile) {
    return {
      status: 'unavailable',
      snapshot: input.snapshot,
      message: lookup.message,
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
