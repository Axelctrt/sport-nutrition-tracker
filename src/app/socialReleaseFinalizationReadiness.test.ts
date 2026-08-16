import openFoodFactsProxySource from '@/../functions/_shared/openFoodFactsProxy.js?raw';
import packageSource from '@/../package.json?raw';
import releaseChecklistSource from '@/../RELEASE-CHECKLIST.md?raw';
import releaseNotesSource from '@/../RELEASE-NOTES-1.0.1.md?raw';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
} from '@/domain/friends/socialActivitySnapshotContract';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import { SYNC_PROTOTYPE_DATABASE_VERSION } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('stable readiness 1.0.1', () => {
  it('expose la version stable dans le build et les métadonnées', () => {
    expect(__APP_VERSION__).toBe('1.0.1');
    expect(packageSource).toContain('"version": "1.0.1"');
    // La Function candidate s'identifie avec la version stable préparée.
    expect(openFoodFactsProxySource).toContain('SportPilot/1.0.1');
  });

  it('conserve les versions de stockage validées', () => {
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION).toBe('0.29.0-a3');
  });

  it('documente la branche stable sans annoncer de publication', () => {
    expect(releaseNotesSource).toContain('SportPilot 1.0.1 — maintenance P0 continuité multi-appareils');
    expect(releaseNotesSource).toContain('Branche : `release/1.0.1`');
    expect(releaseNotesSource).toContain('non taguée et non déployée');
    expect(releaseChecklistSource).toContain('SportPilot 1.0.1');
    expect(releaseChecklistSource).toContain('Aucun tag créé');
  });

  it('gèle le périmètre de confidentialité', () => {
    for (const exclusion of [
      'annuaire public',
      'likes',
      'commentaires',
      'messagerie',
      'export d’activité brute',
      'aucune synchronisation cloud des photos',
      'aucune analyse corporelle par ia',
    ]) {
      expect(releaseNotesSource.toLowerCase()).toContain(exclusion);
    }
  });
});
