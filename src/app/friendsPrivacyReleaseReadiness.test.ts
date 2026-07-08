import {
  evaluateFriendActivitySharingGuard,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { prepareSocialActivityFeed } from '@/application/friends/socialActivityFeedService';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
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

const socialSnapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:release:romain:summary',
  sourceActivityId: 'activity:release-private',
  friendId: 'friend:romain.run',
  friendHandle: 'romain.run',
  scope: 'summary',
  activityType: 'running',
  date: '2026-07-12',
  durationMinutes: 40,
  intensity: 'moderate',
  estimatedCaloriesKcal: 390,
  createdAt: '2026-07-12T10:00:00.000Z',
  guardReason: 'Résumé partagé par défaut. Le détail reste verrouillé pour cet ami.',
  metrics: {
    distanceKm: 7,
  },
};

describe('readiness sociale amis 0.27.0 F5', () => {
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

  it('ignore l’ancien réglage global et applique uniquement les permissions par ami', () => {
    const guard = evaluateFriendActivitySharingGuard(detailedSharingSnapshot);

    expect(guard.allowedScope).toBe('summary');
    expect(guard.canShareSummary).toBe(true);
    expect(guard.canShareDetailed).toBe(false);
    expect(guard.detailedSharingBlocked).toBe(true);
    expect(guard.reason).toMatch(/séparément pour chaque ami/u);
  });

  it('prépare le fil F5 sans exposer l’activité brute', () => {
    const feed = prepareSocialActivityFeed({
      privacySnapshot: {
        ...detailedSharingSnapshot,
        privacy: {
          ...detailedSharingSnapshot.privacy,
          activitySharing: 'summary-only',
        },
      },
      snapshots: [socialSnapshot],
    });

    expect(feed.source).toBe('filtered-snapshots');
    expect(feed.rawActivityShared).toBe(false);
    expect(feed.items).toHaveLength(1);
    expect(JSON.stringify(feed)).not.toContain('sourceActivityId');
  });
});
