import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type { PublicUserProfile, SocialIdentity } from '@/domain/friends/socialIdentity';
import type { SocialActivityGlobalSharingPolicy } from '@/domain/friends/socialActivitySharingPolicy';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type FriendRequestDirection = 'incoming' | 'outgoing';
export type FriendVisibilityLevel = 'private' | 'friends' | 'public';
export type FriendActivitySharingLevel = 'disabled' | 'summary-only' | 'detailed';
export type FriendActivityPermissionLevel = 'summary' | 'detailed';
export type FriendDetailedConsentStatus = 'notRequested' | 'granted';
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
  readonly socialActivitySharingPolicy?: SocialActivityGlobalSharingPolicy;
}

export interface FriendActivityPermission {
  readonly id: EntityId;
  readonly friendUserId?: EntityId;
  readonly friendHandle: string;
  readonly sharingLevel: FriendActivityPermissionLevel;
  readonly detailedConsent: FriendDetailedConsentStatus;
  readonly detailedConsentGrantedAt?: IsoDateTime;
}

export interface StoredFriendProfile extends FriendProfileSummary {
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface StoredFriendRequest extends FriendRequest {
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface StoredFriendActivityPermission extends FriendActivityPermission {
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
  readonly activityPermissions?: readonly FriendActivityPermission[];
}

export interface FriendsPrivacySummary {
  readonly friendCount: number;
  readonly incomingPendingCount: number;
  readonly outgoingPendingCount: number;
  readonly sharingEnabled: boolean;
  readonly requestsOpen: boolean;
  readonly approvalRequired: boolean;
  readonly summaryPermissionCount: number;
  readonly detailedPermissionCount: number;
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

export interface FriendScopedActivitySharingGuard extends FriendActivitySharingGuard {
  readonly friendId: EntityId;
  readonly friendHandle: string;
  readonly permission: FriendActivityPermission;
}

export const DEFAULT_FRIENDS_PRIVACY_SETTINGS: FriendsPrivacySettings = {
  profileVisibility: 'friends',
  activitySharing: 'disabled',
  allowFriendRequests: true,
  requireManualApproval: true,
  socialActivitySharingPolicy: {
    visibility: 'private',
    fields: {
      common: ['activityType', 'title', 'date', 'duration'],
      cardio: ['distance', 'pace', 'speed', 'elevation'],
      strength: [
        'sessionName',
        'muscleGroups',
        'exerciseCount',
        'exercises',
        'sets',
        'repetitions',
        'loads',
        'volume',
      ],
    },
  },
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

export const FRIEND_ACTIVITY_PERMISSION_LABELS: Record<FriendActivityPermissionLevel, string> = {
  summary: 'Résumé uniquement',
  detailed: 'Détail autorisé',
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

export function createFriendActivityPermissionId(friend: FriendProfileSummary): EntityId {
  const stableId = friend.userId ?? friend.id ?? (`friend:${normalizeFriendHandle(friend.handle)}` as EntityId);
  return `friend-activity-permission:${stableId}` as EntityId;
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

export function createDefaultFriendActivityPermission(
  friend: FriendProfileSummary,
): FriendActivityPermission {
  const permission: FriendActivityPermission = {
    id: createFriendActivityPermissionId(friend),
    ...(friend.userId ? { friendUserId: friend.userId } : {}),
    friendHandle: normalizeFriendHandle(friend.handle),
    sharingLevel: 'summary',
    detailedConsent: 'notRequested',
  };

  return permission;
}

function friendMatchesPermission(
  friend: FriendProfileSummary,
  permission: FriendActivityPermission,
): boolean {
  return (
    (friend.userId !== undefined && permission.friendUserId === friend.userId)
    || permission.id === createFriendActivityPermissionId(friend)
    || permission.friendHandle === normalizeFriendHandle(friend.handle)
  );
}

export function findFriendActivityPermission(
  snapshot: FriendsPrivacySnapshot,
  friend: FriendProfileSummary,
): FriendActivityPermission | undefined {
  return (snapshot.activityPermissions ?? []).find((permission) =>
    friendMatchesPermission(friend, permission),
  );
}

export function selectFriendActivityPermission(
  snapshot: FriendsPrivacySnapshot,
  friend: FriendProfileSummary,
): FriendActivityPermission {
  return findFriendActivityPermission(snapshot, friend) ?? createDefaultFriendActivityPermission(friend);
}

export function ensureFriendActivityPermissions(
  snapshot: FriendsPrivacySnapshot,
): FriendsPrivacySnapshot {
  const existing = snapshot.activityPermissions ?? [];
  const nextPermissions = snapshot.friends.map((friend) => {
    const permission = existing.find((candidate) => friendMatchesPermission(friend, candidate));
    if (!permission) return createDefaultFriendActivityPermission(friend);

    return {
      ...permission,
      id: createFriendActivityPermissionId(friend),
      ...(friend.userId ? { friendUserId: friend.userId } : {}),
      friendHandle: normalizeFriendHandle(friend.handle),
    };
  });

  return {
    ...snapshot,
    activityPermissions: nextPermissions,
  };
}

export function updateFriendActivityPermission(
  snapshot: FriendsPrivacySnapshot,
  friendId: EntityId,
  sharingLevel: FriendActivityPermissionLevel,
  now: IsoDateTime = new Date().toISOString(),
): FriendsPrivacySnapshot {
  const friend = snapshot.friends.find((candidate) => (
    candidate.id === friendId || candidate.userId === friendId || normalizeFriendHandle(candidate.handle) === friendId
  ));
  if (!friend) return snapshot;

  const normalized = ensureFriendActivityPermissions(snapshot);
  const basePermission = selectFriendActivityPermission(normalized, friend);
  const nextPermission: FriendActivityPermission = sharingLevel === 'detailed'
    ? {
        ...basePermission,
        sharingLevel: 'detailed',
        detailedConsent: 'granted',
        detailedConsentGrantedAt: now,
      }
    : {
        id: basePermission.id,
        ...(basePermission.friendUserId ? { friendUserId: basePermission.friendUserId } : {}),
        friendHandle: basePermission.friendHandle,
        sharingLevel: 'summary',
        detailedConsent: 'notRequested',
      };

  return {
    ...normalized,
    activityPermissions: (normalized.activityPermissions ?? []).map((permission) => (
      permission.id === basePermission.id ? nextPermission : permission
    )),
  };
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

  const nextFriends = snapshot.friends.some((candidate) => (
    (friend.userId ? candidate.userId === friend.userId : false)
    || candidate.id === friend.id
    || candidate.handle === friend.handle
  ))
    ? snapshot.friends
    : [...snapshot.friends, friend];

  return ensureFriendActivityPermissions({
    ...snapshot,
    friends: nextFriends,
    requests: snapshot.requests.map((candidate) => (
      candidate.id === requestId ? { ...candidate, status: 'accepted' } : candidate
    )),
  });
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

function legacySharingLevelForSocialPolicy(
  policy: SocialActivityGlobalSharingPolicy,
): FriendActivitySharingLevel {
  if (policy.visibility === 'private') return 'disabled';
  if (policy.visibility === 'summary') return 'summary-only';
  return 'detailed';
}

function policyFromLegacySharing(
  sharing: FriendActivitySharingLevel,
  currentPolicy: SocialActivityGlobalSharingPolicy | undefined,
): SocialActivityGlobalSharingPolicy {
  const fields = currentPolicy?.fields ?? DEFAULT_FRIENDS_PRIVACY_SETTINGS.socialActivitySharingPolicy!.fields;
  return {
    visibility: sharing === 'disabled'
      ? 'private'
      : sharing === 'summary-only'
        ? 'summary'
        : 'detailed',
    fields,
  };
}

export function updateFriendsPrivacySettings(
  current: FriendsPrivacySettings,
  changes: Partial<FriendsPrivacySettings>,
): FriendsPrivacySettings {
  const profileVisibility = changes.profileVisibility ?? current.profileVisibility;
  const requestedPolicy = changes.socialActivitySharingPolicy
    ?? (changes.activitySharing
      ? policyFromLegacySharing(changes.activitySharing, current.socialActivitySharingPolicy)
      : current.socialActivitySharingPolicy);
  const socialActivitySharingPolicy = requestedPolicy;
  const activitySharing = profileVisibility === 'private'
    ? 'disabled'
    : socialActivitySharingPolicy
      ? legacySharingLevelForSocialPolicy(socialActivitySharingPolicy)
      : changes.activitySharing ?? current.activitySharing;

  return {
    ...current,
    ...changes,
    profileVisibility,
    requireManualApproval:
      changes.allowFriendRequests === false ? true : changes.requireManualApproval ?? current.requireManualApproval,
    activitySharing,
    ...(socialActivitySharingPolicy ? { socialActivitySharingPolicy } : {}),
  };
}

export function summarizeFriendsPrivacy(snapshot: FriendsPrivacySnapshot): FriendsPrivacySummary {
  const permissions = snapshot.activityPermissions ?? [];

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
    summaryPermissionCount: snapshot.friends.filter((friend) =>
      selectFriendActivityPermission(snapshot, friend).sharingLevel === 'summary',
    ).length,
    detailedPermissionCount: permissions.filter((permission) => (
      permission.sharingLevel === 'detailed' && permission.detailedConsent === 'granted'
    )).length,
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

  const detailedPermissionExists = snapshot.friends.some((friend) => {
    const permission = selectFriendActivityPermission(snapshot, friend);
    return permission.sharingLevel === 'detailed' && permission.detailedConsent === 'granted';
  });

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
    reason: detailedPermissionExists
      ? 'Snapshots sociaux filtrés disponibles : le détail reste limité aux amis autorisés, sans export brut.'
      : 'Résumé autorisé par défaut. Le détail reste bloqué sans consentement explicite par ami.',
  };
}

export function evaluateFriendScopedActivitySharingGuard(
  snapshot: FriendsPrivacySnapshot,
  friend: FriendProfileSummary,
): FriendScopedActivitySharingGuard {
  const permission = selectFriendActivityPermission(snapshot, friend);
  const globalGuard = evaluateFriendActivitySharingGuard(snapshot);
  if (!globalGuard.canShareSummary) {
    return {
      ...globalGuard,
      friendId: friend.id,
      friendHandle: friend.handle,
      permission,
    };
  }

  if (
    snapshot.privacy.activitySharing === 'detailed'
    && permission.sharingLevel === 'detailed'
    && permission.detailedConsent === 'granted'
  ) {
    return {
      allowedScope: 'detailed',
      canShareSummary: true,
      canShareDetailed: true,
      detailedSharingBlocked: false,
      reason: 'Détail autorisé localement pour cet ami après consentement explicite.',
      friendId: friend.id,
      friendHandle: friend.handle,
      permission,
    };
  }

  return {
    allowedScope: 'summary',
    canShareSummary: true,
    canShareDetailed: false,
    detailedSharingBlocked: true,
    reason: 'Résumé partagé par défaut. Le détail reste verrouillé pour cet ami.',
    friendId: friend.id,
    friendHandle: friend.handle,
    permission,
  };
}

export function canExposeFriendActivityDetails(snapshot: FriendsPrivacySnapshot): boolean {
  return evaluateFriendActivitySharingGuard(snapshot).canShareDetailed;
}

export function canExposeFriendActivityDetailsToFriend(
  snapshot: FriendsPrivacySnapshot,
  friend: FriendProfileSummary,
): boolean {
  return evaluateFriendScopedActivitySharingGuard(snapshot, friend).canShareDetailed;
}

function initialsFromName(value: string): string {
  const words = value.replace(/^@/u, '').split(/\s+|[._-]+/u).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word.at(0)?.toUpperCase()).join('');
  return initials || 'SP';
}
