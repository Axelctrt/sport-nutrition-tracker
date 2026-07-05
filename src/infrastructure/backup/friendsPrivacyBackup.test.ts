import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { createBackupEnvelope, replaceDatabaseFromBackup } from '@/infrastructure/backup/backupService';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, FRIENDS_PRIVACY_SETTINGS_ID, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { EntityId } from '@/domain/models/common';

function createDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-friends-backup-${crypto.randomUUID()}`);
}

const snapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'friend:backup' as EntityId,
      displayName: 'Backup Runner',
      handle: 'backup.runner',
      initials: 'BR',
      connectedSince: '2026-07-05T09:00:00.000Z',
    },
  ],
  requests: [
    {
      id: 'friend-request:backup.trail' as EntityId,
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
  it('exporte et restaure les tables amis avec le format JSON v8', async () => {
    const source = createDatabase();
    const target = createDatabase();

    try {
      await source.open();
      await target.open();
      await new DexieFriendsPrivacyRepository(source).saveSnapshot(snapshot);

      const envelope = await createBackupEnvelope(source, '2026-07-05T10:30:00.000Z');

      expect(envelope.schemaVersion).toBe(8);
      expect(envelope.data.friendProfiles).toEqual([
        expect.objectContaining({ handle: 'backup.runner' }),
      ]);
      expect(envelope.data.friendRequests).toEqual([
        expect.objectContaining({ handle: 'backup.trail', status: 'pending' }),
      ]);
      expect(envelope.data.friendsPrivacySettings).toEqual([
        expect.objectContaining({
          id: FRIENDS_PRIVACY_SETTINGS_ID,
          profileVisibility: 'private',
        }),
      ]);

      await replaceDatabaseFromBackup(envelope, target);

      await expect(new DexieFriendsPrivacyRepository(target).readSnapshot()).resolves.toMatchObject({
        friends: [expect.objectContaining({ handle: 'backup.runner' })],
        requests: [expect.objectContaining({ handle: 'backup.trail' })],
        privacy: expect.objectContaining({ profileVisibility: 'private' }),
      });
    } finally {
      source.close();
      target.close();
      await source.delete();
      await target.delete();
    }
  });
});
