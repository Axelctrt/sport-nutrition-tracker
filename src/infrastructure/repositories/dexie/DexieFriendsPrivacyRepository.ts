import type { IsoDateTime } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  FRIENDS_PRIVACY_SETTINGS_ID,
  ensureFriendActivityPermissions,
  type FriendActivityPermission,
  type FriendProfileSummary,
  type FriendRequest,
  type FriendsPrivacySnapshot,
  type StoredFriendActivityPermission,
  type StoredFriendProfile,
  type StoredFriendRequest,
  type StoredFriendsPrivacySettings,
} from '@/domain/friends/friendship';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { sameEntity } from '@/infrastructure/sync-prototype/cloudSyncValue';
import { currentIsoDateTime } from '@/shared/utils/entities';

function sanitizeTimestamp(value: string | undefined, fallback: IsoDateTime): IsoDateTime {
  return value && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function toStoredFriendProfile(
  friend: FriendProfileSummary,
  now: IsoDateTime,
  previous?: StoredFriendProfile,
): StoredFriendProfile {
  return {
    ...friend,
    connectedSince: sanitizeTimestamp(friend.connectedSince, previous?.connectedSince ?? now),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

function toStoredFriendRequest(
  request: FriendRequest,
  now: IsoDateTime,
  previous?: StoredFriendRequest,
): StoredFriendRequest {
  return {
    ...request,
    requestedAt: sanitizeTimestamp(request.requestedAt, previous?.requestedAt ?? now),
    createdAt: previous?.createdAt ?? request.requestedAt,
    updatedAt: now,
  };
}

function toStoredFriendActivityPermission(
  permission: FriendActivityPermission,
  now: IsoDateTime,
  previous?: StoredFriendActivityPermission,
): StoredFriendActivityPermission {
  return {
    ...permission,
    ...(permission.detailedConsentGrantedAt
      ? {
          detailedConsentGrantedAt: sanitizeTimestamp(
            permission.detailedConsentGrantedAt,
            previous?.detailedConsentGrantedAt ?? now,
          ),
        }
      : {}),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

function toStoredPrivacySettings(
  snapshot: FriendsPrivacySnapshot,
  now: IsoDateTime,
  previous?: StoredFriendsPrivacySettings,
): StoredFriendsPrivacySettings {
  const profileVisibilityChanged =
    !previous || previous.profileVisibility !== snapshot.privacy.profileVisibility;
  const socialActivitySharingPolicyChanged =
    !previous
    || !sameEntity(
      previous.socialActivitySharingPolicy,
      snapshot.privacy.socialActivitySharingPolicy,
    );
  const settings: StoredFriendsPrivacySettings = {
    id: FRIENDS_PRIVACY_SETTINGS_ID,
    ...snapshot.privacy,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    profileVisibilityUpdatedAt: profileVisibilityChanged
      ? now
      : previous.profileVisibilityUpdatedAt ?? previous.updatedAt,
    socialActivitySharingPolicyUpdatedAt: socialActivitySharingPolicyChanged
      ? now
      : previous.socialActivitySharingPolicyUpdatedAt ?? previous.updatedAt,
  };

  return previous?.socialIdentity
    ? { ...settings, socialIdentity: previous.socialIdentity }
    : settings;
}

function toSnapshotPrivacy(
  stored: StoredFriendsPrivacySettings | undefined,
) {
  return stored
    ? {
        profileVisibility: stored.profileVisibility,
        activitySharing: stored.activitySharing,
        allowFriendRequests: stored.allowFriendRequests,
        requireManualApproval: stored.requireManualApproval,
        ...(stored.socialActivitySharingPolicy
          ? { socialActivitySharingPolicy: stored.socialActivitySharingPolicy }
          : {}),
      }
    : DEFAULT_FRIENDS_PRIVACY_SETTINGS;
}

export class DexieFriendsPrivacyRepository implements FriendsPrivacySnapshotRepository {
  private readonly database: AppDatabase;
  private readonly now: () => IsoDateTime;

  constructor(
    database: AppDatabase,
    now: () => IsoDateTime = currentIsoDateTime,
  ) {
    this.database = database;
    this.now = now;
  }

  readSnapshot(): Promise<FriendsPrivacySnapshot> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les amis et les préférences de confidentialité.',
      async () => {
        const [friends, requests, privacy, activityPermissions] = await Promise.all([
          this.database.friendProfiles.toArray(),
          this.database.friendRequests.toArray(),
          this.database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID),
          this.database.friendActivityPermissions.toArray(),
        ]);

        return ensureFriendActivityPermissions({
          friends: friends.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
          requests: requests.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
          privacy: toSnapshotPrivacy(privacy),
          activityPermissions: activityPermissions.sort((a, b) => a.friendHandle.localeCompare(b.friendHandle, 'fr')),
        });
      },
    );
  }

  saveSnapshot(snapshot: FriendsPrivacySnapshot): Promise<void> {
    return runRepositoryOperation(
      'update',
      'Impossible de persister les amis et les préférences de confidentialité.',
      async () => {
        const now = this.now();
        const normalizedSnapshot = ensureFriendActivityPermissions(snapshot);
        const [existingFriends, existingRequests, existingPrivacy, existingPermissions] = await Promise.all([
          this.database.friendProfiles.toArray(),
          this.database.friendRequests.toArray(),
          this.database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID),
          this.database.friendActivityPermissions.toArray(),
        ]);
        const friendsById = new Map(existingFriends.map((friend) => [friend.id, friend]));
        const requestsById = new Map(existingRequests.map((request) => [request.id, request]));
        const permissionsById = new Map(existingPermissions.map((permission) => [permission.id, permission]));

        const storedFriends = normalizedSnapshot.friends.map((friend) =>
          toStoredFriendProfile(friend, now, friendsById.get(friend.id)),
        );
        const storedRequests = normalizedSnapshot.requests.map((request) =>
          toStoredFriendRequest(request, now, requestsById.get(request.id)),
        );
        const storedPermissions = (normalizedSnapshot.activityPermissions ?? []).map((permission) =>
          toStoredFriendActivityPermission(permission, now, permissionsById.get(permission.id)),
        );
        const storedPrivacy = toStoredPrivacySettings(normalizedSnapshot, now, existingPrivacy);

        await this.database.transaction(
          'rw',
          this.database.friendProfiles,
          this.database.friendRequests,
          this.database.friendActivityPermissions,
          this.database.friendsPrivacySettings,
          async () => {
            await this.database.friendProfiles.clear();
            await this.database.friendRequests.clear();
            await this.database.friendActivityPermissions.clear();
            await this.database.friendProfiles.bulkPut(storedFriends);
            await this.database.friendRequests.bulkPut(storedRequests);
            await this.database.friendActivityPermissions.bulkPut(storedPermissions);
            await this.database.friendsPrivacySettings.put(storedPrivacy);
          },
        );
      },
    );
  }
}
