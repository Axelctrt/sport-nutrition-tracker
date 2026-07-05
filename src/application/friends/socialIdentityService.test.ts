import {
  checkSocialHandleAvailability,
  createFoundSocialUserLookupGateway,
  exposePublicProfile,
  saveSocialIdentity,
  unavailableSocialUserLookupGateway,
  type SocialIdentityRepository,
} from '@/application/friends/socialIdentityService';
import { createDefaultSocialIdentity, type SocialIdentity } from '@/domain/friends/socialIdentity';

describe('socialIdentityService', () => {
  it('sauvegarde localement un handle valide sans changer le userId interne', async () => {
    const saved: SocialIdentity[] = [];
    const repository: SocialIdentityRepository = {
      async readIdentity() {
        return createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'abc123');
      },
      async saveIdentity(identity) {
        saved.push(identity);
      },
    };
    const current = await repository.readIdentity();

    const result = await saveSocialIdentity(repository, current, {
      handle: '@alex.run',
      displayName: 'Alex Run',
    });

    expect(result.status).toBe('saved');
    expect(result.identity.userId).toBe(current.userId);
    expect(saved[0]).toMatchObject({ handle: 'alex.run', displayName: 'Alex Run' });
  });

  it('bloque un handle invalide avant persistance', async () => {
    const current = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'abc123');
    const result = await saveSocialIdentity(undefined, current, {
      handle: '@Alex',
      displayName: 'Alex Run',
    });

    expect(result.status).toBe('invalidHandle');
    expect(result.identity).toBe(current);
  });

  it('prépare la recherche exacte mais retourne indisponible sans backend', async () => {
    await expect(
      checkSocialHandleAvailability(unavailableSocialUserLookupGateway, '@alex.run'),
    ).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('mappe un résultat exact trouvé en identifiant déjà pris', async () => {
    const gateway = createFoundSocialUserLookupGateway([
      {
        userId: 'social-user:alex',
        handle: 'alex.run',
        displayName: 'Alex Run',
        createdAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
      },
    ]);

    await expect(checkSocialHandleAvailability(gateway, '@alex.run')).resolves.toMatchObject({
      status: 'alreadyTaken',
    });
  });

  it('expose uniquement le profil public prévu', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'abc123');

    expect(exposePublicProfile(identity)).toEqual({
      userId: identity.userId,
      handle: identity.handle,
      displayName: identity.displayName,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    });
  });
});
