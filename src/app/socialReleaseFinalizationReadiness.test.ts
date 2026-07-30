import openFoodFactsProxySource from '@/../functions/_shared/openFoodFactsProxy.js?raw';
import packageSource from '@/../package.json?raw';
import releaseChecklistSource from '@/../RELEASE-CHECKLIST.md?raw';
import releaseNotesSource from '@/../RELEASE-NOTES-0.35.1.md?raw';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
} from '@/domain/friends/socialActivitySnapshotContract';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import { SYNC_PROTOTYPE_DATABASE_VERSION } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('release finalization readiness 0.35.1', () => {
  it('expose la version stable dans le build et les métadonnées', () => {
    expect(__APP_VERSION__).toBe('0.35.1');
    expect(packageSource).toContain('"version": "0.35.1"');
    expect(openFoodFactsProxySource).toContain('SportPilot/0.35.1');
  });

  it('conserve les versions de stockage validées', () => {
    expect(databaseSchemaVersion).toBe(11);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION).toBe('0.29.0-a3');
  });

  it('documente la branche corrective sans annoncer de publication', () => {
    expect(releaseNotesSource).toContain('SportPilot 0.35.1');
    expect(releaseNotesSource).toContain('Branche : `fix/mobile-session-recovery-0.35.1`');
    expect(releaseNotesSource).toContain('Aucun tag ni déploiement');
    expect(releaseChecklistSource).toContain('Branche `fix/mobile-session-recovery-0.35.1` créée');
    expect(releaseChecklistSource).toContain('Aucun tag créé');
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
