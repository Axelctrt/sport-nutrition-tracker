import type { EntityId } from '@/domain/models/common';
import type { RunningActivity } from '@/domain/models/activity';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { createSocialActivitySnapshotForFriend } from '@/domain/friends/socialActivitySnapshot';
import { prepareSocialActivitySnapshots } from '@/application/friends/socialActivitySnapshotService';

const friend: FriendProfileSummary = {
  id: 'social-user:lea' as EntityId,
  userId: 'social-user:lea' as EntityId,
  displayName: 'Léa Cardio',
  handle: 'lea.cardio',
  initials: 'LC',
};

const activity: RunningActivity = {
  id: 'activity:f4-readiness' as EntityId,
  type: 'running',
  date: '2026-07-07',
  time: '06:45',
  durationMinutes: 42,
  intensity: 'moderate',
  notes: 'Note privée qui ne doit jamais sortir.',
  rpe: 6,
  manualCaloriesKcal: 430,
  createdAt: '2026-07-07T06:45:00.000Z',
  updatedAt: '2026-07-07T07:30:00.000Z',
  sessionType: 'easy',
  distanceKm: 7.4,
  averageCadenceSpm: 168,
  intervalDetails: 'Privé',
  calculation: {
    weightKg: 60,
    estimatedCaloriesKcal: 410,
    coefficientUsed: 1,
    calculationVersion: 1,
  },
};

const snapshot: FriendsPrivacySnapshot = updateFriendActivityPermission({
  friends: [friend],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'detailed',
  },
}, friend.id, 'detailed', '2026-07-07T06:00:00.000Z');

describe('readiness snapshots sociaux d’activité 0.27.0 F4', () => {
  it('génère un détail filtré seulement pour un ami autorisé', () => {
    const result = createSocialActivitySnapshotForFriend({
      activity,
      privacySnapshot: snapshot,
      friend,
      requestedScope: 'detailed',
      now: '2026-07-07T08:00:00.000Z',
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') throw new Error('snapshot attendu');
    expect(result.snapshot.scope).toBe('detailed');
    expect(JSON.stringify(result.snapshot)).not.toContain('Note privée');
    expect(JSON.stringify(result.snapshot)).not.toContain('averageCadenceSpm');
    expect(JSON.stringify(result.snapshot)).not.toContain('calculation');
  });

  it('prépare les snapshots sans fil, likes, commentaires ni export brut', () => {
    const result = prepareSocialActivitySnapshots({
      activity,
      privacySnapshot: snapshot,
    });

    expect(result.rawActivityShared).toBe(false);
    expect(result.snapshots).toHaveLength(1);
    expect(result.detailedCount).toBe(1);
    expect(result.summaryCount).toBe(0);
  });
});
