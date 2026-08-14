import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { DATA_SPACE_REGISTRY_VERSION } from '@/domain/data-spaces/dataSpace';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';

describe('publication de la continuité complète du compte 0.26.0', () => {
  it('prépare la version candidate attendue', () => {
    expect(__APP_VERSION__).toBe('1.0.0');
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it('conserve les formats de données validés', () => {
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(DATA_SPACE_REGISTRY_VERSION).toBe(1);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
    );
  });

  it('conserve tous les domaines cloud validés en production', () => {
    expect(syncPublicDeploymentConfig).toMatchObject({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_ENABLE_REAL_WEIGHT_SYNC: 'true',
      VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true',
      VITE_ENABLE_REAL_GOAL_SYNC: 'true',
      VITE_ENABLE_REAL_STRENGTH_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC: 'true',
      VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC: 'true',
      VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC: 'true',
      VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
    });
  });
});
