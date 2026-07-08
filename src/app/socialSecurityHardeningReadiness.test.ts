import activitySource from '@/../functions/_shared/socialActivitySnapshots.js?raw';
import directorySource from '@/../functions/_shared/socialDirectory.js?raw';
import friendRequestsSource from '@/../functions/_shared/socialFriendRequests.js?raw';
import friendsSource from '@/../functions/_shared/socialFriends.js?raw';
import reconciliationSource from '@/../functions/_shared/socialIdentityReconciliation.js?raw';
import credentialsSource from '@/infrastructure/sync-prototype/socialCloudApiCredentials.ts?raw';
import directoryGatewaySource from '@/infrastructure/sync-prototype/socialDirectoryGateway.ts?raw';
import friendRequestsGatewaySource from '@/infrastructure/sync-prototype/socialFriendRequestsGateway.ts?raw';
import friendsGatewaySource from '@/infrastructure/sync-prototype/socialFriendsGateway.ts?raw';

describe('social security hardening readiness 0.29.0 A24', () => {
  it('authenticates every social API family with the verified cloud bearer token', () => {
    expect(activitySource).toContain('async function authenticateRequest');
    expect(directorySource).toContain('authenticateRequest');
    expect(friendRequestsSource).toContain('authenticateRequest');
    expect(friendsSource).toContain('authenticateRequest');
    expect(reconciliationSource).toContain('authenticateRequest');
  });

  it('binds reads and mutations to the authenticated actor', () => {
    expect(directorySource).toContain('SOCIAL_DIRECTORY_ACTOR_MISMATCH');
    expect(friendRequestsSource).toContain('SOCIAL_FRIEND_REQUESTS_ACTOR_MISMATCH');
    expect(friendRequestsSource).toContain('SOCIAL_FRIEND_REQUESTS_ACTION_FORBIDDEN');
    expect(friendsSource).toContain('SOCIAL_FRIENDS_ACTOR_MISMATCH');
    expect(friendsSource).toContain('SOCIAL_FRIENDS_PERMISSION_ID_MISMATCH');
    expect(friendsSource).toContain('SOCIAL_FRIENDS_FRIENDSHIP_ID_MISMATCH');
  });

  it('sends authenticated requests from every client gateway', () => {
    expect(credentialsSource).toContain('authorization: `Bearer ${credentials.accessToken}`');
    expect(directoryGatewaySource).toContain('socialCloudApiHeaders(credentials');
    expect(friendRequestsGatewaySource).toContain('socialCloudApiHeaders(credentials');
    expect(friendsGatewaySource).toContain('socialCloudApiHeaders(credentials');
  });

  it('limits and sanitizes public social inputs', () => {
    expect(directorySource).toContain('MAX_JSON_BYTES');
    expect(friendRequestsSource).toContain('MAX_JSON_BYTES');
    expect(friendsSource).toContain('MAX_JSON_BYTES');
    expect(reconciliationSource).toContain('MAX_JSON_BYTES');
    expect(directorySource).toContain("replace(/[\\p{Cc}\\p{Cf}]/gu, '')");
    expect(friendsSource).toContain("handle: 'sportpilot-friend'");
    expect(friendRequestsSource).toContain("handle: 'sportpilot-user'");
  });

  it('requires direct ownership proof before reconciling a legacy identity', () => {
    expect(reconciliationSource).toContain('privateIdentity.userId === previousUserId');
    expect(reconciliationSource).toContain('existingHandle?.owner_user_id === previousUserId');
    expect(reconciliationSource).not.toContain('legacyIds.size > 0 || existingHandle?.owner_user_id === previousUserId');
  });
});
