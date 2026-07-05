import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { buildSocialActivityFeed } from '@/domain/friends/socialActivityFeed';
import { prepareSocialActivityFeed } from '@/application/friends/socialActivityFeedService';

const friend: FriendProfileSummary = {
  id: 'social-user:lea' as EntityId,
  userId: 'social-user:lea' as EntityId,
  displayName: 'Léa Cardio',
  handle: 'lea.cardio',
  initials: 'LC',
};

const snapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:f5:lea:detailed' as EntityId,
  sourceActivityId: 'activity:f5-private' as EntityId,
  friendId: friend.id,
  friendHandle: friend.handle,
  scope: 'detailed',
  activityType: 'running',
  date: '2026-07-10',
  durationMinutes: 48,
  intensity: 'moderate',
  estimatedCaloriesKcal: 480,
  createdAt: '2026-07-10T12:00:00.000Z',
  guardReason: 'Détail autorisé localement pour cet ami après consentement explicite.',
  metrics: {
    distanceKm: 8.8,
    elevationGainMeters: 140,
    sessionType: 'tempo',
    terrainType: 'trail',
  },
};

const privacySnapshot: FriendsPrivacySnapshot = updateFriendActivityPermission({
  friends: [friend],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'detailed',
  },
}, friend.id, 'detailed', '2026-07-10T11:00:00.000Z');

describe('readiness fil d’activité amis 0.27.0 F5', () => {
  it('lit uniquement des snapshots sociaux filtrés', () => {
    const feed = prepareSocialActivityFeed({
      privacySnapshot,
      snapshots: [snapshot],
    });

    expect(feed.source).toBe('filtered-snapshots');
    expect(feed.rawActivityShared).toBe(false);
    expect(feed.items).toHaveLength(1);
    expect(JSON.stringify(feed)).not.toContain('sourceActivityId');
    expect(JSON.stringify(feed)).not.toContain('activity:f5-private');
  });

  it('dégrade le détail si la permission ami ne le permet plus', () => {
    const feed = buildSocialActivityFeed({
      ...privacySnapshot,
      privacy: {
        ...privacySnapshot.privacy,
        activitySharing: 'summary-only',
      },
      activityPermissions: [],
    }, [snapshot]);

    expect(feed.status).toBe('ready');
    expect(feed.items[0]).toMatchObject({
      scope: 'summary',
      permissionLimited: true,
      detailLabels: [],
    });
  });
});
