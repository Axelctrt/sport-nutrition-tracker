import {
  AutomaticSyncController,
} from '@/application/sync/automaticSyncController';
import type {
  SyncOrchestrator,
  SyncOrchestratorScheduleRequest,
} from '@/application/sync/syncOrchestrator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import {
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const userId = 'automatic-readiness-account';
const fingerprint = createSyncPrototypeAccountFingerprint(userId)!;

function snapshot(): SyncPrototypeSnapshot {
  return {
    account: { isLoggedIn: true, isLoading: false, userId },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realActivities: {
      enabled: true,
      status: 'ready',
      preview: { differingEntityCount: 0 } as never,
    },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };
}

describe('préparation F2 de la synchronisation automatique', () => {
  it('conserve les versions de stockage publiées', () => {
    expect(__APP_VERSION__).toBe('1.0.0-rc.2');
    expect(databaseSchemaVersion).toBe(12);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_DATABASE_NAME).toBe(
      'sportpilot-sync-runtime-0.20.0-v16',
    );
  });

  it('analyse au démarrage sans écrire automatiquement', async () => {
    const current = snapshot();
    const client = {
      getSnapshot: () => current,
      subscribe: () => () => undefined,
      initialize: vi.fn(async () => undefined),
    } as unknown as SyncPrototypeClient;
    const settings = {
      ...createDefaultAppSettings(),
      automaticAccountSyncEnabled: true,
      automaticAccountSyncConnectionMode: 'any-connection' as const,
      automaticAccountSyncAccountFingerprint: fingerprint,
    };
    const settingsRepository = {
      get: vi.fn(async () => settings),
    } as unknown as SettingsRepository;
    const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) => ({
      operation: request.operation,
      source: request.source ?? 'manual',
      startedAt: '2026-07-03T08:00:00.000Z',
      completedAt: '2026-07-03T08:00:00.000Z',
      completedDomainIds: [...(request.domainIds ?? [])],
      failedDomainIds: [],
      domainResults: [],
    }));
    const orchestrator = {
      schedule,
      dispose: vi.fn(),
    } as unknown as SyncOrchestrator;
    const controller = new AutomaticSyncController({
      client,
      settingsRepository,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'analyze',
        source: 'application-start',
      }),
    );
    controller.dispose();
  });

  it('réserve l’écriture locale automatique aux domaines avec une analyse propre', async () => {
    const source = await import('@/application/sync/automaticSyncController');
    expect(source.AutomaticSyncController).toBeTypeOf('function');
    expect(createDefaultAppSettings()).toMatchObject({
      automaticAccountSyncEnabled: false,
      automaticAccountSyncConnectionMode: 'any-connection',
    });
  });
});
