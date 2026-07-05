import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { prepareSocialActivityFeed } from '@/application/friends/socialActivityFeedService';

const friend: FriendProfileSummary = {
  id: 'social-user:dina' as EntityId,
  userId: 'social-user:dina' as EntityId,
  displayName: 'Dina Detail',
  handle: 'dina.detail',
  initials: 'DD',
};

const snapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:ride-1:dina:detailed' as EntityId,
  sourceActivityId: 'activity:private-ride' as EntityId,
  friendId: friend.id,
  friendHandle: friend.handle,
  scope: 'detailed',
  activityType: 'cycling',
  date: '2026-07-09',
  durationMinutes: 75,
  intensity: 'high',
  estimatedCaloriesKcal: 740,
  createdAt: '2026-07-09T11:00:00.000Z',
  guardReason: 'Détail autorisé localement pour cet ami après consentement explicite.',
  metrics: {
    distanceKm: 32.5,
    elevationGainMeters: 420,
    bikeType: 'gravel',
    environment: 'outdoor',
  },
};

const privacySnapshot: FriendsPrivacySnapshot = updateFriendActivityPermission({
  friends: [friend],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'detailed',
  },
}, friend.id, 'detailed', '2026-07-09T10:00:00.000Z');

describe('socialActivityFeedService', () => {
  it('prépare un fil depuis des snapshots filtrés sans partager l’activité brute', () => {
    const feed = prepareSocialActivityFeed({
      privacySnapshot,
      snapshots: [snapshot],
    });

    expect(feed.source).toBe('filtered-snapshots');
    expect(feed.rawActivityShared).toBe(false);
    expect(feed.status).toBe('ready');
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({
      activityLabel: 'Vélo',
      scope: 'detailed',
      detailLabels: ['gravel', 'outdoor'],
    });
    expect(JSON.stringify(feed)).not.toContain('sourceActivityId');
  });
});
