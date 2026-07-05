import {
  createDefaultSocialIdentity,
  formatSocialHandle,
  mapLookupResultToAvailability,
  publicProfileFromIdentity,
  updateSocialIdentity,
  validateSocialHandle,
} from '@/domain/friends/socialIdentity';

describe('socialIdentity domain', () => {
  it('valide strictement les identifiants publics SportPilot', () => {
    expect(validateSocialHandle('@alex.run')).toMatchObject({
      status: 'valid',
      handle: 'alex.run',
      displayHandle: '@alex.run',
    });
    expect(validateSocialHandle('@romain_92').status).toBe('valid');
    expect(validateSocialHandle('@maxime-running').status).toBe('valid');

    expect(validateSocialHandle('@Alex').status).toBe('invalid');
    expect(validateSocialHandle('@alex run').status).toBe('invalid');
    expect(validateSocialHandle('@éloise').status).toBe('invalid');
    expect(validateSocialHandle('@@alex').status).toBe('invalid');
    expect(validateSocialHandle('@sportpilot').status).toBe('invalid');
  });

  it('conserve un userId stable privé quand le handle public change', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'abc123');
    const updated = updateSocialIdentity(
      identity,
      { handle: '@alex.run', displayName: 'Alex Run' },
      '2026-07-05T11:00:00.000Z',
    );

    expect(updated.userId).toBe(identity.userId);
    expect(updated.handle).toBe('alex.run');
    expect(updated.displayName).toBe('Alex Run');
    expect(updated.handleUpdatedAt).toBe('2026-07-05T11:00:00.000Z');
    expect(publicProfileFromIdentity(updated)).not.toHaveProperty('id');
  });

  it('formate toujours le handle affiché avec arobase', () => {
    expect(formatSocialHandle('lina.trail')).toBe('@lina.trail');
    expect(formatSocialHandle('@lina.trail')).toBe('@lina.trail');
  });

  it('mappe la recherche exacte vers les états UX attendus', () => {
    expect(mapLookupResultToAvailability({ status: 'notFound' })).toMatchObject({
      status: 'available',
    });
    expect(mapLookupResultToAvailability({ status: 'invalidHandle' })).toMatchObject({
      status: 'invalidHandle',
    });
    expect(mapLookupResultToAvailability({ status: 'unavailable' })).toMatchObject({
      status: 'unavailable',
    });
    expect(mapLookupResultToAvailability({
      status: 'found',
      profile: {
        userId: 'social-user:known',
        handle: 'alex.run',
        displayName: 'Alex Run',
        createdAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
      },
    })).toMatchObject({
      status: 'alreadyTaken',
    });
  });
});
