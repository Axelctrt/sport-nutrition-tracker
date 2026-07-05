import type { EntityId } from '@/domain/models/common';
import { sendExactFriendRequest } from '@/application/friends/socialFriendRequestService';
import { createFoundSocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity, type PublicUserProfile } from '@/domain/friends/socialIdentity';

const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');
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

describe('socialFriendRequestService', () => {
  it('envoie une demande vers un profil réel trouvé par recherche exacte', async () => {
    const result = await sendExactFriendRequest({
      snapshot: emptySnapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
      now: '2026-07-05T12:00:00.000Z',
    });

    expect(result.status).toBe('sent');
    expect(result.snapshot.requests).toEqual([
      expect.objectContaining({
        requesterUserId: identity.userId,
        recipientUserId: profile.userId,
        handle: 'lina.trail',
        direction: 'outgoing',
        status: 'pending',
      }),
    ]);
  });

  it('retourne identifiant inexistant lorsque la recherche exacte ne trouve personne', async () => {
    const result = await sendExactFriendRequest({
      snapshot: emptySnapshot,
      identity,
      handle: '@ghost.run',
      lookupGateway: createFoundSocialUserLookupGateway([]),
    });

    expect(result).toMatchObject({ status: 'notFound', message: 'Identifiant inexistant.' });
    expect(result.snapshot).toBe(emptySnapshot);
  });

  it('bloque une demande vers soi-même', async () => {
    const result = await sendExactFriendRequest({
      snapshot: emptySnapshot,
      identity,
      handle: '@sp-alex123',
      lookupGateway: createFoundSocialUserLookupGateway([
        {
          userId: identity.userId,
          handle: identity.handle,
          displayName: identity.displayName,
          createdAt: identity.createdAt,
          updatedAt: identity.updatedAt,
        },
      ]),
    });

    expect(result.status).toBe('self');
    expect(result.message).toContain('toi-même');
  });

  it('bloque un ami déjà accepté', async () => {
    const snapshot: FriendsPrivacySnapshot = {
      ...emptySnapshot,
      friends: [
        {
          id: profile.userId as EntityId,
          userId: profile.userId as EntityId,
          displayName: profile.displayName,
          handle: profile.handle,
          initials: 'LT',
        },
      ],
    };

    const result = await sendExactFriendRequest({
      snapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
    });

    expect(result.status).toBe('alreadyFriend');
  });

  it('bloque une demande déjà envoyée', async () => {
    const first = await sendExactFriendRequest({
      snapshot: emptySnapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
    });
    const duplicate = await sendExactFriendRequest({
      snapshot: first.snapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
    });

    expect(duplicate.status).toBe('alreadySent');
    expect(duplicate.snapshot.requests).toHaveLength(1);
  });

  it('bloque une demande déjà reçue', async () => {
    const snapshot: FriendsPrivacySnapshot = {
      ...emptySnapshot,
      requests: [
        {
          id: 'friend-request:lina->alex' as EntityId,
          requesterUserId: profile.userId as EntityId,
          recipientUserId: identity.userId,
          displayName: profile.displayName,
          handle: profile.handle,
          direction: 'incoming',
          status: 'pending',
          requestedAt: '2026-07-05T11:00:00.000Z',
        },
      ],
    };

    const result = await sendExactFriendRequest({
      snapshot,
      identity,
      handle: '@lina.trail',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
    });

    expect(result.status).toBe('alreadyReceived');
  });
});
