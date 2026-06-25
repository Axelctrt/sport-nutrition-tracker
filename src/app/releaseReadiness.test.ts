import { routePaths } from '@/app/routePaths';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion, databaseTableNames } from '@/infrastructure/database/schema';

describe('préparation de la version 0.15.0-alpha.10', () => {
  it('expose la préversion UX dans le build', () => {
    expect(__APP_VERSION__).toBe('0.15.0-alpha.10');
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it('conserve les versions de schéma attendues', () => {
    expect(databaseSchemaVersion).toBe(2);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(2);
    expect(databaseTableNames).toEqual(expect.arrayContaining([
      'userProfile',
      'appSettings',
      'weights',
      'foodEntries',
      'workoutSessions',
    ]));
  });

  it('conserve les parcours de configuration et de gestion des données', () => {
    expect(routePaths.onboarding).toBe('/onboarding');
    expect(routePaths.profile).toBe('/profile');
    expect(routePaths.settings).toBe('/settings');
    expect(routePaths.backup).toBe('/backup');
  });
});
