import type { EntityId, IsoDateTime } from '@/domain/models/common';
import {
  createDefaultFriendActivityPermission,
  createFriendProfileSummaryFromPublicProfile,
  ensureFriendActivityPermissions,
  normalizeFriendHandle,
  type FriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import type { CloudFriendRequest, CloudFriendship, PublicUserProfile } from '@/domain/friends/socialIdentity';

export const SOCIAL_CLOUD_FRIENDSHIP_CONTRACT_VERSION = '0.28.0-f5' as const;

export const SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS = [
  'handleBasedRelationship',
  'automaticFriendshipWithoutAcceptedRequest',
  'publicSuggestions',
  'globalUserDirectory',
  'rawActivityExport',
  'likes',
  'comments',
  'messaging',
  'groups',
  'leaderboards',
] as const;

export type SocialCloudFriendshipForbiddenBehavior =
  (typeof SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS)[number];

export interface CloudFriendActivityPermissionRecord extends FriendActivityPermission {
  readonly ownerUserId: EntityId;
  readonly friendUserId: EntityId;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface SocialCloudFriendshipReport {
  readonly friendship: CloudFriendship;
  readonly currentUserId: EntityId;
  readonly friendUserId: EntityId;
  readonly relationshipKey: 'userId';
  readonly defaultPermissionLevel: 'summary';
  readonly detailedRequiresConsent: true;
  readonly exposesRawActivity: false;
}

export function createCloudFriendshipId(userAId: EntityId, userBId: EntityId): EntityId {
  const [first, second] = sortCloudFriendshipUserIds(userAId, userBId);
  return `cloud-friendship:${first}<->${second}` as EntityId;
}

export function createCloudFriendActivityPermissionId(
  ownerUserId: EntityId,
  friendUserId: EntityId,
): EntityId {
  return `cloud-friend-permission:${ownerUserId}->${friendUserId}` as EntityId;
}

export function sortCloudFriendshipUserIds(
  userAId: EntityId,
  userBId: EntityId,
): readonly [EntityId, EntityId] {
  if (userAId === userBId) {
    throw new Error('Une amitié cloud doit relier deux userId distincts.');
  }

  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

export function buildCloudFriendshipFromAcceptedRequest(
  request: CloudFriendRequest,
  now: IsoDateTime = new Date().toISOString(),
): CloudFriendship {
  if (request.status !== 'accepted') {
    throw new Error('Une amitié cloud ne peut être créée qu’après acceptation explicite de la demande.');
  }

  const [userAId, userBId] = sortCloudFriendshipUserIds(
    request.requesterUserId as EntityId,
    request.recipientUserId as EntityId,
  );

  return {
    id: createCloudFriendshipId(userAId, userBId),
    userAId,
    userBId,
    status: 'active',
    createdAt: request.respondedAt ?? now,
    updatedAt: now,
  };
}

export function isCloudFriendshipForUser(
  friendship: CloudFriendship,
  userId: EntityId,
): boolean {
  return friendship.status === 'active' && (friendship.userAId === userId || friendship.userBId === userId);
}

export function getCloudFriendshipCounterpartUserId(
  friendship: CloudFriendship,
  currentUserId: EntityId,
): EntityId | undefined {
  if (!isCloudFriendshipForUser(friendship, currentUserId)) return undefined;
  return (friendship.userAId === currentUserId ? friendship.userBId : friendship.userAId) as EntityId;
}

export function cloudFriendshipToFriendProfileSummary(
  friendship: CloudFriendship,
  currentUserId: EntityId,
  profile: PublicUserProfile,
): FriendProfileSummary | undefined {
  const friendUserId = getCloudFriendshipCounterpartUserId(friendship, currentUserId);
  if (!friendUserId || profile.userId !== friendUserId) return undefined;

  return createFriendProfileSummaryFromPublicProfile(profile, friendship.createdAt);
}

export function normalizeCloudFriendshipForUser(
  friendship: CloudFriendship,
  currentUserId: EntityId,
): SocialCloudFriendshipReport | undefined {
  const friendUserId = getCloudFriendshipCounterpartUserId(friendship, currentUserId);
  if (!friendUserId) return undefined;

  return {
    friendship,
    currentUserId,
    friendUserId,
    relationshipKey: 'userId',
    defaultPermissionLevel: 'summary',
    detailedRequiresConsent: true,
    exposesRawActivity: false,
  };
}

export function mergeCloudFriendshipsIntoSnapshot(
  snapshot: FriendsPrivacySnapshot,
  currentUserId: EntityId,
  friendships: readonly CloudFriendship[],
  profiles: readonly PublicUserProfile[],
): FriendsPrivacySnapshot {
  const profileByUserId = new Map<EntityId, PublicUserProfile>();
  for (const profile of profiles) profileByUserId.set(profile.userId as EntityId, profile);
  const byUserId = new Map<EntityId, FriendProfileSummary>();

  for (const friend of snapshot.friends) {
    if (friend.userId) byUserId.set(friend.userId, friend);
  }

  for (const friendship of friendships) {
    const friendUserId = getCloudFriendshipCounterpartUserId(friendship, currentUserId);
    if (!friendUserId || byUserId.has(friendUserId)) continue;

    const profile = profileByUserId.get(friendUserId);
    if (!profile) continue;

    const friend = cloudFriendshipToFriendProfileSummary(friendship, currentUserId, profile);
    if (friend) byUserId.set(friendUserId, friend);
  }

  return ensureFriendActivityPermissions({
    ...snapshot,
    friends: [
      ...snapshot.friends.filter((friend) => !friend.userId),
      ...byUserId.values(),
    ],
  });
}

export function buildCloudFriendPermissionRecord(
  ownerUserId: EntityId,
  friend: FriendProfileSummary,
  permission: FriendActivityPermission = createDefaultFriendActivityPermission(friend),
  now: IsoDateTime = new Date().toISOString(),
): CloudFriendActivityPermissionRecord {
  if (!friend.userId && !permission.friendUserId) {
    throw new Error('Une permission cloud doit cibler un friendUserId stable.');
  }

  const friendUserId = (permission.friendUserId ?? friend.userId) as EntityId;
  const detailedConsentGrantedAt = permission.detailedConsentGrantedAt;

  return {
    id: createCloudFriendActivityPermissionId(ownerUserId, friendUserId),
    ownerUserId,
    friendUserId,
    friendHandle: normalizeFriendHandle(permission.friendHandle || friend.handle),
    sharingLevel: permission.sharingLevel,
    detailedConsent: permission.detailedConsent,
    ...(detailedConsentGrantedAt ? { detailedConsentGrantedAt } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

export const buildCloudFriendActivityPermissionRecord = buildCloudFriendPermissionRecord;

export function cloudPermissionRecordToLocalPermission(
  record: CloudFriendActivityPermissionRecord,
): FriendActivityPermission {
  return {
    id: record.id,
    friendUserId: record.friendUserId,
    friendHandle: normalizeFriendHandle(record.friendHandle),
    sharingLevel: record.sharingLevel,
    detailedConsent: record.detailedConsent,
    ...(record.detailedConsentGrantedAt ? { detailedConsentGrantedAt: record.detailedConsentGrantedAt } : {}),
  };
}

export function mergeCloudFriendPermissionsIntoSnapshot(
  snapshot: FriendsPrivacySnapshot,
  records: readonly CloudFriendActivityPermissionRecord[],
): FriendsPrivacySnapshot {
  const localById = new Map((snapshot.activityPermissions ?? []).map((permission) => [permission.id, permission]));
  for (const record of records) {
    localById.set(record.id, cloudPermissionRecordToLocalPermission(record));
  }

  return ensureFriendActivityPermissions({
    ...snapshot,
    activityPermissions: [...localById.values()],
  });
}

export function assertSocialCloudFriendshipContractIntegrity(): true {
  for (const forbidden of [
    'handleBasedRelationship',
    'automaticFriendshipWithoutAcceptedRequest',
    'globalUserDirectory',
    'rawActivityExport',
    'messaging',
  ] as const) {
    if (!SOCIAL_CLOUD_FRIENDSHIP_FORBIDDEN_BEHAVIORS.includes(forbidden)) {
      throw new Error(`Les amitiés cloud doivent interdire ${forbidden}.`);
    }
  }

  const acceptedRequest: CloudFriendRequest = {
    id: 'friend-request:social-user:alex->social-user:lina',
    requesterUserId: 'social-user:alex',
    recipientUserId: 'social-user:lina',
    status: 'accepted',
    requestedAt: '2026-07-05T12:00:00.000Z',
    respondedAt: '2026-07-05T12:30:00.000Z',
    createdAt: '2026-07-05T12:00:00.000Z',
    updatedAt: '2026-07-05T12:30:00.000Z',
  };

  const friendship = buildCloudFriendshipFromAcceptedRequest(acceptedRequest, '2026-07-05T12:31:00.000Z');
  const report = normalizeCloudFriendshipForUser(friendship, 'social-user:alex' as EntityId);
  if (!report || report.relationshipKey !== 'userId' || report.exposesRawActivity) {
    throw new Error('Une amitié cloud doit rester basée sur userId sans exposer d’activité brute.');
  }

  const friend: FriendProfileSummary = {
    id: 'social-user:lina' as EntityId,
    userId: 'social-user:lina' as EntityId,
    displayName: 'Lina Trail',
    handle: 'lina.trail',
    initials: 'LT',
  };
  const permission = buildCloudFriendPermissionRecord('social-user:alex' as EntityId, friend, undefined, '2026-07-05T12:31:00.000Z');
  if (permission.sharingLevel !== 'summary' || permission.detailedConsent !== 'notRequested') {
    throw new Error('Une permission cloud doit rester en résumé par défaut.');
  }

  return true;
}
