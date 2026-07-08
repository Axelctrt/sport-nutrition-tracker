import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  acceptFriendRequest,
  declineFriendRequest,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';

const request = {
  id: 'friend-request:alex->lina' as EntityId,
  requesterUserId: 'social-user:alex' as EntityId,
  recipientUserId: 'social-user:lina' as EntityId,
  displayName: 'Alex Run',
  handle: 'alex.run',
  direction: 'incoming' as const,
  status: 'pending' as const,
  requestedAt: '2026-07-08T10:00:00.000Z',
};
const snapshot: FriendsPrivacySnapshot = {
  friends: [], requests: [request], privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS, activityPermissions: [],
};

describe('friendship A17', () => {
  it('retire immédiatement une demande acceptée', () => {
    const result = acceptFriendRequest(snapshot, request.id);
    expect(result.requests).toEqual([]);
    expect(result.friends).toHaveLength(1);
  });
  it('retire immédiatement une demande refusée', () => {
    const result = declineFriendRequest(snapshot, request.id);
    expect(result.requests).toEqual([]);
    expect(result.friends).toEqual([]);
  });
});
