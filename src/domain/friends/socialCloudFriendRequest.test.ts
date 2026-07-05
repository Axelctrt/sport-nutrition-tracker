import type { EntityId } from '@/domain/models/common';
import {
  assertSocialCloudFriendRequestContractIntegrity,
  buildCloudFriendRequest,
  cloudFriendRequestToLocalRequest,
  mergeCloudFriendRequestsIntoSnapshot,
  normalizeCloudFriendRequestForUser,
} from '@/domain/friends/socialCloudFriendRequest';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity, type PublicUserProfile } from '@/domain/friends/socialIdentity';

const identity = createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123');
const profile: PublicUserProfile = {
  userId: 'social-user:lina' as EntityId,
  handle: 'lina.trail',
  displayName: 'Lina Trail',
  createdAt: '2026-07-05T09:00:00.000Z',
  updatedAt: '2026-07-05T09:00:00.000Z',
};

const emptySnapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
};

describe('socialCloudFriendRequest', () => {
  it('construit une demande cloud basée sur les userId et non sur le handle', () => {
    const request = buildCloudFriendRequest(identity, profile, '2026-07-05T12:00:00.000Z');

    expect(request).toEqual({
      id: 'friend-request:social-user:alex123->social-user:lina',
      requesterUserId: identity.userId,
      recipientUserId: profile.userId,
      status: 'pending',
      requestedAt: '2026-07-05T12:00:00.000Z',
      createdAt: '2026-07-05T12:00:00.000Z',
      updatedAt: '2026-07-05T12:00:00.000Z',
    });
  });

  it('refuse de construire une demande cloud vers soi-même', () => {
    expect(() => buildCloudFriendRequest(identity, {
      userId: identity.userId,
      handle: identity.handle,
      displayName: identity.displayName,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    })).toThrow('soi-même');
  });

  it('normalise les demandes entrantes et sortantes pour le compte courant', () => {
    const request = buildCloudFriendRequest(identity, profile, '2026-07-05T12:00:00.000Z');

    expect(normalizeCloudFriendRequestForUser(request, identity.userId)).toMatchObject({
      direction: 'outgoing',
      counterpartUserId: profile.userId,
      createsFriendship: false,
      exposesRawActivity: false,
      relationshipKey: 'userId',
    });

    expect(normalizeCloudFriendRequestForUser(request, profile.userId as EntityId)).toMatchObject({
      direction: 'incoming',
      counterpartUserId: identity.userId,
      relationshipKey: 'userId',
    });
  });

  it('ignore une demande cloud qui ne concerne pas le compte courant', () => {
    const request = buildCloudFriendRequest(identity, profile, '2026-07-05T12:00:00.000Z');

    expect(normalizeCloudFriendRequestForUser(request, 'social-user:other' as EntityId)).toBeUndefined();
  });

  it('convertit une demande cloud en demande locale sans exposer de données brutes', () => {
    const request = buildCloudFriendRequest(identity, profile, '2026-07-05T12:00:00.000Z');
    const report = normalizeCloudFriendRequestForUser(request, profile.userId as EntityId);
    expect(report).toBeDefined();

    const localRequest = cloudFriendRequestToLocalRequest(report!, {
      userId: identity.userId,
      handle: identity.handle,
      displayName: identity.displayName,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    });

    expect(localRequest).toMatchObject({
      id: request.id,
      requesterUserId: identity.userId,
      recipientUserId: profile.userId,
      direction: 'incoming',
      status: 'pending',
      handle: identity.handle,
      displayName: identity.displayName,
    });
  });

  it('fusionne les demandes cloud sans dupliquer les ids locaux', () => {
    const request = buildCloudFriendRequest(identity, profile, '2026-07-05T12:00:00.000Z');
    const report = normalizeCloudFriendRequestForUser(request, identity.userId);
    const localRequest = cloudFriendRequestToLocalRequest(report!, profile);

    const merged = mergeCloudFriendRequestsIntoSnapshot({
      ...emptySnapshot,
      requests: [localRequest],
    }, [{ ...localRequest, status: 'cancelled' }]);

    expect(merged.requests).toHaveLength(1);
    expect(merged.requests[0]?.status).toBe('cancelled');
  });

  it('valide l’intégrité du contrat F4', () => {
    expect(assertSocialCloudFriendRequestContractIntegrity()).toBe(true);
  });
});
