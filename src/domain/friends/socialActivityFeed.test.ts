import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { buildSocialActivityFeed } from '@/domain/friends/socialActivityFeed';

const friend: FriendProfileSummary = {
  id: 'social-user:lea' as EntityId,
  userId: 'social-user:lea' as EntityId,
  displayName: 'Léa Cardio',
  handle: 'lea.cardio',
  initials: 'LC',
};

const detailedSnapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:run-1:lea:detailed' as EntityId,
  sourceActivityId: 'activity:private-run' as EntityId,
  friendId: friend.id,
  friendHandle: friend.handle,
  scope: 'detailed',
  activityType: 'running',
  date: '2026-07-08',
  durationMinutes: 52,
  intensity: 'moderate',
  estimatedCaloriesKcal: 510,
  createdAt: '2026-07-08T10:00:00.000Z',
  guardReason: 'Détail autorisé localement pour cet ami après consentement explicite.',
  metrics: {
    distanceKm: 9.4,
    elevationGainMeters: 180,
    sessionType: 'tempo',
    terrainType: 'trail',
  },
};

const baseSnapshot: FriendsPrivacySnapshot = {
  friends: [friend],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'detailed',
  },
};

function expectNoRawActivityLeak(value: unknown) {
  const serialized = JSON.stringify(value);

  for (const forbidden of [
    'sourceActivityId',
    'notes',
    'time',
    'rpe',
    'manualCaloriesKcal',
    'calculation',
    'averageCadenceSpm',
    'intervalDetails',
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

describe('social activity feed', () => {
  it('affiche un item détaillé uniquement lorsque la permission ami est explicite', () => {
    const privacySnapshot = updateFriendActivityPermission(
      baseSnapshot,
      friend.id,
      'detailed',
      '2026-07-08T09:00:00.000Z',
    );

    const feed = buildSocialActivityFeed(privacySnapshot, [detailedSnapshot]);

    expect(feed.status).toBe('ready');
    expect(feed.rawActivityShared).toBe(false);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({
      friendDisplayName: 'Léa Cardio',
      friendHandle: 'lea.cardio',
      scope: 'detailed',
      activityLabel: 'Course',
      metricLabels: ['9.4 km', 'D+ 180 m'],
      detailLabels: ['tempo', 'trail'],
    });
    expectNoRawActivityLeak(feed.items[0]);
  });

  it('dégrade un snapshot détaillé en résumé quand la permission est limitée', () => {
    const feed = buildSocialActivityFeed({
      ...baseSnapshot,
      privacy: {
        ...baseSnapshot.privacy,
        activitySharing: 'summary-only',
      },
    }, [detailedSnapshot]);

    expect(feed.status).toBe('ready');
    expect(feed.items[0]).toMatchObject({
      scope: 'summary',
      permissionLimited: true,
      detailLabels: [],
    });
    expectNoRawActivityLeak(feed.items[0]);
  });

  it('masque les cartes de l’ami réglé sur aucun partage', () => {
    const privacySnapshot = updateFriendActivityPermission(
      baseSnapshot,
      friend.id,
      'none',
      '2026-07-08T09:00:00.000Z',
    );

    const feed = buildSocialActivityFeed(privacySnapshot, [detailedSnapshot]);

    expect(feed).toMatchObject({
      status: 'empty',
      items: [],
      hiddenSnapshotCount: 1,
      rawActivityShared: false,
    });
  });

  it('retourne un état vide sans inventer d’activité', () => {
    const feed = buildSocialActivityFeed(baseSnapshot, []);

    expect(feed).toMatchObject({
      status: 'empty',
      items: [],
      hiddenSnapshotCount: 0,
      rawActivityShared: false,
    });
  });
});
