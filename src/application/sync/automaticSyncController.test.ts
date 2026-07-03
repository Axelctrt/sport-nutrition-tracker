import {
  AutomaticSyncController,
  type AutomaticSyncConnectionType,
} from '@/application/sync/automaticSyncController';
import {
  AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT,
  CLOUD_ACCOUNT_RESTORED_EVENT,
} from '@/application/sync/automaticSyncEvents';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  type SyncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import type {
  SyncOrchestrator,
  SyncOrchestratorRunResult,
  SyncOrchestratorScheduleRequest,
} from '@/application/sync/syncOrchestrator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { AppSettings } from '@/domain/models/settings';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const ACCOUNT_USER_ID = 'user-f2';
const ACCOUNT_FINGERPRINT =
  createSyncPrototypeAccountFingerprint(ACCOUNT_USER_ID)!;

function createSnapshot(
  overrides: Partial<SyncPrototypeSnapshot> = {},
): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: ACCOUNT_USER_ID,
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
    realActivities: {
      enabled: true,
      status: 'ready',
      preview: { differingEntityCount: 0 } as never,
    },
    ...overrides,
  };
}

function createClient(initialSnapshot = createSnapshot()) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const client = {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    initialize: vi.fn(async () => undefined),
  } as unknown as SyncPrototypeClient;

  return {
    client,
    updateSnapshot(next: SyncPrototypeSnapshot) {
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
}

function createSettings(
  overrides: Partial<AppSettings> = {},
): AppSettings {
  return {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint: ACCOUNT_FINGERPRINT,
    ...overrides,
  };
}

function createSettingsRepository(initial = createSettings()) {
  let settings = initial;
  const repository: SettingsRepository = {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => {
      settings = { ...settings, ...changes };
      return settings;
    }),
    reset: vi.fn(async () => settings),
  };
  return { repository, setSettings: (next: AppSettings) => { settings = next; } };
}

function completedRun(
  request: SyncOrchestratorScheduleRequest,
): SyncOrchestratorRunResult {
  const timestamp = '2026-07-03T08:00:00.000Z';
  return {
    operation: request.operation,
    source: request.source ?? 'manual',
    startedAt: timestamp,
    completedAt: timestamp,
    completedDomainIds: [...(request.domainIds ?? [])],
    failedDomainIds: [],
    domainResults: [],
  };
}

function createOrchestrator() {
  const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
    completedRun(request),
  );
  const orchestrator = {
    schedule,
    dispose: vi.fn(),
    cancelScheduled: vi.fn(),
    getSnapshot: vi.fn(),
    subscribe: vi.fn(),
    run: vi.fn(),
    retryFailures: vi.fn(),
  } as unknown as SyncOrchestrator;
  return { orchestrator, schedule };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AutomaticSyncController', () => {
  it('analyse les domaines autorisés au démarrage sans les synchroniser', async () => {
    const { client } = createClient();
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'analyze',
        source: 'application-start',
      }),
    );
    controller.dispose();
  });

  it('reste inactif lorsque la préférence est désactivée', async () => {
    const { client } = createClient();
    const { repository } = createSettingsRepository(
      createSettings({ automaticAccountSyncEnabled: false }),
    );
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => orchestrator,
    });

    await controller.initialize();

    expect(schedule).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('synchronise une modification locale seulement après une analyse propre', async () => {
    const eventTarget = new EventTarget();
    const { client } = createClient();
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      eventTarget,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 25,
    });
    await controller.initialize();
    schedule.mockClear();

    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        { detail: { domainIds: ['activities'], reason: 'test' } },
      ),
    );
    await flush();

    expect(schedule).toHaveBeenCalledWith({
      operation: 'sync',
      source: 'local-change',
      domainIds: ['activities'],
      delayMs: 25,
    });
    controller.dispose();
  });

  it('analyse sans écrire lorsque la rubrique ne possède pas de base propre', async () => {
    const eventTarget = new EventTarget();
    const { client } = createClient(
      createSnapshot({
        realActivities: {
          enabled: true,
          status: 'idle',
        },
      }),
    );
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      eventTarget,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controller.initialize();
    schedule.mockClear();

    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        { detail: { domainIds: ['activities'] } },
      ),
    );
    await flush();

    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'analyze',
        source: 'local-change',
        domainIds: ['activities'],
      }),
    );
    controller.dispose();
  });

  it('bloque le mode Wi-Fi lorsque le navigateur ne confirme pas le Wi-Fi', async () => {
    const { client } = createClient();
    const { repository } = createSettingsRepository(
      createSettings({ automaticAccountSyncConnectionMode: 'wifi-only' }),
    );
    const { orchestrator, schedule } = createOrchestrator();
    let connection: AutomaticSyncConnectionType = 'unknown';
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      connectionType: () => connection,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();
    expect(schedule).not.toHaveBeenCalled();
    expect(controller.getSnapshot().connectionAllowed).toBe(false);

    connection = 'wifi';
    window.dispatchEvent(new Event(AUTOMATIC_ACCOUNT_SYNC_PREFERENCE_CHANGED_EVENT));
    controller.dispose();
  });

  it('analyse au retour du réseau, à la restauration et à la connexion du compte', async () => {
    const eventTarget = new EventTarget();
    const disconnected = createSnapshot({
      account: { isLoggedIn: false, isLoading: false },
    });
    const { client, updateSnapshot } = createClient(disconnected);
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      eventTarget,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });
    await controller.initialize();

    updateSnapshot(createSnapshot());
    await flush();
    eventTarget.dispatchEvent(new Event('online'));
    eventTarget.dispatchEvent(new Event(CLOUD_ACCOUNT_RESTORED_EVENT));
    await flush();

    const sources = schedule.mock.calls.map(([request]) => request.source);
    expect(sources).toEqual(
      expect.arrayContaining([
        'account-connected',
        'network-restored',
        'cloud-restore',
      ]),
    );
    controller.dispose();
  });
});
