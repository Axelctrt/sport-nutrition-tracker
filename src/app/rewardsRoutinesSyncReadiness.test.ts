import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';


describe('compatibilité E2 avec la publication 0.25.0', () => {
  it('ajoute le domaine cloud sans migrer la base métier ni la sauvegarde', () => {
    expect(__APP_VERSION__).toBe('0.25.0');
    expect(databaseSchemaVersion).toBe(8);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(7);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v10',
    );
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('realRewardsRoutines');
  });

  it('active E2 dans le déploiement public', () => {
    expect(syncPublicDeploymentConfig).toMatchObject({
      VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      VITE_ENABLE_REAL_REWARDS_ROUTINES_SYNC: 'true',
      VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
    });
  });
});
