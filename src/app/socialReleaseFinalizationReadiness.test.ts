import openFoodFactsProxySource from '@/../functions/_shared/openFoodFactsProxy.js?raw';
import packageSource from '@/../package.json?raw';
import releaseChecklistSource from '@/../RELEASE-CHECKLIST.md?raw';
import releaseNotesSource from '@/../RELEASE-NOTES-1.0.0-rc.1.md?raw';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
} from '@/domain/friends/socialActivitySnapshotContract';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import { SYNC_PROTOTYPE_DATABASE_VERSION } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('release candidate readiness 1.0.0-rc.1', () => {
  it('expose la version candidate dans le build et les métadonnées', () => {
    expect(__APP_VERSION__).toBe('1.0.0-rc.1');
    expect(packageSource).toContain('"version": "1.0.0-rc.1"');
    // Le proxy publié reste sur la version stable tant que la RC n'est pas déployée.
    expect(openFoodFactsProxySource).toContain('SportPilot/0.37.0');
  });

  it('conserve les versions de stockage validées', () => {
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION).toBe('0.29.0-a3');
  });

  it('documente la branche de release sans annoncer de publication', () => {
    expect(releaseNotesSource).toContain('SportPilot 1.0.0-rc.1');
    expect(releaseNotesSource).toContain('Branche : `codex/rc-1-0-0-rc1`');
    expect(releaseNotesSource).toContain('Aucun tag, aucune release GitHub et aucun déploiement');
    expect(releaseChecklistSource).toContain('Branche `codex/rc-1-0-0-rc1` créée');
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
