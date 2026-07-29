import { describe, expect, it, vi } from 'vitest';

import { deleteRemoteSocialAccountData } from '@/infrastructure/sync-prototype/remoteAccountDataDeletionGateway';

describe('remote account data deletion gateway', () => {
  it('authenticates the destructive request and returns the server count', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'deleted',
      deletedSocialRecords: 7,
    }), { status: 200 }));

    await expect(deleteRemoteSocialAccountData(
      { userId: 'account-user', accessToken: 'secret-token' },
      { endpoint: '/api/account-data', fetcher },
    )).resolves.toEqual({ deletedSocialRecords: 7 });
    expect(fetcher).toHaveBeenCalledWith('/api/account-data', {
      method: 'DELETE',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer secret-token',
      },
    });
  });

  it('does not mask a remote refusal', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      message: 'Session expirée.',
    }), { status: 401 }));

    await expect(deleteRemoteSocialAccountData(
      { userId: 'account-user', accessToken: 'expired' },
      { fetcher },
    )).rejects.toThrow('Session expirée.');
  });
});
