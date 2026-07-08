import type { EntityId } from '@/domain/models/common';
import { createSocialFriendRequestsClient } from '@/infrastructure/sync-prototype/socialFriendRequestsGateway';

function response(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('socialFriendRequestsGateway A17', () => {
  it('retourne le profil public du correspondant', async () => {
    const client = createSocialFriendRequestsClient({
      endpoint: '/api/social-friend-requests',
      fetcher: async () => response(200, {
        status: 'found',
        requests: [{
          id: 'friend-request:alex@example.com->lina@example.com', requesterUserId: 'alex@example.com',
          recipientUserId: 'lina@example.com', status: 'pending', requestedAt: '2026-07-08T10:00:00.000Z',
          createdAt: '2026-07-08T10:00:00.000Z', updatedAt: '2026-07-08T10:00:00.000Z',
        }],
        profiles: [{ userId: 'alex@example.com', handle: 'alex.run', displayName: 'Alex Run',
          createdAt: '2026-07-07T10:00:00.000Z', updatedAt: '2026-07-08T10:00:00.000Z' }],
      }),
    });

    await expect(client.listIncomingRequestsWithProfiles('lina@example.com' as EntityId)).resolves.toMatchObject({
      status: 'synchronized', profiles: [expect.objectContaining({ handle: 'alex.run', displayName: 'Alex Run' })],
    });
  });

  it('distingue une panne serveur d’une liste vide', async () => {
    const client = createSocialFriendRequestsClient({
      endpoint: '/api/social-friend-requests',
      fetcher: async () => response(503, { status: 'unavailable', message: 'Backend indisponible.' }),
    });
    await expect(client.listIncomingRequestsWithProfiles('lina@example.com' as EntityId)).rejects.toThrow('Backend indisponible');
  });
});
