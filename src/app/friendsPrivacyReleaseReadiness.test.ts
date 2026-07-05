import {
  evaluateFriendActivitySharingGuard,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import {
  databaseSchemaVersion,
  databaseTableNames,
} from '@/infrastructure/database/schema';

const detailedSharingSnapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'friend:romain.run',
      displayName: 'Romain Run',
      handle: 'romain.run',
      initials: 'RR',
      connectedSince: '2026-07-05T08:00:00.000Z',
    },
  ],
  requests: [],
  privacy: {
    profileVisibility: 'friends',
    activitySharing: 'detailed',
    allowFriendRequests: true,
    requireManualApproval: true,
  },
};

describe('readiness amis et confidentialité 0.26.0', () => {
  it('conserve Dexie v9, sauvegarde JSON v8 et les tables sociales locales', () => {
    expect(databaseSchemaVersion).toBe(9);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(8);
    expect(databaseTableNames).toEqual(
      expect.arrayContaining([
        'friendProfiles',
        'friendRequests',
        'friendsPrivacySettings',
      ]),
    );
  });

  it('bloque le détail social tant que le consentement par ami n’est pas livré', () => {
    const guard = evaluateFriendActivitySharingGuard(detailedSharingSnapshot);

    expect(guard.allowedScope).toBe('summary');
    expect(guard.canShareSummary).toBe(true);
    expect(guard.canShareDetailed).toBe(false);
    expect(guard.detailedSharingBlocked).toBe(true);
    expect(guard.reason).toMatch(/bloqué jusqu’au consentement explicite/u);
  });
});
