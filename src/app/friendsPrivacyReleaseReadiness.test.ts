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

describe('readiness permissions de partage par ami 0.27.0 F3', () => {
  it('passe Dexie en v10, sauvegarde JSON en v9 et expose les permissions par ami', () => {
    expect(databaseSchemaVersion).toBe(10);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(9);
    expect(databaseTableNames).toEqual(
      expect.arrayContaining([
        'friendProfiles',
        'friendRequests',
        'friendsPrivacySettings',
        'friendActivityPermissions',
      ]),
    );
  });

  it('conserve le garde-fou global même quand les snapshots sociaux filtrés sont livrés', () => {
    const guard = evaluateFriendActivitySharingGuard(detailedSharingSnapshot);

    expect(guard.allowedScope).toBe('summary');
    expect(guard.canShareSummary).toBe(true);
    expect(guard.canShareDetailed).toBe(false);
    expect(guard.detailedSharingBlocked).toBe(true);
    expect(guard.reason).toMatch(/Résumé autorisé par défaut/u);
  });
});
