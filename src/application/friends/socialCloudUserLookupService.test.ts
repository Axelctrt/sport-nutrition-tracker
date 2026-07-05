import type { EntityId } from '@/domain/models/common';
import { createFoundSocialUserLookupGateway, unavailableSocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { lookupExactSocialCloudUser } from '@/application/friends/socialCloudUserLookupService';

describe('socialCloudUserLookupService', () => {
  it('recherche uniquement le handle exact normalisé', async () => {
    const profile = {
      userId: 'social-user:alex' as EntityId,
      handle: 'alex.run',
      displayName: 'Alex Run',
      createdAt: '2026-07-05T00:00:00.000Z',
      updatedAt: '2026-07-05T00:00:00.000Z',
    };

    await expect(lookupExactSocialCloudUser({
      handle: ' @alex.run ',
      lookupGateway: createFoundSocialUserLookupGateway([profile]),
    })).resolves.toMatchObject({
      status: 'found',
      profile,
      createsFriendRequest: false,
      exposesSuggestions: false,
    });
  });

  it('retourne identifiant inexistant sans suggestion quand aucun profil exact ne correspond', async () => {
    await expect(lookupExactSocialCloudUser({
      handle: '@ghost.run',
      lookupGateway: createFoundSocialUserLookupGateway([]),
    })).resolves.toMatchObject({
      status: 'notFound',
      message: 'Identifiant inexistant.',
      exposesDirectory: false,
      exposesSuggestions: false,
    });
  });

  it('retourne indisponible lorsque le backend réel reste désactivé', async () => {
    await expect(lookupExactSocialCloudUser({
      handle: '@alex.run',
      lookupGateway: unavailableSocialUserLookupGateway,
    })).resolves.toMatchObject({
      status: 'unavailable',
      message: 'Service cloud indisponible : recherche exacte réelle impossible pour le moment.',
    });
  });
});
