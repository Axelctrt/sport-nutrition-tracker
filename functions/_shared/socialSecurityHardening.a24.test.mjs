import { describe, expect, it } from 'vitest';

import {
  handleSocialActivityFeedRequest,
} from './socialActivitySnapshots.js';
import {
  handleSocialDirectoryLookupRequest,
  handleSocialDirectoryReserveRequest,
} from './socialDirectory.js';
import {
  handleSocialFriendRequestIncomingRequest,
  handleSocialFriendRequestSendRequest,
  socialFriendRequestsInternals,
} from './socialFriendRequests.js';
import {
  handleSocialFriendsFriendshipsRequest,
  handleSocialFriendsPermissionSaveRequest,
} from './socialFriends.js';
import { socialIdentityReconciliationInternals } from './socialIdentityReconciliation.js';

function tokenForSubject(subject) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ sub: subject })}.signature`;
}

function authenticatedRequest(url, subject, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${tokenForSubject(subject)}`);
  return new Request(url, { ...init, headers });
}

const authFetcher = async (url) => {
  if (String(url).includes('/my/realActivities/')) {
    return new Response(null, { status: 404 });
  }
  throw new Error(`Unexpected auth request: ${String(url)}`);
};

const environment = {
  DEXIE_CLOUD_DATABASE_URL: 'https://example.dexie.cloud',
  SOCIAL_DIRECTORY_DB: {
    prepare() {
      throw new Error('D1 must not be reached by rejected requests.');
    },
  },
};

async function responsePayload(response) {
  return response.json();
}

