import type { EntityId, IsoDateTime } from '@/domain/models/common';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';
export type FriendRequestDirection = 'incoming' | 'outgoing';
export type FriendVisibilityLevel = 'private' | 'friends' | 'public';
export type FriendActivitySharingLevel = 'disabled' | 'summary-only' | 'detailed';

export const FRIENDS_PRIVACY_SETTINGS_ID = 'friends-privacy-settings' as EntityId;

export interface FriendProfileSummary {
  readonly id: EntityId;
  readonly displayName: string;
  readonly handle: string;
  readonly initials: string;
  readonly connectedSince?: IsoDateTime;
}

export interface FriendRequest {
  readonly id: EntityId;
  readonly displayName: string;
  readonly handle: string;
  readonly direction: FriendRequestDirection;
  readonly status: FriendRequestStatus;
  readonly requestedAt: IsoDateTime;
}

export interface FriendsPrivacySettings {
  readonly profileVisibility: FriendVisibilityLevel;
  readonly activitySharing: FriendActivitySharingLevel;
  readonly allowFriendRequests: boolean;
  readonly requireManualApproval: boolean;
}

export interface StoredFriendProfile extends FriendProfileSummary {
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface StoredFriendRequest extends FriendRequest {
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface StoredFriendsPrivacySettings extends FriendsPrivacySettings {
  readonly id: EntityId;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface FriendsPrivacySnapshot {
  readonly friends: readonly FriendProfileSummary[];
  readonly requests: readonly FriendRequest[];
  readonly privacy: FriendsPrivacySettings;
}

export interface FriendsPrivacySummary {
  readonly friendCount: number;
  readonly incomingPendingCount: number;
  readonly outgoingPendingCount: number;
  readonly sharingEnabled: boolean;
  readonly requestsOpen: boolean;
  readonly approvalRequired: boolean;
}

export const DEFAULT_FRIENDS_PRIVACY_SETTINGS: FriendsPrivacySettings = {
  profileVisibility: 'friends',
  activitySharing: 'disabled',
  allowFriendRequests: true,
  requireManualApproval: true,
};

export const FRIEND_PROFILE_VISIBILITY_LABELS: Record<FriendVisibilityLevel, string> = {
  private: 'Profil privé',
  friends: 'Visible par les amis',
  public: 'Visible via invitation',
};

export const FRIEND_ACTIVITY_SHARING_LABELS: Record<FriendActivitySharingLevel, string> = {
  disabled: 'Partage désactivé',
  'summary-only': 'Résumé uniquement',
  detailed: 'Détaillé après accord',
};

export function normalizeFriendHandle(value: string): string {
  return value
    .trim()
    .replace(/^@/u, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/gu, '')
    .slice(0, 32);
}

export function createFriendRequestId(handle: string): EntityId {
  return `friend-request:${normalizeFriendHandle(handle)}` as EntityId;
}

export function createOutgoingFriendRequest(
  rawHandle: string,
  now: string = new Date().toISOString(),
): FriendRequest | undefined {
  const handle = normalizeFriendHandle(rawHandle);
  if (handle.length < 3) return undefined;

  return {
    id: createFriendRequestId(handle),
    displayName: `@${handle}`,
    handle,
    direction: 'outgoing',
    status: 'pending',
    requestedAt: now,
  };
}

export function acceptFriendRequest(
  snapshot: FriendsPrivacySnapshot,
  requestId: EntityId,
  now: IsoDateTime = new Date().toISOString(),
): FriendsPrivacySnapshot {
  const request = snapshot.requests.find((candidate) => candidate.id === requestId);
  if (!request || request.direction !== 'incoming' || request.status !== 'pending') {
    return snapshot;
  }

  const friend: FriendProfileSummary = {
    id: `friend:${request.handle}` as EntityId,
    displayName: request.displayName,
    handle: request.handle,
    initials: initialsFromName(request.displayName),
    connectedSince: now,
  };

  return {
    ...snapshot,
    friends: snapshot.friends.some((candidate) => candidate.handle === friend.handle)
      ? snapshot.friends
      : [...snapshot.friends, friend],
    requests: snapshot.requests.map((candidate) => (
      candidate.id === requestId ? { ...candidate, status: 'accepted' } : candidate
    )),
  };
}

export function declineFriendRequest(
  snapshot: FriendsPrivacySnapshot,
  requestId: EntityId,
): FriendsPrivacySnapshot {
  return {
    ...snapshot,
    requests: snapshot.requests.map((request) => (
      request.id === requestId && request.status === 'pending'
        ? { ...request, status: 'declined' }
        : request
    )),
  };
}

export function addOutgoingFriendRequest(
  snapshot: FriendsPrivacySnapshot,
  rawHandle: string,
  now?: string,
): FriendsPrivacySnapshot {
  const request = createOutgoingFriendRequest(rawHandle, now);
  if (!request) return snapshot;

  const alreadyKnown = snapshot.requests.some(
    (candidate) => candidate.handle === request.handle && candidate.status === 'pending',
  ) || snapshot.friends.some((friend) => friend.handle === request.handle);

  if (alreadyKnown) return snapshot;

  return {
    ...snapshot,
    requests: [...snapshot.requests, request],
  };
}

export function updateFriendsPrivacySettings(
  current: FriendsPrivacySettings,
  changes: Partial<FriendsPrivacySettings>,
): FriendsPrivacySettings {
  const profileVisibility = changes.profileVisibility ?? current.profileVisibility;

  return {
    ...current,
    ...changes,
    profileVisibility,
    requireManualApproval:
      changes.allowFriendRequests === false ? true : changes.requireManualApproval ?? current.requireManualApproval,
    activitySharing:
      profileVisibility === 'private' ? 'disabled' : changes.activitySharing ?? current.activitySharing,
  };
}

export function summarizeFriendsPrivacy(snapshot: FriendsPrivacySnapshot): FriendsPrivacySummary {
  return {
    friendCount: snapshot.friends.length,
    incomingPendingCount: snapshot.requests.filter(
      (request) => request.direction === 'incoming' && request.status === 'pending',
    ).length,
    outgoingPendingCount: snapshot.requests.filter(
      (request) => request.direction === 'outgoing' && request.status === 'pending',
    ).length,
    sharingEnabled: snapshot.privacy.activitySharing !== 'disabled',
    requestsOpen: snapshot.privacy.allowFriendRequests,
    approvalRequired: snapshot.privacy.requireManualApproval,
  };
}

function initialsFromName(value: string): string {
  const words = value.replace(/^@/u, '').split(/\s+|[._-]+/u).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.at(0)?.toUpperCase()).join('');
  return initials || 'SP';
}
