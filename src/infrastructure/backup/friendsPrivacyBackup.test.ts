import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { createBackupEnvelope, replaceDatabaseFromBackup } from '@/infrastructure/backup/backupService';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, FRIENDS_PRIVACY_SETTINGS_ID, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity, updateSocialIdentity } from '@/domain/friends/socialIdentity';
import type { EntityId } from '@/domain/models/common';

function createDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-friends-backup-${crypto.randomUUID()}`);
}

const snapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'social-user:backup-runner' as EntityId,
      userId: 'social-user:backup-runner' as EntityId,
      displayName: 'Backup Runner',
      handle: 'backup.runner',
      initials: 'BR',
      connectedSince: '2026-07-05T09:00:00.000Z',
    },
  ],
  requests: [
    {
      id: 'friend-request:social-user:backup123->social-user:backup-trail' as EntityId,
      requesterUserId: 'social-user:backup123' as EntityId,
      recipientUserId: 'social-user:backup-trail' as EntityId,
      displayName: '@backup.trail',
      handle: 'backup.trail',
      direction: 'outgoing',
      status: 'pending',
      requestedAt: '2026-07-05T10:00:00.000Z',
    },
  ],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    profileVisibility: 'private',
    activitySharing: 'disabled',
  },
};

describe('sauvegarde amis et confidentialité', () => {
  it('exporte et restaure les tables amis avec le format JSON v9', async () => {
    const source = createDatabase();
    const target = createDatabase();

    try {
      await source.open();
      await target.open();
      await new DexieFriendsPrivacyRepository(source).saveSnapshot(snapshot);
      const identity = updateSocialIdentity(
        createDefaultSocialIdentity('2026-07-05T09:30:00.000Z', 'backup123'),
        { handle: '@backup.runner', displayName: 'Backup Runner' },
        '2026-07-05T09:45:00.000Z',
      );
      await new DexieSocialIdentityRepository(source).saveIdentity(identity);

      const envelope = await createBackupEnvelope(source, '2026-07-05T10:30:00.000Z');

      expect(envelope.schemaVersion).toBe(10);
      expect(envelope.data.friendProfiles).toEqual([
        expect.objectContaining({ userId: 'social-user:backup-runner', handle: 'backup.runner' }),
      ]);
      expect(envelope.data.friendRequests).toEqual([
        expect.objectContaining({ recipientUserId: 'social-user:backup-trail', handle: 'backup.trail', status: 'pending' }),
      ]);
      expect(envelope.data.friendActivityPermissions).toEqual([
        expect.objectContaining({ friendHandle: 'backup.runner', sharingLevel: 'summary' }),
      ]);
      expect(envelope.data.friendsPrivacySettings).toEqual([
        expect.objectContaining({
          id: FRIENDS_PRIVACY_SETTINGS_ID,
          profileVisibility: 'private',
          profileVisibilityUpdatedAt: expect.any(String),
          socialActivitySharingPolicyUpdatedAt: expect.any(String),
          socialIdentity: expect.objectContaining({
            userId: identity.userId,
            handle: 'backup.runner',
            displayName: 'Backup Runner',
          }),
        }),
      ]);

      await replaceDatabaseFromBackup(envelope, target);

      await expect(new DexieFriendsPrivacyRepository(target).readSnapshot()).resolves.toMatchObject({
        friends: [expect.objectContaining({ userId: 'social-user:backup-runner', handle: 'backup.runner' })],
        requests: [expect.objectContaining({ recipientUserId: 'social-user:backup-trail', handle: 'backup.trail' })],
        privacy: expect.objectContaining({ profileVisibility: 'private' }),
        activityPermissions: [expect.objectContaining({ friendHandle: 'backup.runner', sharingLevel: 'summary' })],
      });
      await expect(new DexieSocialIdentityRepository(target).readIdentity()).resolves.toMatchObject({
        userId: identity.userId,
        handle: 'backup.runner',
        displayName: 'Backup Runner',
      });
    } finally {
      source.close();
      target.close();
      await source.delete();
      await target.delete();
    }
  });
});
