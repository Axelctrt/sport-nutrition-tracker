import { describe, expect, it, vi } from 'vitest';

import { createSocialIdentityReconciliationGateway } from '@/infrastructure/sync-prototype/socialIdentityReconciliationGateway';

const input = {
  previousUserId: 'social-user:legacy',
  handle: 'test',
  displayName: 'TEST',
  createdAt: '2026-07-07T10:00:00.000Z',
  updatedAt: '2026-07-08T10:00:00.000Z',
} as const;

describe('social identity reconciliation gateway', () => {
  it('envoie le jeton cloud et restitue l’identité canonique', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: 'reconciled',
      message: 'OK',
      identity: {
        ...input,
        userId: 'dexie-user-123',
      },
      migratedUserIds: ['social-user:legacy'],
    }), { status: 200 }));
    const gateway = createSocialIdentityReconciliationGateway({ fetcher });

    const result = await gateway.reconcile(
      { userId: 'dexie-user-123', accessToken: 'token' },
      input,
    );

    expect(result.status).toBe('reconciled');
    expect(result.identity.userId).toBe('dexie-user-123');
    expect(fetcher).toHaveBeenCalledWith('/api/social-identity/reconcile', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer token' }),
    }));
  });

  it('retourne un conflit sans remplacer l’identité locale', async () => {
    const gateway = createSocialIdentityReconciliationGateway({
      fetcher: vi.fn(async () => new Response(JSON.stringify({ message: 'Conflit.' }), { status: 409 })),
    });

    const result = await gateway.reconcile(
      { userId: 'dexie-user-123', accessToken: 'token' },
      input,
    );

    expect(result.status).toBe('conflict');
    expect(result.identity.userId).toBe('social-user:legacy');
  });
});
