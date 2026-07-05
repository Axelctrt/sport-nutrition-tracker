import type { EntityId } from '@/domain/models/common';
import type { RunningActivity } from '@/domain/models/activity';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { prepareSocialActivitySnapshots } from '@/application/friends/socialActivitySnapshotService';

const friendSummary: FriendProfileSummary = {
  id: 'social-user:summary' as EntityId,
  userId: 'social-user:summary' as EntityId,
  displayName: 'Sam Summary',
  handle: 'sam.summary',
  initials: 'SS',
};

const friendDetailed: FriendProfileSummary = {
  id: 'social-user:detailed' as EntityId,
  userId: 'social-user:detailed' as EntityId,
  displayName: 'Dina Detail',
  handle: 'dina.detail',
  initials: 'DD',
};

const activity: RunningActivity = {
  id: 'activity:run-2' as EntityId,
  type: 'running',
  date: '2026-07-06',
  durationMinutes: 62,
  intensity: 'high',
  createdAt: '2026-07-06T07:00:00.000Z',
  updatedAt: '2026-07-06T08:05:00.000Z',
  sessionType: 'intervals',
  distanceKm: 11.02,
  averageCadenceSpm: 181,
  calculation: {
    weightKg: 60,
    estimatedCaloriesKcal: 650,
    calculationVersion: 1,
  },
};

const baseSnapshot: FriendsPrivacySnapshot = {
  friends: [friendSummary, friendDetailed],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'detailed',
  },
};

describe('socialActivitySnapshotService', () => {
  it('prépare des snapshots filtrés et distingue résumé/détail selon permission ami', () => {
    const privacySnapshot = updateFriendActivityPermission(
      baseSnapshot,
      friendDetailed.id,
      'detailed',
      '2026-07-06T06:00:00.000Z',
    );

    const result = prepareSocialActivitySnapshots({
      activity,
      privacySnapshot,
      requestedScope: 'detailed',
      now: '2026-07-06T09:00:00.000Z',
    });

    expect(result.rawActivityShared).toBe(false);
    expect(result.snapshots).toHaveLength(2);
    expect(result.summaryCount).toBe(1);
    expect(result.detailedCount).toBe(1);
    expect(result.blocked).toHaveLength(0);
    expect(result.snapshots.map((snapshot) => snapshot.scope).sort()).toEqual(['detailed', 'summary']);
  });

  it('renvoie des blocages sans snapshot quand le partage est désactivé', () => {
    const result = prepareSocialActivitySnapshots({
      activity,
      privacySnapshot: {
        ...baseSnapshot,
        privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
      },
    });

    expect(result.rawActivityShared).toBe(false);
    expect(result.snapshots).toHaveLength(0);
    expect(result.blocked).toHaveLength(2);
  });
});
