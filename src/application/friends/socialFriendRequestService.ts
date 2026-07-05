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
import type { SocialCloudFriendRequestPort } from '@/domain/friends/socialCloudContract';
import { buildCloudFriendRequest } from '@/domain/friends/socialCloudFriendRequest';

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
  readonly cloudFriendRequestPort?: SocialCloudFriendRequestPort;
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

  const now = input.now ?? new Date().toISOString();
  if (input.cloudFriendRequestPort) {
    const cloudRequest = buildCloudFriendRequest(input.identity, lookup.profile, now);
    const cloudResult = await input.cloudFriendRequestPort.sendRequest(cloudRequest);

    if (cloudResult.status === 'alreadyExists') {
      return {
        status: 'alreadySent',
        snapshot: input.snapshot,
        message: cloudResult.message,
        profile: lookup.profile,
      };
    }

    if (!['created', 'alreadyExists', 'updated'].includes(cloudResult.status)) {
      return {
        status: cloudResult.status === 'forbidden' ? 'self' : 'unavailable',
        snapshot: input.snapshot,
        message: cloudResult.message,
        profile: lookup.profile,
      };
    }
  }

  const nextSnapshot = addOutgoingFriendRequestForProfile(
    input.snapshot,
    lookup.profile,
    input.identity.userId,
    now,
  );

  return {
    status: 'sent',
    snapshot: nextSnapshot,
    message: `Demande envoyée à ${formatSocialHandle(lookup.profile.handle)}. Elle devra être acceptée avant tout accès ami.`,
    profile: lookup.profile,
  };
}
