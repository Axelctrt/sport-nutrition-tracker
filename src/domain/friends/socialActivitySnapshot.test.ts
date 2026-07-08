import type { EntityId } from '@/domain/models/common';
import type { RunningActivity } from '@/domain/models/activity';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import {
  createSocialActivitySnapshotForFriend,
  createSocialActivitySnapshotsForFriends,
} from '@/domain/friends/socialActivitySnapshot';

const friend: FriendProfileSummary = {
  id: 'social-user:lea' as EntityId,
  userId: 'social-user:lea' as EntityId,
  displayName: 'Léa Cardio',
  handle: 'lea.cardio',
  initials: 'LC',
};

const activity: RunningActivity = {
  id: 'activity:run-1' as EntityId,
  type: 'running',
  date: '2026-07-05',
  time: '18:30',
  durationMinutes: 47,
  intensity: 'moderate',
  rpe: 7,
  notes: 'Point de côté au km 6, données privées.',
  manualCaloriesKcal: 499,
  createdAt: '2026-07-05T18:30:00.000Z',
  updatedAt: '2026-07-05T19:20:00.000Z',
  sessionType: 'tempo',
  distanceKm: 8.234,
  averageCadenceSpm: 174,
  elevationGainMeters: 123.4,
  terrainType: 'trail',
  intervalDetails: '3 × 8 min tempo',
  calculation: {
    weightKg: 60,
    estimatedCaloriesKcal: 470,
    coefficientUsed: 1,
    calculationVersion: 1,
  },
};

const baseSnapshot: FriendsPrivacySnapshot = {
  friends: [friend],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'summary-only',
  },
};

function expectNoRawActivityLeak(value: unknown) {
  const serialized = JSON.stringify(value);

  for (const forbidden of [
    'notes',
    'time',
    'rpe',
    'manualCaloriesKcal',
    'calculation',
    'weightKg',
    'coefficientUsed',
    'averageCadenceSpm',
    'intervalDetails',
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

describe('social activity snapshots', () => {
  it('génère un snapshot résumé par défaut sans fuite de champs bruts', () => {
    const result = createSocialActivitySnapshotForFriend({
      activity,
      privacySnapshot: baseSnapshot,
      friend,
      requestedScope: 'detailed',
      now: '2026-07-05T20:00:00.000Z',
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') throw new Error('snapshot attendu');
    expect(result.downgradedToSummary).toBe(true);
    expect(result.snapshot).toMatchObject({
      sourceActivityId: activity.id,
      friendId: friend.userId,
      friendHandle: 'lea.cardio',
      scope: 'summary',
      activityType: 'running',
      date: '2026-07-05',
      durationMinutes: 47,
      estimatedCaloriesKcal: 499,
      metrics: {
        distanceKm: 8.2,
        elevationGainMeters: 123,
      },
    });
    expectNoRawActivityLeak(result.snapshot);
  });

  it('autorise le détail uniquement pour un ami avec consentement explicite', () => {
    const detailedSnapshot = updateFriendActivityPermission({
      ...baseSnapshot,
      privacy: {
        ...baseSnapshot.privacy,
        activitySharing: 'detailed',
      },
    }, friend.id, 'detailed', '2026-07-05T19:00:00.000Z');

    const result = createSocialActivitySnapshotForFriend({
      activity,
      privacySnapshot: detailedSnapshot,
      friend,
      requestedScope: 'detailed',
      now: '2026-07-05T20:00:00.000Z',
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') throw new Error('snapshot attendu');
    expect(result.downgradedToSummary).toBe(false);
    expect(result.snapshot).toMatchObject({
      scope: 'detailed',
      metrics: {
        distanceKm: 8.2,
        elevationGainMeters: 123,
        sessionType: 'tempo',
        terrainType: 'trail',
      },
    });
    expectNoRawActivityLeak(result.snapshot);
  });

  it('bloque toute création lorsque cet ami est réglé sur aucun partage', () => {
    const privacySnapshot = updateFriendActivityPermission(
      baseSnapshot,
      friend.id,
      'none',
      '2026-07-05T19:00:00.000Z',
    );

    const result = createSocialActivitySnapshotForFriend({
      activity,
      privacySnapshot,
      friend,
    });

    expect(result).toMatchObject({
      status: 'blocked',
      allowedScope: 'none',
    });
  });

  it('prépare un résultat par ami sans créer de fil social', () => {
    const results = createSocialActivitySnapshotsForFriends(
      activity,
      baseSnapshot,
      'summary',
      '2026-07-05T20:00:00.000Z',
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: 'created' });
  });
});