describe('social security hardening A24', () => {
  it.each([
    ['directory lookup', handleSocialDirectoryLookupRequest, new Request('https://app.test/api/social-directory/lookup?handle=alex.run')],
    ['directory reserve', handleSocialDirectoryReserveRequest, new Request('https://app.test/api/social-directory/reserve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'owner@example.com', handle: 'alex.run', displayName: 'Alex' }),
    })],
    ['friend requests', handleSocialFriendRequestIncomingRequest, new Request('https://app.test/api/social-friend-requests/incoming?userId=owner@example.com')],
    ['friendships', handleSocialFriendsFriendshipsRequest, new Request('https://app.test/api/social-friends/friendships?userId=owner@example.com')],
    ['activity feed', handleSocialActivityFeedRequest, new Request('https://app.test/api/social-activity-feed')],
  ])('requires a verified bearer token for %s', async (_label, handler, request) => {
    const response = await handler(request, environment, { fetcher: authFetcher });
    const payload = await responsePayload(response);

    expect(response.status).toBe(401);
    expect(payload.code).toBe('SOCIAL_ACTIVITY_AUTH_REQUIRED');
  });

  it('rejects a directory reservation made for another account', async () => {
    const request = authenticatedRequest(
      'https://app.test/api/social-directory/reserve',
      'owner@example.com',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'victim@example.com',
          handle: 'alex.run',
          displayName: 'Alex',
        }),
      },
    );

    const response = await handleSocialDirectoryReserveRequest(
      request,
      environment,
      { fetcher: authFetcher },
    );
    const payload = await responsePayload(response);

    expect(response.status).toBe(403);
    expect(payload.code).toBe('SOCIAL_DIRECTORY_ACTOR_MISMATCH');
  });

  it('rejects reads and permission writes targeting another account', async () => {
    const friendshipsRequest = authenticatedRequest(
      'https://app.test/api/social-friends/friendships?userId=victim@example.com',
      'owner@example.com',
    );
    const friendshipsResponse = await handleSocialFriendsFriendshipsRequest(
      friendshipsRequest,
      environment,
      { fetcher: authFetcher },
    );

    const permissionRequest = authenticatedRequest(
      'https://app.test/api/social-friends/permissions/save',
      'owner@example.com',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ownerUserId: 'victim@example.com',
          permission: {
            friendUserId: 'friend@example.com',
            friendHandle: 'friend.run',
            sharingLevel: 'summary',
            detailedConsent: 'notRequested',
          },
        }),
      },
    );
    const permissionResponse = await handleSocialFriendsPermissionSaveRequest(
      permissionRequest,
      environment,
      { fetcher: authFetcher },
    );

    expect(friendshipsResponse.status).toBe(403);
    expect((await responsePayload(friendshipsResponse)).code).toBe('SOCIAL_FRIENDS_ACTOR_MISMATCH');
    expect(permissionResponse.status).toBe(403);
    expect((await responsePayload(permissionResponse)).code).toBe('SOCIAL_FRIENDS_ACTOR_MISMATCH');
  });

  it('rejects a friend request sent in another user name', async () => {
    const request = authenticatedRequest(
      'https://app.test/api/social-friend-requests/send',
      'owner@example.com',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requesterUserId: 'victim@example.com',
          recipientUserId: 'friend@example.com',
        }),
      },
    );

    const response = await handleSocialFriendRequestSendRequest(
      request,
      environment,
      { fetcher: authFetcher },
    );

    expect(response.status).toBe(403);
    expect((await responsePayload(response)).code).toBe('SOCIAL_FRIEND_REQUESTS_ACTOR_MISMATCH');
  });

  it('allows only the recipient to accept or decline and only the requester to cancel', async () => {
    const requestRow = {
      id: 'friend-request:requester@example.com->recipient@example.com',
      requester_user_id: 'requester@example.com',
      recipient_user_id: 'recipient@example.com',
      status: 'pending',
      requested_at: '2026-07-08T10:00:00.000Z',
      responded_at: null,
      created_at: '2026-07-08T10:00:00.000Z',
      updated_at: '2026-07-08T10:00:00.000Z',
    };
    const database = {
      prepare(sql) {
        return {
          bind() { return this; },
          async run() {
            if (/^\s*create /iu.test(sql)) return { success: true };
            throw new Error(`Unexpected write: ${sql}`);
          },
          async first() {
            if (sql.includes('FROM social_friend_requests')) return requestRow;
            throw new Error(`Unexpected read: ${sql}`);
          },
        };
      },
    };

    await expect(socialFriendRequestsInternals.updateFriendRequestStatus(
      database,
      { requestId: requestRow.id, status: 'accepted' },
      'requester@example.com',
    )).rejects.toMatchObject({
      status: 403,
      code: 'SOCIAL_FRIEND_REQUESTS_ACTION_FORBIDDEN',
    });

    await expect(socialFriendRequestsInternals.updateFriendRequestStatus(
      database,
      { requestId: requestRow.id, status: 'cancelled' },
      'recipient@example.com',
    )).rejects.toMatchObject({
      status: 403,
      code: 'SOCIAL_FRIEND_REQUESTS_ACTION_FORBIDDEN',
    });
  });

  it('does not trust client-controlled private objects as migration proof', async () => {
    const database = {
      prepare(sql) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes('FROM social_directory_handles')) return null;
            throw new Error(`Unexpected D1 read: ${sql}`);
          },
        };
      },
    };
    const fetcher = async (url) => {
      const target = String(url);
      if (target.includes('/my/socialHandleReservations/')) {
        return new Response(JSON.stringify({
          handle: 'alex.run',
          ownerUserId: 'sp-owned-by-current-user',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (target.includes('/my/socialIdentities/')) {
        return new Response(null, { status: 404 });
      }
      throw new Error(`Unexpected private read: ${target}`);
    };

    const { legacyIds } = await socialIdentityReconciliationInternals.discoverLegacyUserIds({
      database,
      canonicalUserId: 'owner@example.com',
      previousUserId: 'social-user:victim',
      handle: 'alex.run',
      databaseUrl: 'https://example.dexie.cloud',
      token: 'secret-token',
      fetcher,
    });

    expect([...legacyIds]).toEqual([]);
    expect(legacyIds.has('social-user:victim')).toBe(false);
  });

  it('rejects oversized social JSON bodies before reaching D1', async () => {
    const request = authenticatedRequest(
      'https://app.test/api/social-directory/reserve',
      'owner@example.com',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '32769',
        },
        body: JSON.stringify({
          userId: 'owner@example.com',
          handle: 'alex.run',
          displayName: 'Alex',
        }),
      },
    );

    const response = await handleSocialDirectoryReserveRequest(
      request,
      environment,
      { fetcher: authFetcher },
    );

    expect(response.status).toBe(413);
    expect((await responsePayload(response)).code).toBe('SOCIAL_DIRECTORY_PAYLOAD_TOO_LARGE');
  });

  it('allows the authorization header during API preflight', async () => {
    const response = await handleSocialFriendRequestIncomingRequest(
      new Request('https://app.test/api/social-friend-requests/incoming', { method: 'OPTIONS' }),
      {},
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toContain('authorization');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
