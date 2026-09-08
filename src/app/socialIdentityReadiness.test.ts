import {
  checkSocialHandleAvailability,
  unavailableSocialUserLookupGateway,
} from '@/application/friends/socialIdentityService';
import {
  createDefaultSocialIdentity,
  publicProfileFromIdentity,
  updateSocialIdentity,
  validateSocialHandle,
} from '@/domain/friends/socialIdentity';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';

describe('readiness identité sociale 0.27.0 F1', () => {
  it('conserve les versions de stockage publiées sans nouvelle table sociale', () => {
    expect(databaseSchemaVersion).toBe(13);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(12);
  });

  it('valide le handle public exact sans arobase en stockage', () => {
    expect(validateSocialHandle('@alex.run')).toMatchObject({
      status: 'valid',
      handle: 'alex.run',
      displayHandle: '@alex.run',
    });
    expect(validateSocialHandle('@Alex').status).toBe('invalid');
    expect(validateSocialHandle('@sportpilot').status).toBe('invalid');
  });

  it('garde le userId interne stable et absent du handle public', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'abc123');
    const updated = updateSocialIdentity(identity, {
      handle: '@romain_92',
      displayName: 'Romain',
    }, '2026-07-05T11:00:00.000Z');

    expect(updated.userId).toBe(identity.userId);
    expect(updated.handle).toBe('romain_92');
    expect(publicProfileFromIdentity(updated)).toMatchObject({
      userId: identity.userId,
      handle: 'romain_92',
      displayName: 'Romain',
    });
  });

  it('prépare la recherche exacte mais laisse le cloud indisponible par défaut', async () => {
    await expect(
      checkSocialHandleAvailability(unavailableSocialUserLookupGateway, '@alex.run'),
    ).resolves.toMatchObject({ status: 'unavailable' });
  });
});
