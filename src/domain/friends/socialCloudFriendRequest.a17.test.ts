import type { EntityId } from '@/domain/models/common';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { synchronizeCloudFriendRequestsIntoSnapshot } from '@/domain/friends/socialCloudFriendRequest';

describe('socialCloudFriendRequest A17', () => {
  it('remplace le cache local par les seules demandes pending du serveur', () => {
    const snapshot: FriendsPrivacySnapshot = {
      friends: [],
      requests: [{
        id: 'friend-request:legacy->me' as EntityId,
        requesterUserId: 'social-user:legacy' as EntityId,
        recipientUserId: 'me@example.com' as EntityId,
        displayName: '@userlegacy',
        handle: 'userlegacy',
        direction: 'incoming',
        status: 'accepted',
        requestedAt: '2026-07-01T10:00:00.000Z',
      }],
      privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
      activityPermissions: [],
    };

    const synchronized = synchronizeCloudFriendRequestsIntoSnapshot(snapshot, [{
      id: 'friend-request:new->me' as EntityId,
      requesterUserId: 'new@example.com' as EntityId,
      recipientUserId: 'me@example.com' as EntityId,
      displayName: 'Nouveau Profil',
      handle: 'nouveau.profil',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-08T10:00:00.000Z',
    }]);

    expect(synchronized.requests).toEqual([
      expect.objectContaining({ id: 'friend-request:new->me', handle: 'nouveau.profil', status: 'pending' }),
    ]);
  });
});
