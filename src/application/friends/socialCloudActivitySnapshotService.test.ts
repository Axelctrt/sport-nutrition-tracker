import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import type { SocialCloudActivitySnapshotPort } from '@/domain/friends/socialCloudContract';
import { createEmptyFriendsPrivacySnapshot } from '@/application/friends/friendsPrivacyService';
import {
  loadSocialCloudActivityFeed,
  publishSocialCloudActivitySnapshots,
} from '@/application/friends/socialCloudActivitySnapshotService';

const snapshot: SocialActivitySnapshot = {
  id: 'social-activity-snapshot:activity:run-1:friend:social-user:lina:summary' as EntityId,
  sourceActivityId: 'activity:run-1' as EntityId,
  friendId: 'social-user:lina' as EntityId,
  friendHandle: 'lina.trail',
  scope: 'summary',
  activityType: 'running',
  date: '2026-07-05',
  durationMinutes: 42,
  intensity: 'moderate',
  estimatedCaloriesKcal: 420,
  metrics: { distanceKm: 8.2 },
  createdAt: '2026-07-05T08:00:00.000Z',
  guardReason: 'Résumé filtré autorisé.',
};

function createPort(overrides: Partial<SocialCloudActivitySnapshotPort> = {}): SocialCloudActivitySnapshotPort {
  return {
    async publishSnapshots(_userId, snapshots) {
      return {
        status: 'created',
        value: snapshots,
        message: 'Snapshots sociaux cloud publiés.',
      };
    },
    async listFeedSnapshots() {
      return [];
    },
    ...overrides,
  };
}

describe('socialCloudActivitySnapshotService', () => {
  it('publie uniquement des snapshots filtrés via le port cloud', async () => {
    const result = await publishSocialCloudActivitySnapshots({
      userId: 'social-user:alex' as EntityId,
      snapshots: [snapshot],
      port: createPort(),
    });

    expect(result).toMatchObject({
      status: 'published',
      rawActivityShared: false,
      publishedSnapshots: [snapshot],
    });
  });

  it('garde un fallback indisponible sans publier de données', async () => {
    const result = await publishSocialCloudActivitySnapshots({
      userId: 'social-user:alex' as EntityId,
      snapshots: [snapshot],
      port: createPort({
        async publishSnapshots() {
          return { status: 'unavailable', message: 'Cloud social indisponible.' };
        },
      }),
    });

    expect(result).toEqual({
      status: 'unavailable',
      publishedSnapshots: [],
      rawActivityShared: false,
      message: 'Cloud social indisponible.',
    });
  });

  it('alimente le feed depuis les snapshots cloud filtrés', async () => {
    const privacySnapshot = {
      ...createEmptyFriendsPrivacySnapshot(),
      privacy: { profileVisibility: 'friends' as const, activitySharing: 'summary-only' as const, allowFriendRequests: true, requireManualApproval: true },
      friends: [{
        id: 'social-user:alex' as EntityId,
        userId: 'social-user:alex' as EntityId,
        displayName: 'Alex Run',
        handle: 'alex.run',
        initials: 'AR',
        acceptedAt: '2026-07-05T08:00:00.000Z',
      }],
    };

    const feed = await loadSocialCloudActivityFeed({
      userId: 'social-user:lina' as EntityId,
      privacySnapshot,
      port: createPort({
        async listFeedSnapshots() {
          return [{ ...snapshot, friendId: 'social-user:alex' as EntityId, friendHandle: 'alex.run' }];
        },
      }),
    });

    expect(feed.source).toBe('filtered-snapshots');
    expect(feed.rawActivityShared).toBe(false);
    expect(feed.items).toHaveLength(1);
  });
});
