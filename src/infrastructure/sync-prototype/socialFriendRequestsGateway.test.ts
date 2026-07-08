import type { EntityId } from '@/domain/models/common';
import type { CloudFriendRequest } from '@/domain/friends/socialIdentity';
import { createSocialFriendRequestsClient } from '@/infrastructure/sync-prototype/socialFriendRequestsGateway';

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const baseRequest: CloudFriendRequest = {
  id: 'friend-request:social-user:alex->social-user:lina' as EntityId,
  requesterUserId: 'social-user:alex' as EntityId,
  recipientUserId: 'social-user:lina' as EntityId,
  status: 'pending',
  requestedAt: '2026-07-06T10:00:00.000Z',
  createdAt: '2026-07-06T10:00:00.000Z',
  updatedAt: '2026-07-06T10:00:00.000Z',
};

describe('socialFriendRequestsGateway', () => {
  it('envoie une demande via le serveur D1', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = createSocialFriendRequestsClient({
      endpoint: '/api/social-friend-requests',
      getCredentials: () => ({ userId: 'social-user:alex', accessToken: 'secret-token' }),
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse(201, {
          status: 'created',
          message: 'Demande d’ami cloud envoyée.',
          request: baseRequest,
        });
      },
    });

    await expect(client.sendRequest(baseRequest)).resolves.toMatchObject({
      status: 'created',
      value: expect.objectContaining({ recipientUserId: 'social-user:lina' }),
    });
    const sendCall = calls[0];
    expect(sendCall).toBeDefined();
    if (!sendCall) throw new Error('Appel serveur manquant.');
    expect(sendCall.url).toBe('/api/social-friend-requests/send');
    expect(sendCall.init?.headers).toMatchObject({
      authorization: 'Bearer secret-token',
    });
    expect(JSON.parse(String(sendCall.init?.body))).toMatchObject({
      requesterUserId: 'social-user:alex',
      recipientUserId: 'social-user:lina',
    });
  });

  it('liste les demandes entrantes', async () => {
    const client = createSocialFriendRequestsClient({
      endpoint: '/api/social-friend-requests',
      getCredentials: () => ({ userId: 'social-user:lina', accessToken: 'secret-token' }),
      fetcher: async () => jsonResponse(200, { status: 'found', requests: [baseRequest] }),
    });

    await expect(client.listIncomingRequests('social-user:lina' as EntityId)).resolves.toEqual([
      expect.objectContaining({ requesterUserId: 'social-user:alex' }),
    ]);
  });

  it('met à jour le statut serveur', async () => {
    const acceptedRequest = { ...baseRequest, status: 'accepted', respondedAt: '2026-07-06T11:00:00.000Z' };
    const client = createSocialFriendRequestsClient({
      endpoint: '/api/social-friend-requests',
      getCredentials: () => ({ userId: 'social-user:lina', accessToken: 'secret-token' }),
      fetcher: async () => jsonResponse(200, {
        status: 'updated',
        message: 'Demande cloud accepted.',
        request: acceptedRequest,
      }),
    });

    await expect(client.updateRequestStatus(
      baseRequest.id,
      'accepted',
      '2026-07-06T11:00:00.000Z',
    )).resolves.toMatchObject({ status: 'updated' });
  });

  it('reste indisponible sans endpoint', async () => {
    const client = createSocialFriendRequestsClient({ endpoint: '', fetcher: async () => jsonResponse(500, {}) });

    await expect(client.sendRequest(baseRequest)).resolves.toMatchObject({ status: 'unavailable' });
    await expect(client.listIncomingRequests('social-user:lina' as EntityId)).resolves.toEqual([]);
  });
});
