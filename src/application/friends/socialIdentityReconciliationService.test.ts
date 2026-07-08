import { describe, expect, it, vi } from 'vitest';

import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import {
  reconcileSocialIdentityWithCloudAccount,
  type SocialIdentityReconciliationGateway,
} from '@/application/friends/socialIdentityReconciliationService';

const legacyIdentity: SocialIdentity = {
  userId: 'social-user:legacy',
  handle: 'test',
  displayName: 'TEST',
  createdAt: '2026-07-07T10:00:00.000Z',
  updatedAt: '2026-07-08T10:00:00.000Z',
  handleUpdatedAt: '2026-07-07T10:00:00.000Z',
};

function gateway(identity: SocialIdentity): SocialIdentityReconciliationGateway {
  return {
    reconcile: vi.fn(async () => ({
      status: 'reconciled' as const,
      identity,
      migratedUserIds: ['social-user:legacy'],
      message: 'Identité réconciliée.',
    })),
  };
}

describe('social identity reconciliation service', () => {
  it('conserve l’identité locale sans session cloud', async () => {
    const saveIdentity = vi.fn();
    const result = await reconcileSocialIdentityWithCloudAccount({
      identity: legacyIdentity,
      repository: { readIdentity: vi.fn(), saveIdentity },
      gateway: gateway(legacyIdentity),
    });

    expect(result.status).toBe('notConnected');
    expect(saveIdentity).not.toHaveBeenCalled();
  });

  it('persiste le userId canonique renvoyé pour le compte connecté', async () => {
    const canonicalIdentity = {
      ...legacyIdentity,
      userId: 'dexie-user-123',
      updatedAt: '2026-07-08T11:00:00.000Z',
    } as SocialIdentity;
    const saveIdentity = vi.fn();

    const result = await reconcileSocialIdentityWithCloudAccount({
      identity: legacyIdentity,
      repository: { readIdentity: vi.fn(), saveIdentity },
      gateway: gateway(canonicalIdentity),
      credentials: { userId: 'dexie-user-123', accessToken: 'token' },
    });

    expect(result.status).toBe('reconciled');
    expect(saveIdentity).toHaveBeenCalledWith(canonicalIdentity);
  });

  it('refuse une identité serveur appartenant à un autre sujet cloud', async () => {
    const saveIdentity = vi.fn();
    const result = await reconcileSocialIdentityWithCloudAccount({
      identity: legacyIdentity,
      repository: { readIdentity: vi.fn(), saveIdentity },
      gateway: gateway({ ...legacyIdentity, userId: 'other-user' }),
      credentials: { userId: 'dexie-user-123', accessToken: 'token' },
    });

    expect(result.status).toBe('unavailable');
    expect(result.identity).toEqual(legacyIdentity);
    expect(saveIdentity).not.toHaveBeenCalled();
  });
});
