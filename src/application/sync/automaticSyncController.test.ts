import {
  AutomaticSyncController,
  type AutomaticSyncConnectionType,
} from '@/application/sync/automaticSyncController';
import type { CloudAccountAccessSnapshot } from '@/application/account/cloudAccountAccess';
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

function createOrchestrator(
  analysisDomainResults: SyncOrchestratorRunResult['domainResults'] = [],
) {
  const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) => {
    const result = completedRun(request);
    return request.operation === 'analyze'
      ? { ...result, domainResults: analysisDomainResults }
      : result;
  });
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
  it('converge automatiquement Strength quand l’analyse prouve un changement cloud-only', async () => {
    const { client } = createClient(createSnapshot({
      realStrength: {
        enabled: true,
        status: 'ready',
        preview: {
          differingEntityCount: 2,
          changeOrigin: 'cloud',
        } as never,
      },
    }));
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator([{
      domainId: 'strength',
      status: 'cloud-changes-available',
      differingEntityCount: 2,
      changeOrigin: 'cloud',
    }]);
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenNthCalledWith(1, expect.objectContaining({
      operation: 'analyze',
      source: 'application-start',
      domainIds: expect.arrayContaining(['strength']),
    }));
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'cloud-only',
      source: 'application-start',
      domainIds: ['strength'],
      delayMs: 0,
    });
    controller.dispose();
  });

  it('envoie automatiquement Strength quand l’analyse prouve un changement local-only', async () => {
    const { client } = createClient(createSnapshot({
      realStrength: {
        enabled: true,
        status: 'ready',
        preview: {
          differingEntityCount: 1,
          changeOrigin: 'local',
        } as never,
      },
    }));
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator([{
      domainId: 'strength',
      status: 'local-changes-pending',
      differingEntityCount: 1,
      changeOrigin: 'local',
    }]);
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenNthCalledWith(1, expect.objectContaining({
      operation: 'analyze',
      source: 'application-start',
      domainIds: expect.arrayContaining(['strength']),
    }));
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'local-only',
      source: 'application-start',
      domainIds: ['strength'],
      delayMs: 0,
    });
    controller.dispose();
  });

  it('reproduit P0 : une différence Strength distante reste au stade analyse au démarrage', async () => {
    const { client } = createClient(createSnapshot({
      realStrength: {
        enabled: true,
        status: 'ready',
        preview: { differingEntityCount: 2 } as never,
      },
    }));
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
        domainIds: expect.arrayContaining(['strength']),
      }),
    );
    expect(schedule).not.toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'sync' }),
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

  it('ne réactive pas une préférence désactivée après reconnexion ou reload', async () => {
    const disconnected = createSnapshot({
      account: { isLoggedIn: false, isLoading: false },
    });
    const { client, updateSnapshot } = createClient(disconnected);
    const disabledSettings = createSettings({
      automaticAccountSyncEnabled: false,
    });
    delete disabledSettings.automaticAccountSyncAccountFingerprint;
    const { repository } = createSettingsRepository(disabledSettings);
    const firstRun = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => firstRun.orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();
    updateSnapshot(createSnapshot());
    await flush();
    expect(firstRun.schedule).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    controller.dispose();

    const afterReload = createOrchestrator();
    const reloadedController = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => afterReload.orchestrator,
      lifecycleDebounceMs: 0,
    });
    await reloadedController.initialize();

    expect(afterReload.schedule).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    reloadedController.dispose();
  });

  it('réanalyse une modification locale puis envoie seulement Strength prouvé local-only', async () => {
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
    schedule.mockImplementation(async (request: SyncOrchestratorScheduleRequest) => {
      const result = completedRun(request);
      return request.operation === 'analyze'
        ? {
            ...result,
            domainResults: [{
              domainId: 'strength',
              status: 'local-changes-pending',
              differingEntityCount: 1,
              changeOrigin: 'local',
            }],
          }
        : result;
    });

    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        { detail: { domainIds: ['strength'], reason: 'test' } },
      ),
    );
    await vi.waitFor(() => expect(schedule).toHaveBeenCalledTimes(2));

    expect(schedule).toHaveBeenNthCalledWith(1, {
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['strength'],
      delayMs: 25,
    });
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'local-only',
      source: 'local-change',
      domainIds: ['strength'],
      delayMs: 0,
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
        operation: 'analyze',
        domainIds: ['activities'],
      }),
    );
    controller.dispose();
  });

  it('met en file les événements locaux émis pendant une synchronisation active', async () => {
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

    expect(schedule).toHaveBeenCalledWith({
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['activities'],
      delayMs: 0,
    });
    controller.dispose();
  });

  it('relance une analyse unique quand un accès cloud suspendu redevient prêt', async () => {
    const initialSnapshot = createSnapshot();
    const { client, updateSnapshot } = createClient(initialSnapshot);
    let cloudReady = false;
    client.getCloudAccessState = vi.fn((): CloudAccountAccessSnapshot => cloudReady
      ? {
          status: 'ready',
          isIdentityConnected: true,
          isOperational: true,
          canAttemptRenewal: false,
          message: 'Compte cloud opérationnel.',
        }
      : {
          status: 'license-expired',
          errorCode: 'LICENSE_EXPIRED',
          isIdentityConnected: true,
          isOperational: false,
          canAttemptRenewal: false,
          message: 'L’accès cloud de ce compte a expiré.',
          actionLabel: 'Gérer le compte',
        });
    const { repository } = createSettingsRepository();
    const { orchestrator, schedule } = createOrchestrator();
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: repository,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();
    expect(schedule).not.toHaveBeenCalled();

    cloudReady = true;
    updateSnapshot({
      ...initialSnapshot,
      diagnostics: {
        ...initialSnapshot.diagnostics,
        lastRefreshAt: '2026-07-28T12:00:00.000Z',
      },
    });
    await flush();

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'analyze',
      source: 'account-connected',
    }));
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
