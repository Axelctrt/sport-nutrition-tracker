import {
  compareSocialActivityFeedCards,
  normalizeSocialActivityFeedCards,
  socialActivityDetailMatchesFeedCard,
  socialActivityFeedCardsHaveSameVisibleRevision,
  type SocialActivityCloudFeedCard,
} from '@/domain/friends/socialActivityCloudFeed';
import type { ActiveSocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshotContract';

function card(overrides: Partial<SocialActivityCloudFeedCard> = {}): SocialActivityCloudFeedCard {
  return {
    contractVersion: '0.29.0-a3',
    snapshotId: 'snapshot-1',
    ownerUserId: 'owner-user',
    recipientUserId: 'friend-user',
    sourceKind: 'activity',
    sourceActivityId: 'activity-1',
    sourceRevision: 'revision-1',
    createdAt: '2026-07-07T10:00:00.000Z',
    updatedAt: '2026-07-07T10:00:00.000Z',
    state: 'active',
    visibility: 'summary',
    family: 'cardio',
    activityType: 'running',
    title: 'Course du matin',
    occurredOn: '2026-07-07',
    occurredTime: '08:00',
    allowedFields: {
      common: ['activityType', 'title', 'date', 'duration'],
      cardio: ['distance'],
      strength: [],
    },
    summary: { durationMinutes: 42, distanceKm: 8 },
    detailAvailable: false,
    ownerProfile: { userId: 'owner-user' },
    ...overrides,
  };
}

describe('socialActivityCloudFeed', () => {
  it('trie les cartes par date réelle puis de manière déterministe', () => {
    const newest = card({ snapshotId: 'snapshot-new', occurredOn: '2026-07-08' });
    const sameDayLater = card({ snapshotId: 'snapshot-later', occurredTime: '09:00' });
    const sameDayEarlier = card({ snapshotId: 'snapshot-earlier', occurredTime: '07:00' });

    const sorted = [sameDayEarlier, newest, sameDayLater].sort(compareSocialActivityFeedCards);

    expect(sorted.map((item) => item.snapshotId)).toEqual([
      'snapshot-new',
      'snapshot-later',
      'snapshot-earlier',
    ]);
  });

  it('ne remonte pas une activité dans le fil uniquement parce qu’elle a été modifiée', () => {
    const { occurredTime: _earlierTime, ...earlierBase } = card({
      snapshotId: 'snapshot-earlier',
      createdAt: '2026-07-07T08:00:00.000Z',
      updatedAt: '2026-07-07T12:00:00.000Z',
    });
    const { occurredTime: _laterTime, ...laterBase } = card({
      snapshotId: 'snapshot-later',
      createdAt: '2026-07-07T09:00:00.000Z',
      updatedAt: '2026-07-07T09:00:00.000Z',
    });
    const earlierEdited: SocialActivityCloudFeedCard = earlierBase;
    const later: SocialActivityCloudFeedCard = laterBase;

    expect([earlierEdited, later].sort(compareSocialActivityFeedCards).map((item) => item.snapshotId))
      .toEqual(['snapshot-later', 'snapshot-earlier']);
  });

  it('déduplique les snapshots et conserve la révision la plus récente', () => {
    const original = card();
    const updated = card({
      sourceRevision: 'revision-2',
      updatedAt: '2026-07-07T11:00:00.000Z',
      title: 'Course modifiée',
    });

    const normalized = normalizeSocialActivityFeedCards([original, updated, original]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      sourceRevision: 'revision-2',
      title: 'Course modifiée',
    });
  });

  it('détecte un changement de contenu visible sans changer l’activité source', () => {
    const summary = card();
    const personalized = card({
      visibility: 'detailed',
      detailAvailable: true,
      allowedFields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: [],
      },
      summary: { durationMinutes: 42, distanceKm: 8, paceMinutesPerKm: 5.25 },
    });

    expect(socialActivityFeedCardsHaveSameVisibleRevision(summary, summary)).toBe(true);
    expect(socialActivityFeedCardsHaveSameVisibleRevision(summary, personalized)).toBe(false);
  });

  it('refuse un détail provenant d’une ancienne révision ou d’une autre portée', () => {
    const feedCard = card({ visibility: 'detailed', detailAvailable: true });
    const detail: ActiveSocialActivitySnapshot = {
      ...feedCard,
      detail: { family: 'cardio' },
    };

    expect(socialActivityDetailMatchesFeedCard(feedCard, detail)).toBe(true);
    expect(socialActivityDetailMatchesFeedCard(feedCard, {
      ...detail,
      sourceRevision: 'revision-old',
    })).toBe(false);
    expect(socialActivityDetailMatchesFeedCard(feedCard, {
      ...detail,
      visibility: 'summary',
    })).toBe(false);
  });
});
