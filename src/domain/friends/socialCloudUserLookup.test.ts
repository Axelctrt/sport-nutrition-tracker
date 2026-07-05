import type { EntityId } from '@/domain/models/common';
import {
  SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION,
  assertSocialCloudUserLookupContractIntegrity,
  normalizeExactSocialCloudUserLookupResult,
} from '@/domain/friends/socialCloudUserLookup';

describe('socialCloudUserLookup', () => {
  it('normalise une recherche exacte trouvée sans créer de relation', () => {
    const report = normalizeExactSocialCloudUserLookupResult('@alex.run', {
      status: 'found',
      profile: {
        userId: 'social-user:alex' as EntityId,
        handle: 'alex.run',
        displayName: 'Alex Run',
        createdAt: '2026-07-05T00:00:00.000Z',
        updatedAt: '2026-07-05T00:00:00.000Z',
      },
    });

    expect(SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION).toBe('0.28.0-f3');
    expect(report).toMatchObject({
      status: 'found',
      handle: 'alex.run',
      displayHandle: '@alex.run',
      isCurrentUser: false,
      createsFriendship: false,
      createsFriendRequest: false,
      exposesSuggestions: false,
      exposesDirectory: false,
    });
  });

  it('refuse les handles invalides avant tout lookup distant', () => {
    expect(normalizeExactSocialCloudUserLookupResult('Admin', { status: 'notFound' })).toMatchObject({
      status: 'invalidHandle',
      displayHandle: '@Admin',
    });
  });

  it('retourne notFound si le profil trouvé ne correspond pas exactement au handle demandé', () => {
    const report = normalizeExactSocialCloudUserLookupResult('@alex.run', {
      status: 'found',
      profile: {
        userId: 'social-user:alex' as EntityId,
        handle: 'alex.trail',
        displayName: 'Alex Trail',
        createdAt: '2026-07-05T00:00:00.000Z',
        updatedAt: '2026-07-05T00:00:00.000Z',
      },
    });

    expect(report).toMatchObject({
      status: 'notFound',
      handle: 'alex.run',
    });
    expect(report).not.toHaveProperty('profile');
  });

  it('marque le profil trouvé comme compte courant sans contourner les règles de demande', () => {
    const userId = 'social-user:alex' as EntityId;
    const report = normalizeExactSocialCloudUserLookupResult('@alex.run', {
      status: 'found',
      profile: {
        userId,
        handle: 'alex.run',
        displayName: 'Alex Run',
        createdAt: '2026-07-05T00:00:00.000Z',
        updatedAt: '2026-07-05T00:00:00.000Z',
      },
    }, userId);

    expect(report.status).toBe('found');
    expect(report.isCurrentUser).toBe(true);
    expect(report.createsFriendRequest).toBe(false);
  });

  it('valide l’intégrité du contrat de recherche exacte', () => {
    expect(assertSocialCloudUserLookupContractIntegrity()).toBe(true);
  });
});
