import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type { PublicUserProfile, SocialIdentity } from '@/domain/friends/socialIdentity';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type FriendRequestDirection = 'incoming' | 'outgoing';
export type FriendVisibilityLevel = 'private' | 'friends' | 'public';
export type FriendActivitySharingLevel = 'disabled' | 'summary-only' | 'detailed';
export type FriendRequestEligibilityStatus =
  | 'allowed'
  | 'self'
  | 'alreadyFriend'
  | 'alreadySent'
  | 'alreadyReceived';

export const FRIENDS_PRIVACY_SETTINGS_ID = 'friends-privacy-settings' as EntityId;

export interface FriendProfileSummary {
  readonly id: EntityId;
  readonly userId?: EntityId;
  readonly displayName: string;
  readonly handle: string;
  readonly initials: string;
  readonly connectedSince?: IsoDateTime;
}

export interface FriendRequest {
  readonly id: EntityId;
  readonly requesterUserId?: EntityId;
  readonly recipientUserId?: EntityId;
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
  readonly socialIdentity?: SocialIdentity;
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

export interface FriendRequestEligibility {
  readonly status: FriendRequestEligibilityStatus;
  readonly message: string;
}

export type FriendActivityShareScope = 'none' | 'summary' | 'detailed';

export interface FriendActivitySharingGuard {
  readonly allowedScope: FriendActivityShareScope;
  readonly canShareSummary: boolean;
  readonly canShareDetailed: boolean;
  readonly detailedSharingBlocked: boolean;
  readonly reason: string;
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

export function createCloudFriendRequestId(
  requesterUserId: EntityId,
  recipientUserId: EntityId,
): EntityId {
  return `friend-request:${requesterUserId}->${recipientUserId}` as EntityId;
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

export function createOutgoingFriendRequestForProfile(
  profile: PublicUserProfile,
  requesterUserId: EntityId,
  now: IsoDateTime = new Date().toISOString(),
): FriendRequest {
  return {
    id: createCloudFriendRequestId(requesterUserId, profile.userId as EntityId),
    requesterUserId,
    recipientUserId: profile.userId as EntityId,
    displayName: profile.displayName,
    handle: normalizeFriendHandle(profile.handle),
    direction: 'outgoing',
    status: 'pending',
    requestedAt: now,
  };
}

export function createFriendProfileSummaryFromPublicProfile(
  profile: PublicUserProfile,
  connectedSince?: IsoDateTime,
): FriendProfileSummary {
  const summary: FriendProfileSummary = {
    id: profile.userId as EntityId,
    userId: profile.userId as EntityId,
    displayName: profile.displayName,
    handle: normalizeFriendHandle(profile.handle),
    initials: initialsFromName(profile.displayName || profile.handle),
  };

  return connectedSince ? { ...summary, connectedSince } : summary;
}

export function evaluateFriendRequestEligibility(
  snapshot: FriendsPrivacySnapshot,
  identity: SocialIdentity,
  profile: PublicUserProfile,
): FriendRequestEligibility {
  const normalizedHandle = normalizeFriendHandle(profile.handle);
  const profileUserId = profile.userId as EntityId;

  if (profileUserId === identity.userId || normalizedHandle === normalizeFriendHandle(identity.handle)) {
    return {
      status: 'self',
      message: 'Impossible de t’envoyer une demande à toi-même.',
    };
  }

  const alreadyFriend = snapshot.friends.some((friend) => (
    friend.userId === profileUserId || friend.id === profileUserId || friend.handle === normalizedHandle
  ));
  if (alreadyFriend) {
    return {
      status: 'alreadyFriend',
      message: 'Ce profil est déjà dans tes amis.',
    };
  }

  const pendingRequest = snapshot.requests.find((request) => (
    request.status === 'pending'
    && (
      request.requesterUserId === profileUserId
      || request.recipientUserId === profileUserId
      || request.handle === normalizedHandle
    )
  ));

  if (pendingRequest?.direction === 'outgoing') {
    return {
      status: 'alreadySent',
      message: 'Une demande est déjà envoyée à cet identifiant.',
    };
  }

  if (pendingRequest?.direction === 'incoming') {
    return {
      status: 'alreadyReceived',
      message: 'Cet utilisateur t’a déjà envoyé une demande. Traite la demande reçue avant d’en envoyer une nouvelle.',
    };
  }

  return {
    status: 'allowed',
    message: 'Demande possible.',
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

  const friendUserId = request.requesterUserId;
  const friend: FriendProfileSummary = {
    id: friendUserId ?? (`friend:${request.handle}` as EntityId),
    ...(friendUserId ? { userId: friendUserId } : {}),
    displayName: request.displayName,
    handle: request.handle,
    initials: initialsFromName(request.displayName),
    connectedSince: now,
  };

  return {
    ...snapshot,
    friends: snapshot.friends.some((candidate) => (
      (friend.userId ? candidate.userId === friend.userId : false)
      || candidate.id === friend.id
      || candidate.handle === friend.handle
    ))
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

export function addOutgoingFriendRequestForProfile(
  snapshot: FriendsPrivacySnapshot,
  profile: PublicUserProfile,
  requesterUserId: EntityId,
  now?: IsoDateTime,
): FriendsPrivacySnapshot {
  const eligibility = evaluateFriendRequestEligibility(
    snapshot,
    {
      userId: requesterUserId,
      handle: '',
      displayName: '',
      createdAt: now ?? new Date().toISOString(),
      updatedAt: now ?? new Date().toISOString(),
    },
    profile,
  );

  if (eligibility.status !== 'allowed') return snapshot;

  return {
    ...snapshot,
    requests: [
      ...snapshot.requests,
      createOutgoingFriendRequestForProfile(profile, requesterUserId, now),
    ],
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

export function evaluateFriendActivitySharingGuard(
  snapshot: FriendsPrivacySnapshot,
): FriendActivitySharingGuard {
  if (snapshot.privacy.profileVisibility === 'private') {
    return {
      allowedScope: 'none',
      canShareSummary: false,
      canShareDetailed: false,
      detailedSharingBlocked: true,
      reason: 'Profil privé : aucun partage d’activité n’est autorisé.',
    };
  }

  if (snapshot.privacy.activitySharing === 'disabled') {
    return {
      allowedScope: 'none',
      canShareSummary: false,
      canShareDetailed: false,
      detailedSharingBlocked: true,
      reason: 'Partage désactivé : les activités restent privées.',
    };
  }

  if (snapshot.friends.length === 0) {
    return {
      allowedScope: 'none',
      canShareSummary: false,
      canShareDetailed: false,
      detailedSharingBlocked: true,
      reason: 'Aucun ami accepté : rien n’est exposé hors de cet appareil.',
    };
  }

  if (snapshot.privacy.activitySharing === 'summary-only') {
    return {
      allowedScope: 'summary',
      canShareSummary: true,
      canShareDetailed: false,
      detailedSharingBlocked: true,
      reason: 'Résumé d’activité autorisé pour les amis acceptés uniquement.',
    };
  }

  return {
    allowedScope: 'summary',
    canShareSummary: true,
    canShareDetailed: false,
    detailedSharingBlocked: true,
    reason: 'Partage détaillé préparé mais bloqué jusqu’au consentement explicite par ami en 0.27.0.',
  };
}

export function canExposeFriendActivityDetails(snapshot: FriendsPrivacySnapshot): boolean {
  return evaluateFriendActivitySharingGuard(snapshot).canShareDetailed;
}

function initialsFromName(value: string): string {
  const words = value.replace(/^@/u, '').split(/\s+|[._-]+/u).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.at(0)?.toUpperCase()).join('');
  return initials || 'SP';
}
