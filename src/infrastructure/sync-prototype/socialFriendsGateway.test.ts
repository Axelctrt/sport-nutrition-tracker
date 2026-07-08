import type { EntityId } from '@/domain/models/common';
import { createSocialFriendsGateway } from '@/infrastructure/sync-prototype/socialFriendsGateway';

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const credentials = { userId: 'social-user:alex', accessToken: 'secret-token' };

describe('socialFriendsGateway', () => {
  it('lit les amitiés serveur avec profils publics associés', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(200, {
        status: 'found',
        friendships: [{
          id: 'cloud-friendship:social-user:alex<->social-user:lina',
          userAId: 'social-user:alex',
          userBId: 'social-user:lina',
          status: 'active',
          createdAt: '2026-07-06T09:00:00.000Z',
          updatedAt: '2026-07-06T09:00:00.000Z',
        }],
        profiles: [{
          userId: 'social-user:lina',
          handle: 'lina.trail',
          displayName: 'Lina Trail',
          createdAt: '2026-07-06T08:00:00.000Z',
          updatedAt: '2026-07-06T08:30:00.000Z',
        }],
      }),
    });

    await expect(gateway.listFriendshipsWithProfiles('social-user:alex' as EntityId)).resolves.toMatchObject({
      status: 'synchronized',
      friendships: [expect.objectContaining({ status: 'active' })],
      profiles: [expect.objectContaining({ userId: 'social-user:lina', handle: 'lina.trail' })],
    });
  });

  it('sauvegarde une permission détaillée explicite côté serveur', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse(200, {
          status: 'updated',
          message: 'Permission ami serveur mise à jour.',
          permission: {
            id: 'cloud-friend-permission:social-user:alex->social-user:lina',
            friendUserId: 'social-user:lina',
            friendHandle: 'lina.trail',
            sharingLevel: 'detailed',
            detailedConsent: 'granted',
            detailedConsentGrantedAt: '2026-07-06T10:00:00.000Z',
            fieldSelection: {
              common: ['activityType', 'date', 'duration'],
              cardio: ['distance', 'pace'],
              strength: ['exercises', 'sets', 'repetitions'],
            },
          },
        });
      },
    });

    await expect(gateway.permissionPort.savePermission('social-user:alex' as EntityId, {
      id: 'cloud-friend-permission:social-user:alex->social-user:lina' as EntityId,
      friendUserId: 'social-user:lina' as EntityId,
      friendHandle: 'lina.trail',
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
      detailedConsentGrantedAt: '2026-07-06T10:00:00.000Z',
      fieldSelection: {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: ['exercises', 'sets', 'repetitions'],
      },
    })).resolves.toMatchObject({
      status: 'updated',
      value: expect.objectContaining({
        sharingLevel: 'detailed',
        detailedConsent: 'granted',
        fieldSelection: {
          common: ['activityType', 'date', 'duration'],
          cardio: ['distance', 'pace'],
          strength: ['exercises', 'sets', 'repetitions'],
        },
      }),
    });

    expect(calls[0]).toMatchObject({ url: '/api/social-friends/permissions/save' });
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: 'Bearer secret-token',
    });
    const requestBody = JSON.parse(String(calls[0]?.init?.body));
    expect(requestBody).toMatchObject({
      ownerUserId: 'social-user:alex',
      permission: expect.objectContaining({
        friendUserId: 'social-user:lina',
        sharingLevel: 'detailed',
        detailedConsent: 'granted',
        fieldSelection: {
          common: ['activityType', 'date', 'duration'],
          cardio: ['distance', 'pace'],
          strength: ['exercises', 'sets', 'repetitions'],
        },
      }),
    });
  });

  it('relit et normalise une sélection granulaire par ami', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(200, {
        status: 'found',
        permissions: [{
          id: 'cloud-friend-permission:social-user:alex->social-user:lina',
          friendUserId: 'social-user:lina',
          friendHandle: 'lina.trail',
          sharingLevel: 'detailed',
          detailedConsent: 'granted',
          fieldSelection: {
            common: ['duration'],
            cardio: ['distance'],
            strength: ['repetitions'],
          },
        }],
      }),
    });

    await expect(gateway.permissionPort.listPermissions(
      'social-user:alex' as EntityId,
    )).resolves.toMatchObject([{
      fieldSelection: {
        common: ['duration', 'activityType', 'date'],
        cardio: ['distance'],
        strength: ['repetitions', 'exercises', 'sets'],
      },
    }]);
  });

  it('accepte le niveau aucun partage renvoyé par le serveur', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(200, {
        status: 'found',
        permissions: [{
          id: 'cloud-friend-permission:social-user:alex->social-user:lina',
          friendUserId: 'social-user:lina',
          friendHandle: 'lina.trail',
          sharingLevel: 'none',
          detailedConsent: 'notRequested',
          fieldSelection: {
            common: ['activityType', 'title', 'date', 'duration'],
            cardio: ['distance'],
            strength: ['exercises', 'sets', 'repetitions'],
          },
        }],
      }),
    });

    await expect(gateway.permissionPort.listPermissions(
      'social-user:alex' as EntityId,
    )).resolves.toMatchObject([{
      sharingLevel: 'none',
      detailedConsent: 'notRequested',
    }]);
  });

  it('dégrade une sélection serveur invalide vers le résumé prudent', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(200, {
        status: 'found',
        permissions: [{
          id: 'cloud-friend-permission:social-user:alex->social-user:lina',
          friendUserId: 'social-user:lina',
          friendHandle: 'lina.trail',
          sharingLevel: 'summary',
          detailedConsent: 'notRequested',
          fieldSelection: {
            common: ['privateNotes'],
            cardio: [],
            strength: [],
          },
        }],
      }),
    });

    await expect(gateway.permissionPort.listPermissions(
      'social-user:alex' as EntityId,
    )).resolves.toMatchObject([{
      fieldSelection: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance'],
        strength: ['sessionName', 'muscleGroups', 'exerciseCount'],
      },
    }]);
  });

  it('dégrade silencieusement la lecture si le serveur est indisponible', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(503, { status: 'unavailable', message: 'KO' }),
    });

    await expect(gateway.listFriendshipsWithProfiles('social-user:alex' as EntityId)).resolves.toMatchObject({
      status: 'unavailable',
      friendships: [],
      profiles: [],
    });
    await expect(gateway.friendshipPort.listFriendships('social-user:alex' as EntityId)).resolves.toEqual([]);
    await expect(gateway.permissionPort.listPermissions('social-user:alex' as EntityId)).resolves.toEqual([]);
  });
});

