import type { EntityId } from '@/domain/models/common';
import {
  socialActivityDetailMatchesFeedCard,
  type SocialActivityCloudFeedCard,
} from '@/domain/friends/socialActivityCloudFeed';
import { createActiveSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotFactory';

const snapshot = createActiveSocialActivitySnapshotV2({
  ownerUserId: 'owner-user' as EntityId,
  recipientUserId: 'friend-user' as EntityId,
  sourceKind: 'activity',
  sourceActivityId: 'activity-1' as EntityId,
  sourceRevision: 'revision-1',
  visibility: 'summary',
  family: 'cardio',
  activityType: 'running',
  occurredOn: '2026-07-08',
  allowedFields: {
    common: ['activityType', 'date', 'duration'],
    cardio: ['distance'],
    strength: [],
  },
  summary: { durationMinutes: 45, distanceKm: 8 },
  createdAt: '2026-07-08T08:00:00.000Z',
  updatedAt: '2026-07-08T08:00:00.000Z',
});

const card: SocialActivityCloudFeedCard = {
  ...snapshot,
  detailAvailable: false,
  ownerProfile: { userId: snapshot.ownerUserId },
};

describe('socialActivityDetailMatchesFeedCard', () => {
  it('accepte uniquement le snapshot correspondant exactement à la carte', () => {
    expect(socialActivityDetailMatchesFeedCard(card, snapshot)).toBe(true);
    expect(socialActivityDetailMatchesFeedCard(card, { ...snapshot, ownerUserId: 'other-owner' as EntityId })).toBe(false);
    expect(socialActivityDetailMatchesFeedCard(card, { ...snapshot, recipientUserId: 'other-friend' as EntityId })).toBe(false);
    expect(socialActivityDetailMatchesFeedCard(card, { ...snapshot, sourceActivityId: 'other-activity' as EntityId })).toBe(false);
  });
});
