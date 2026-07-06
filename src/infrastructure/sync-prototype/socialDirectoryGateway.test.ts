import type { EntityId } from '@/domain/models/common';
import { createDefaultSocialIdentity, updateSocialIdentity } from '@/domain/friends/socialIdentity';
import { createSocialDirectoryClient } from '@/infrastructure/sync-prototype/socialDirectoryGateway';

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('socialDirectoryGateway', () => {
  it('rÃ©serve une identitÃ© via lâ€™annuaire serveur configurÃ©', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = createSocialDirectoryClient({
      endpoint: '/api/social-directory',
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse(201, {
          status: 'created',
          message: 'Identifiant social rÃ©servÃ© dans lâ€™annuaire serveur.',
        });
      },
    });
    const identity = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123'),
      { handle: '@alex.run', displayName: 'Alex Run' },
      '2026-07-06T09:00:00.000Z',
    );

    await expect(client.reserveIdentity(identity)).resolves.toMatchObject({
      status: 'created',
      message: 'Identifiant social rÃ©servÃ© dans lâ€™annuaire serveur.',
    });
    const reserveCall = calls[0];
    expect(reserveCall).toBeDefined();
    if (!reserveCall) {
      throw new Error('Appel de réservation annuaire serveur manquant.');
    }
    expect(reserveCall).toMatchObject({ url: '/api/social-directory/reserve' });
    expect(JSON.parse(String(reserveCall.init?.body))).toMatchObject({
      userId: identity.userId,
      handle: 'alex.run',
      displayName: 'Alex Run',
    });
  });

  it('remonte un conflit de handle rÃ©servÃ© par un autre compte', async () => {
    const client = createSocialDirectoryClient({
      endpoint: '/api/social-directory',
      fetcher: async () => jsonResponse(409, {
        status: 'conflict',
        message: 'Identifiant dÃ©jÃ  rÃ©servÃ© par un autre compte SportPilot.',
      }),
    });
    const identity = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'lina456'),
      { handle: '@alex.run', displayName: 'Lina Run' },
      '2026-07-06T09:00:00.000Z',
    );

    await expect(client.reserveIdentity(identity)).resolves.toMatchObject({
      status: 'conflict',
      message: 'Identifiant dÃ©jÃ  rÃ©servÃ© par un autre compte SportPilot.',
    });
  });

  it('retrouve un profil public exact depuis lâ€™annuaire serveur', async () => {
    const client = createSocialDirectoryClient({
      endpoint: '/api/social-directory',
      fetcher: async () => jsonResponse(200, {
        status: 'found',
        profile: {
          userId: 'social-user:alex123',
          handle: 'alex.run',
          displayName: 'Alex Run',
          createdAt: '2026-07-06T09:00:00.000Z',
          updatedAt: '2026-07-06T10:00:00.000Z',
        },
      }),
    });

    await expect(client.lookupByHandle('@alex.run')).resolves.toMatchObject({
      status: 'found',
      profile: {
        userId: 'social-user:alex123' as EntityId,
        handle: 'alex.run',
        displayName: 'Alex Run',
      },
    });
  });

  it('retourne notFound quand lâ€™annuaire serveur ne connaÃ®t pas le handle', async () => {
    const client = createSocialDirectoryClient({
      endpoint: '/api/social-directory',
      fetcher: async () => jsonResponse(404, {
        status: 'notFound',
        message: 'Identifiant inexistant.',
      }),
    });

    await expect(client.lookupByHandle('@ghost.run')).resolves.toEqual({ status: 'notFound' });
  });

  it('reste indisponible quand aucun endpoint annuaire nâ€™est configurÃ©', async () => {
    const client = createSocialDirectoryClient({ endpoint: '', fetcher: async () => jsonResponse(500, {}) });

    await expect(client.lookupByHandle('@alex.run')).resolves.toEqual({ status: 'unavailable' });
    await expect(client.reserveIdentity(createDefaultSocialIdentity())).resolves.toMatchObject({ status: 'unavailable' });
  });
});