it('supprime une amitié active côté serveur', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const gateway = createSocialFriendsGateway({
    endpoint: '/api/social-friends',
    getCredentials: () => credentials,
    fetcher: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(200, {
        status: 'updated',
        message: 'Ami supprimé. Les permissions associées ont été retirées.',
        friendship: {
          id: 'cloud-friendship:social-user:alex<->social-user:lina',
          userAId: 'social-user:alex',
          userBId: 'social-user:lina',
          status: 'removed',
          createdAt: '2026-07-08T10:00:00.000Z',
          updatedAt: '2026-07-08T11:00:00.000Z',
        },
      });
    },
  });

  await expect(gateway.removeFriendship?.(
    'social-user:alex' as EntityId,
    'social-user:lina' as EntityId,
  )).resolves.toMatchObject({
    status: 'updated',
    value: expect.objectContaining({ status: 'removed' }),
  });

  expect(calls[0]).toMatchObject({ url: '/api/social-friends/remove' });
  expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
    userId: 'social-user:alex',
    friendUserId: 'social-user:lina',
  });
});


describe('résilience A23 du gateway social', () => {
  it('distingue une liste de permissions vide valide d’une indisponibilité serveur', async () => {
    const synchronized = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(200, { status: 'found', permissions: [] }),
    });
    const unavailable = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(503, { status: 'unavailable', message: 'D1 indisponible' }),
    });

    await expect(synchronized.listPermissionsWithStatus?.(
      'social-user:alex' as EntityId,
    )).resolves.toEqual({ status: 'synchronized', permissions: [] });
    await expect(unavailable.listPermissionsWithStatus?.(
      'social-user:alex' as EntityId,
    )).resolves.toMatchObject({
      status: 'unavailable',
      permissions: [],
      message: 'D1 indisponible',
    });
  });

  it('refuse de considérer une réponse 200 mal formée comme une purge autoritaire', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => jsonResponse(200, { status: 'found' }),
    });

    await expect(gateway.listPermissionsWithStatus?.(
      'social-user:alex' as EntityId,
    )).resolves.toMatchObject({
      status: 'unavailable',
      permissions: [],
    });
    await expect(gateway.listFriendshipsWithProfiles(
      'social-user:alex' as EntityId,
    )).resolves.toMatchObject({
      status: 'unavailable',
      friendships: [],
      profiles: [],
    });
  });

  it('retourne des mutations indisponibles au lieu de propager une erreur réseau', async () => {
    const gateway = createSocialFriendsGateway({
      endpoint: '/api/social-friends',
      getCredentials: () => credentials,
      fetcher: async () => {
        throw new TypeError('offline');
      },
    });
    const permission = {
      id: 'cloud-friend-permission:social-user:alex->social-user:lina' as EntityId,
      friendUserId: 'social-user:lina' as EntityId,
      friendHandle: 'lina.trail',
      sharingLevel: 'summary' as const,
      detailedConsent: 'notRequested' as const,
    };

    await expect(gateway.permissionPort.savePermission(
      'social-user:alex' as EntityId,
      permission,
    )).resolves.toMatchObject({ status: 'unavailable' });
    await expect(gateway.removeFriendship?.(
      'social-user:alex' as EntityId,
      'social-user:lina' as EntityId,
    )).resolves.toMatchObject({ status: 'unavailable' });
  });
});
