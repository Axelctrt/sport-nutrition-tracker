import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

import {
  createSyncOrchestrator,
  type SyncOrchestratorDomainAdapter,
} from '@/application/sync/syncOrchestrator';

describe('préparation F1 de l’orchestrateur de synchronisation 0.26.0', () => {
  it('conserve les versions publiées pendant la construction du socle', () => {
    expect(__APP_VERSION__).toBe('1.0.2');
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
    );
  });

  it('analyse sans écrire et expose une file réutilisable par les phases suivantes', async () => {
    const domain: SyncOrchestratorDomainAdapter = {
      id: 'weights',
      analyze: vi.fn(async () => ({ differingEntityCount: 1 })),
      synchronize: vi.fn(async () => undefined),
    };
    const orchestrator = createSyncOrchestrator({
      accountKey: 'readiness-f1',
      domains: [domain],
    });

    const result = await orchestrator.run({
      operation: 'analyze',
      source: 'manual',
    });

    expect(result.completedDomainIds).toEqual(['weights']);
    expect(domain.analyze).toHaveBeenCalledTimes(1);
    expect(domain.synchronize).not.toHaveBeenCalled();
    expect(orchestrator.getSnapshot()).toMatchObject({
      accountKey: 'readiness-f1',
      isRunning: false,
      queueLength: 0,
      domains: {
        weights: {
          status: 'action-required',
          differingEntityCount: 1,
        },
      },
    });
  });
});
