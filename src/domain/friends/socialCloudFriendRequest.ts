import type { EntityId, IsoDateTime } from '@/domain/models/common';
import {
  createCloudFriendRequestId,
  ensureFriendActivityPermissions,
  normalizeFriendHandle,
  type FriendProfileSummary,
  type FriendRequest,
  type FriendRequestStatus,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import {
  formatSocialHandle,
  type CloudFriendRequest,
  type PublicUserProfile,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';

export const SOCIAL_CLOUD_FRIEND_REQUEST_CONTRACT_VERSION = '0.28.0-f4' as const;

export const SOCIAL_CLOUD_FRIEND_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'cancelled',
] as const satisfies readonly FriendRequestStatus[];

export const SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS = [
  'handleBasedRelationship',
  'automaticFriendship',
  'publicSuggestions',
  'globalUserDirectory',
  'rawActivityExport',
  'likes',
  'comments',
  'messaging',
  'groups',
  'leaderboards',
] as const;

export type SocialCloudFriendRequestForbiddenBehavior =
  (typeof SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS)[number];

export type SocialCloudFriendRequestDirection = 'incoming' | 'outgoing';

export interface SocialCloudFriendRequestReport {
  readonly request: CloudFriendRequest;
  readonly direction: SocialCloudFriendRequestDirection;
  readonly counterpartUserId: EntityId;
  readonly status: CloudFriendRequest['status'];
  readonly createsFriendship: false;
  readonly exposesRawActivity: false;
  readonly relationshipKey: 'userId';
}

export interface SocialCloudFriendRequestListItem extends SocialCloudFriendRequestReport {
  readonly localRequest: FriendRequest;
}

export function buildCloudFriendRequest(
  identity: SocialIdentity,
  recipient: PublicUserProfile,
  now: IsoDateTime = new Date().toISOString(),
): CloudFriendRequest {
  if (identity.userId === recipient.userId) {
    throw new Error('Impossible de créer une demande cloud vers soi-même.');
  }

  return {
    id: createCloudFriendRequestId(identity.userId, recipient.userId as EntityId),
    requesterUserId: identity.userId,
    recipientUserId: recipient.userId,
    status: 'pending',
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCloudFriendRequestForUser(
  request: CloudFriendRequest,
  currentUserId: EntityId,
): SocialCloudFriendRequestReport | undefined {
  if (request.requesterUserId !== currentUserId && request.recipientUserId !== currentUserId) {
    return undefined;
  }

  const direction: SocialCloudFriendRequestDirection =
    request.recipientUserId === currentUserId ? 'incoming' : 'outgoing';
  const counterpartUserId = direction === 'incoming'
    ? request.requesterUserId as EntityId
    : request.recipientUserId as EntityId;

  return {
    request,
    direction,
    counterpartUserId,
    status: request.status,
    createsFriendship: false,
    exposesRawActivity: false,
    relationshipKey: 'userId',
  };
}

export function cloudFriendRequestToLocalRequest(
  report: SocialCloudFriendRequestReport,
  counterpartProfile?: PublicUserProfile,
): FriendRequest {
  const fallbackHandle = report.counterpartUserId.replace(/^social-user:/u, 'user');
  const handle = normalizeFriendHandle(counterpartProfile?.handle ?? fallbackHandle);
  const displayName = counterpartProfile?.displayName ?? formatSocialHandle(handle);

  return {
    id: report.request.id as EntityId,
    requesterUserId: report.request.requesterUserId as EntityId,
    recipientUserId: report.request.recipientUserId as EntityId,
    displayName,
    handle,
    direction: report.direction,
    status: report.request.status,
    requestedAt: report.request.requestedAt,
  };
}


function initialsFromName(value: string): string {
  const words = value.replace(/^@/u, '').split(/\s+|[._-]+/u).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.at(0)?.toUpperCase()).join('');
  return initials || 'SP';
}

function friendKey(friend: Pick<FriendProfileSummary, 'id' | 'userId' | 'handle'>): string {
  return friend.userId ?? friend.id ?? normalizeFriendHandle(friend.handle);
}

function friendSummaryFromAcceptedRequest(request: FriendRequest): FriendProfileSummary | undefined {
  if (request.status !== 'accepted') return undefined;

  const friendUserId = request.direction === 'incoming'
    ? request.requesterUserId
    : request.recipientUserId;
  const handle = normalizeFriendHandle(request.handle);

  return {
    id: friendUserId ?? (`friend:${handle}` as EntityId),
    ...(friendUserId ? { userId: friendUserId } : {}),
    displayName: request.displayName,
    handle,
    initials: initialsFromName(request.displayName || handle),
    connectedSince: request.requestedAt,
  };
}

function mergeRequestPreservingKnownProfile(
  current: FriendRequest | undefined,
  incoming: FriendRequest,
): FriendRequest {
  if (!current) return incoming;

  return {
    ...incoming,
    displayName: current.displayName || incoming.displayName,
    handle: normalizeFriendHandle(current.handle || incoming.handle),
  };
}

export function mergeCloudFriendRequestsIntoSnapshot(
  snapshot: FriendsPrivacySnapshot,
  localRequests: readonly FriendRequest[],
): FriendsPrivacySnapshot {
  const byId = new Map<EntityId, FriendRequest>();
  for (const request of snapshot.requests) byId.set(request.id, request);
  for (const request of localRequests) {
    byId.set(request.id, mergeRequestPreservingKnownProfile(byId.get(request.id), request));
  }

  const mergedRequests = [...byId.values()].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const nextFriends = [...snapshot.friends];
  const knownFriends = new Set(nextFriends.map(friendKey));

  for (const request of mergedRequests) {
    const friend = friendSummaryFromAcceptedRequest(request);
    if (!friend) continue;

    const key = friendKey(friend);
    if (knownFriends.has(key)) continue;

    knownFriends.add(key);
    nextFriends.push(friend);
  }

  return ensureFriendActivityPermissions({
    ...snapshot,
    friends: nextFriends,
    requests: mergedRequests,
  });
}

export function synchronizeCloudFriendRequestsIntoSnapshot(
  snapshot: FriendsPrivacySnapshot,
  localRequests: readonly FriendRequest[],
): FriendsPrivacySnapshot {
  const synchronizedRequests = [...new Map(
    localRequests
      .filter((request) => request.status === 'pending')
      .map((request) => [request.id, request] as const),
  ).values()].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return {
    ...snapshot,
    requests: synchronizedRequests,
  };
}

export function assertSocialCloudFriendRequestContractIntegrity(): true {
  const statuses = new Set(SOCIAL_CLOUD_FRIEND_REQUEST_STATUSES);
  for (const status of ['pending', 'accepted', 'declined', 'cancelled'] as const) {
    if (!statuses.has(status)) {
      throw new Error(`Les demandes cloud doivent gérer le statut ${status}.`);
    }
  }

  for (const forbidden of [
    'handleBasedRelationship',
    'automaticFriendship',
    'globalUserDirectory',
    'rawActivityExport',
    'messaging',
  ] as const) {
    if (!SOCIAL_CLOUD_FRIEND_REQUEST_FORBIDDEN_BEHAVIORS.includes(forbidden)) {
      throw new Error(`Les demandes cloud doivent interdire ${forbidden}.`);
    }
  }

  const request = buildCloudFriendRequest(
    {
      userId: 'social-user:alex' as EntityId,
      handle: 'alex.run',
      displayName: 'Alex Run',
      createdAt: '2026-07-05T00:00:00.000Z',
      updatedAt: '2026-07-05T00:00:00.000Z',
    },
    {
      userId: 'social-user:lina' as EntityId,
      handle: 'lina.trail',
      displayName: 'Lina Trail',
      createdAt: '2026-07-05T00:00:00.000Z',
      updatedAt: '2026-07-05T00:00:00.000Z',
    },
    '2026-07-05T12:00:00.000Z',
  );

  if (request.requesterUserId === request.recipientUserId) {
    throw new Error('Une demande cloud ne doit jamais viser le même userId.');
  }

  const report = normalizeCloudFriendRequestForUser(request, 'social-user:alex' as EntityId);
  if (!report || report.relationshipKey !== 'userId' || report.createsFriendship || report.exposesRawActivity) {
    throw new Error('Une demande cloud doit rester basée sur userId sans créer automatiquement une amitié.');
  }

  return true;
}
