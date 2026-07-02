import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';


describe('préparation E1 de la continuité complète du compte', () => {
  it('ajoute le domaine cloud sans migrer la base métier ni la sauvegarde', () => {
    expect(__APP_VERSION__).toBe('0.21.1');
    expect(databaseSchemaVersion).toBe(8);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(7);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(9);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v9',
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
