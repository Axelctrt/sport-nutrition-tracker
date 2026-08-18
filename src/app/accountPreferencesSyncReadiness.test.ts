import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';


describe('compatibilité E1 avec la publication 0.26.0', () => {
  it('ajoute le domaine cloud sans migrer la sauvegarde', () => {
    expect(__APP_VERSION__).toBe('1.0.3');
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
    );
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('realAccountPreferences');
  });

  it('active E1 dans le déploiement public', () => {
    expect(syncPublicDeploymentConfig).toMatchObject({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC: 'true',
      VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
    });
  });
});
