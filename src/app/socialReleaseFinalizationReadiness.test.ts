import openFoodFactsProxySource from '@/../functions/_shared/openFoodFactsProxy.js?raw';
import packageSource from '@/../package.json?raw';
import releaseChecklistSource from '@/../RELEASE-CHECKLIST.md?raw';
import releaseNotesSource from '@/../RELEASE-NOTES-0.29.0.md?raw';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
} from '@/domain/friends/socialActivitySnapshotContract';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import { SYNC_PROTOTYPE_DATABASE_VERSION } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('social release finalization readiness 0.29.0 A26', () => {
  it('expose la version stable dans le build et les métadonnées', () => {
    expect(__APP_VERSION__).toBe('0.29.0');
    expect(packageSource).toContain('"version": "0.29.0"');
    expect(openFoodFactsProxySource).toContain('SportPilot/0.29.0');
  });

  it('conserve les versions de stockage validées', () => {
    expect(databaseSchemaVersion).toBe(10);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(9);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(14);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION).toBe('0.29.0-a3');
  });

  it('documente la release et le tag stable', () => {
    expect(releaseNotesSource).toContain('SportPilot 0.29.0');
    expect(releaseNotesSource).toContain('Tag attendu : `v0.29.0`');
    expect(releaseChecklistSource).toContain('release/0.29.0');
    expect(releaseChecklistSource).toContain('Tag annoté `v0.29.0`');
  });

  it('gèle le périmètre de confidentialité', () => {
    for (const exclusion of [
      'annuaire public',
      'likes',
      'commentaires',
      'messagerie',
      'export d’activité brute',
    ]) {
      expect(releaseNotesSource.toLowerCase()).toContain(exclusion);
    }
  });
});
