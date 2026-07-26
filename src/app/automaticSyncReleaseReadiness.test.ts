import { describe, expect, it } from 'vitest';

import controllerSource from '@/application/sync/automaticSyncController.ts?raw';
import orchestratorSource from '@/application/sync/syncOrchestrator.ts?raw';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('publication SportPilot 0.26.0 — synchronisation automatique résiliente', () => {
  it('publie la version stable sans migration de données', () => {
    expect(__APP_VERSION__).toBe('0.32.0');
    expect(databaseSchemaVersion).toBe(11);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
    );
  });

  it('isole les fins d’opération appartenant à un ancien compte', () => {
    expect(controllerSource).toContain('identityGeneration');
    expect(controllerSource).toContain('replaceOrchestratorForAccount');
    expect(controllerSource).toContain('isCurrentOperation');
    expect(controllerSource).toContain(
      'if (!this.isCurrentOperation(generation, orchestrator)) return;',
    );
  });

  it('journalise le hors-ligne et interrompt les domaines restants à la fermeture', () => {
    expect(orchestratorSource).toContain(
      'appendSyncOperationHistory(accountKey, result);',
    );
    expect(orchestratorSource).toContain(
      'L’opération a été interrompue avant la fin.',
    );
    expect(orchestratorSource).toContain(
      'for (const [index, domainId] of request.domainIds.entries())',
    );
  });
});
