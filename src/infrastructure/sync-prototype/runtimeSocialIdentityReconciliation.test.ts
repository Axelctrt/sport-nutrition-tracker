import { describe, expect, it, vi } from 'vitest';

import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import { reconcileRuntimeSocialIdentity } from '@/infrastructure/sync-prototype/runtimeSocialIdentityReconciliation';

const identity: SocialIdentity = {
  userId: 'social-user:legacy',
  handle: 'test',
  displayName: 'TEST',
  createdAt: '2026-07-07T10:00:00.000Z',
  updatedAt: '2026-07-08T10:00:00.000Z',
};

describe('runtime social identity reconciliation', () => {
  it('utilise les credentials du client Dexie Cloud', async () => {
    const saveIdentity = vi.fn();
    const gateway = {
      reconcile: vi.fn(async () => ({
        status: 'reconciled' as const,
        identity: { ...identity, userId: 'dexie-user-123' },
        migratedUserIds: ['social-user:legacy'],
        message: 'OK',
      })),
    };

    const result = await reconcileRuntimeSocialIdentity({
      identity,
      repository: { readIdentity: vi.fn(), saveIdentity },
      client: {
        getCloudCredentials: () => ({ userId: 'dexie-user-123', accessToken: 'token' }),
      },
      gateway,
    });

    expect(result.identity.userId).toBe('dexie-user-123');
    expect(saveIdentity).toHaveBeenCalled();
  });
});
