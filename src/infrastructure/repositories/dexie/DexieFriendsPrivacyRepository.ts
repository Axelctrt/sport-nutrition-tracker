import type { IsoDateTime } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  FRIENDS_PRIVACY_SETTINGS_ID,
  type FriendProfileSummary,
  type FriendRequest,
  type FriendsPrivacySnapshot,
  type StoredFriendProfile,
  type StoredFriendRequest,
  type StoredFriendsPrivacySettings,
} from '@/domain/friends/friendship';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
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

function toStoredPrivacySettings(
  snapshot: FriendsPrivacySnapshot,
  now: IsoDateTime,
  previous?: StoredFriendsPrivacySettings,
): StoredFriendsPrivacySettings {
  const settings: StoredFriendsPrivacySettings = {
    id: FRIENDS_PRIVACY_SETTINGS_ID,
    ...snapshot.privacy,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
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
      }
    : DEFAULT_FRIENDS_PRIVACY_SETTINGS;
}

export class DexieFriendsPrivacyRepository implements FriendsPrivacySnapshotRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  readSnapshot(): Promise<FriendsPrivacySnapshot> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire les amis et les préférences de confidentialité.',
      async () => {
        const [friends, requests, privacy] = await Promise.all([
          this.database.friendProfiles.toArray(),
          this.database.friendRequests.toArray(),
          this.database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID),
        ]);

        return {
          friends: friends.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
          requests: requests.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
          privacy: toSnapshotPrivacy(privacy),
        };
      },
    );
  }

  saveSnapshot(snapshot: FriendsPrivacySnapshot): Promise<void> {
    return runRepositoryOperation(
      'update',
      'Impossible de persister les amis et les préférences de confidentialité.',
      async () => {
        const now = currentIsoDateTime();
        const [existingFriends, existingRequests, existingPrivacy] = await Promise.all([
          this.database.friendProfiles.toArray(),
          this.database.friendRequests.toArray(),
          this.database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID),
        ]);
        const friendsById = new Map(existingFriends.map((friend) => [friend.id, friend]));
        const requestsById = new Map(existingRequests.map((request) => [request.id, request]));

        const storedFriends = snapshot.friends.map((friend) =>
          toStoredFriendProfile(friend, now, friendsById.get(friend.id)),
        );
        const storedRequests = snapshot.requests.map((request) =>
          toStoredFriendRequest(request, now, requestsById.get(request.id)),
        );
        const storedPrivacy = toStoredPrivacySettings(snapshot, now, existingPrivacy);

        await this.database.transaction(
          'rw',
          this.database.friendProfiles,
          this.database.friendRequests,
          this.database.friendsPrivacySettings,
          async () => {
            await this.database.friendProfiles.clear();
            await this.database.friendRequests.clear();
            await this.database.friendProfiles.bulkPut(storedFriends);
            await this.database.friendRequests.bulkPut(storedRequests);
            await this.database.friendsPrivacySettings.put(storedPrivacy);
          },
        );
      },
    );
  }
}
