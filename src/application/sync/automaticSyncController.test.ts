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
const ACCOUNT_B_USER_ID = 'user-f4-b';
const ACCOUNT_B_FINGERPRINT =
  createSyncPrototypeAccountFingerprint(ACCOUNT_B_USER_ID)!;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

  it('ignore les modifications locales créées après déconnexion', async () => {
    const eventTarget = new EventTarget();
    const { client } = createClient(createSnapshot({
      account: { isLoggedIn: false, isLoading: false },
    }));
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

    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        { detail: { domainIds: ['activities'] } },
      ),
    );
    await flush();

    expect(schedule).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('borne les analyses répétées au premier plan', async () => {
    const eventTarget = new EventTarget();
    const visibilityTarget = new EventTarget();
    let nowMs = 100_000;
    const { client } = createClient();
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      eventTarget,
      visibilityTarget,
      isVisible: () => true,
      now: () => new Date(nowMs),
      foregroundMinimumIntervalMs: 30_000,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });
    await controller.initialize();
    schedule.mockClear();

    eventTarget.dispatchEvent(new Event('focus'));
    visibilityTarget.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'foreground', operation: 'analyze' }),
    );

    nowMs += 31_000;
    eventTarget.dispatchEvent(new Event('focus'));
    await flush();
    expect(schedule).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('reprend une analyse au retour en ligne même après plusieurs jours', async () => {
    const eventTarget = new EventTarget();
    let online = false;
    let nowMs = Date.parse('2026-07-03T08:00:00.000Z');
    const { client } = createClient();
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      eventTarget,
      isOnline: () => online,
      now: () => new Date(nowMs),
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });
    await controller.initialize();
    expect(schedule).not.toHaveBeenCalled();

    nowMs += 7 * 24 * 60 * 60 * 1_000;
    online = true;
    eventTarget.dispatchEvent(new Event('online'));
    await flush();

    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'network-restored', operation: 'analyze' }),
    );
    controller.dispose();
  });

  it('conserve une modification immédiate après une restauration cloud', async () => {
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
      localChangeDebounceMs: 0,
    });
    await controller.initialize();
    schedule.mockClear();

    eventTarget.dispatchEvent(new Event(CLOUD_ACCOUNT_RESTORED_EVENT));
    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        { detail: { domainIds: ['activities'], reason: 'post-restore-edit' } },
      ),
    );
    await flush();

    expect(schedule.mock.calls.map(([request]) => request.source)).toEqual(
      expect.arrayContaining(['cloud-restore', 'local-change']),
    );
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'local-change',
        operation: 'sync',
        domainIds: ['activities'],
      }),
    );
    controller.dispose();
  });

  it('ignore les événements locaux émis pendant une synchronisation active', async () => {
    const eventTarget = new EventTarget();
    const { client } = createClient(createSnapshot({
      realActivities: {
        enabled: true,
        status: 'syncing',
        preview: { differingEntityCount: 0 } as never,
      },
    }));
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
        { detail: { domainIds: ['activities'], reason: 'sync-echo' } },
      ),
    );
    await flush();

    expect(schedule).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('ignore la fin tardive d’une opération appartenant à l’ancien compte', async () => {
    const eventTarget = new EventTarget();
    const pending = deferred<SyncOrchestratorRunResult>();
    const { client, updateSnapshot } = createClient();
    const { repository } = createSettingsRepository();
    const first = createOrchestrator();
    const second = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      eventTarget,
      createOrchestrator: (accountKey) =>
        accountKey === ACCOUNT_FINGERPRINT.toLowerCase()
          ? first.orchestrator
          : second.orchestrator,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controller.initialize();
    const initialCompletedAt = controller.getSnapshot().lastCompletedAt;
    first.schedule.mockClear();
    first.schedule.mockImplementationOnce(() => pending.promise);

    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        { detail: { domainIds: ['activities'] } },
      ),
    );
    await flush();
    expect(first.schedule).toHaveBeenCalledOnce();

    updateSnapshot(createSnapshot({
      account: {
        isLoggedIn: true,
        isLoading: false,
        userId: ACCOUNT_B_USER_ID,
      },
    }));
    await flush();
    expect(first.orchestrator.dispose).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().accountFingerprint).toBe(
      ACCOUNT_B_FINGERPRINT.toLowerCase(),
    );

    pending.resolve({
      operation: 'sync',
      source: 'local-change',
      startedAt: '2026-07-03T09:00:00.000Z',
      completedAt: '2026-07-03T09:00:30.000Z',
      completedDomainIds: ['activities'],
      failedDomainIds: [],
      domainResults: [],
    });
    await flush();

    expect(controller.getSnapshot().lastCompletedAt).toBe(initialCompletedAt);
    expect(second.schedule).not.toHaveBeenCalled();
    controller.dispose();
  });

});
