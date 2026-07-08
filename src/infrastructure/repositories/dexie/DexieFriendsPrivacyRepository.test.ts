import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, FRIENDS_PRIVACY_SETTINGS_ID, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { EntityId } from '@/domain/models/common';

function createDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-friends-privacy-${crypto.randomUUID()}`);
}

const snapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'friend:lea' as EntityId,
      displayName: 'Léa Cardio',
      handle: 'lea.cardio',
      initials: 'LC',
      connectedSince: '2026-07-05T08:00:00.000Z',
    },
  ],
  requests: [
    {
      id: 'friend-request:nora.trail' as EntityId,
      displayName: 'Nora Trail',
      handle: 'nora.trail',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-05T09:00:00.000Z',
    },
  ],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    profileVisibility: 'private',
    activitySharing: 'disabled',
  },
};

describe('DexieFriendsPrivacyRepository', () => {
  it('retourne un snapshot vide sécurisé quand aucune donnée ami n’existe', async () => {
    const database = createDatabase();
    const repository = new DexieFriendsPrivacyRepository(database);

    try {
      await database.open();
      await expect(repository.readSnapshot()).resolves.toEqual({
        friends: [],
        requests: [],
        privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
        activityPermissions: [],
      });
    } finally {
      database.close();
      await database.delete();
    }
  });

  it('persiste les amis, demandes, permissions et préférences de confidentialité dans Dexie v10', async () => {
    const database = createDatabase();
    const repository = new DexieFriendsPrivacyRepository(database);

    try {
      await database.open();
      await repository.saveSnapshot(snapshot);

      expect(await database.friendProfiles.count()).toBe(1);
      expect(await database.friendRequests.count()).toBe(1);
      expect(await database.friendActivityPermissions.count()).toBe(1);
      expect(await database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID)).toMatchObject({
        id: FRIENDS_PRIVACY_SETTINGS_ID,
        profileVisibility: 'private',
        activitySharing: 'disabled',
      });

      await expect(repository.readSnapshot()).resolves.toMatchObject({
        friends: [expect.objectContaining({ handle: 'lea.cardio' })],
        requests: [expect.objectContaining({ handle: 'nora.trail', status: 'pending' })],
        privacy: expect.objectContaining({ profileVisibility: 'private' }),
        activityPermissions: [expect.objectContaining({ friendHandle: 'lea.cardio', sharingLevel: 'summary' })],
      });
    } finally {
      database.close();
      await database.delete();
    }
  });

  it('horodate séparément la visibilité et la politique globale', async () => {
    const database = createDatabase();
    const timestamps = [
      '2026-07-07T08:00:00.000Z',
      '2026-07-07T09:00:00.000Z',
      '2026-07-07T10:00:00.000Z',
    ];
    const repository = new DexieFriendsPrivacyRepository(
      database,
      () => timestamps.shift()!,
    );

    try {
      await database.open();
      await repository.saveSnapshot(snapshot);
      const first = await database.friendsPrivacySettings.get(
        FRIENDS_PRIVACY_SETTINGS_ID,
      );

      await repository.saveSnapshot({
        ...snapshot,
        requests: [],
      });
      const afterRequestChange = await database.friendsPrivacySettings.get(
        FRIENDS_PRIVACY_SETTINGS_ID,
      );

      await repository.saveSnapshot({
        ...snapshot,
        privacy: {
          ...snapshot.privacy,
          socialActivitySharingPolicy: {
            ...snapshot.privacy.socialActivitySharingPolicy!,
            visibility: 'detailed',
          },
        },
      });
      const afterPolicyChange = await database.friendsPrivacySettings.get(
        FRIENDS_PRIVACY_SETTINGS_ID,
      );

      expect(first).toMatchObject({
        profileVisibilityUpdatedAt: '2026-07-07T08:00:00.000Z',
        socialActivitySharingPolicyUpdatedAt: '2026-07-07T08:00:00.000Z',
      });
      expect(afterRequestChange).toMatchObject({
        profileVisibilityUpdatedAt: '2026-07-07T08:00:00.000Z',
        socialActivitySharingPolicyUpdatedAt: '2026-07-07T08:00:00.000Z',
        updatedAt: '2026-07-07T09:00:00.000Z',
      });
      expect(afterPolicyChange).toMatchObject({
        profileVisibilityUpdatedAt: '2026-07-07T08:00:00.000Z',
        socialActivitySharingPolicyUpdatedAt: '2026-07-07T10:00:00.000Z',
      });
    } finally {
      database.close();
      await database.delete();
    }
  });
});
