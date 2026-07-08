import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  removeFriendFromSnapshot,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';

const snapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'social-user:lina' as EntityId,
      userId: 'social-user:lina' as EntityId,
      displayName: 'Lina Trail',
      handle: 'lina.trail',
      initials: 'LT',
    },
  ],
  requests: [
    {
      id: 'friend-request:social-user:lina->social-user:alex' as EntityId,
      requesterUserId: 'social-user:lina' as EntityId,
      recipientUserId: 'social-user:alex' as EntityId,
      displayName: 'Lina Trail',
      handle: 'lina.trail',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-08T10:00:00.000Z',
    },
    {
      id: 'friend-request:social-user:milo->social-user:alex' as EntityId,
      requesterUserId: 'social-user:milo' as EntityId,
      recipientUserId: 'social-user:alex' as EntityId,
      displayName: 'Milo Bike',
      handle: 'milo.bike',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-08T11:00:00.000Z',
    },
  ],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  activityPermissions: [
    {
      id: 'friend-activity-permission:social-user:lina' as EntityId,
      friendUserId: 'social-user:lina' as EntityId,
      friendHandle: 'lina.trail',
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
      detailedConsentGrantedAt: '2026-07-08T12:00:00.000Z',
    },
  ],
};

describe('friendship A19', () => {
  it('supprime un ami, ses permissions et ses demandes associées', () => {
    const result = removeFriendFromSnapshot(snapshot, 'social-user:lina' as EntityId);

    expect(result.friends).toEqual([]);
    expect(result.activityPermissions).toEqual([]);
    expect(result.requests).toEqual([
      expect.objectContaining({ requesterUserId: 'social-user:milo' }),
    ]);
  });
});
