import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { AppSettings } from '@/domain/models/settings';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  WeightSyncIntegrationController,
} from '@/infrastructure/sync-prototype/weightSyncIntegration';
import { REAL_WEIGHT_DATA_CHANGED_EVENT } from '@/infrastructure/sync-prototype/weightSyncEvents';

function createClientSnapshot(
  overrides: Partial<SyncPrototypeSnapshot> = {},
): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    },
    sync: {
      status: 'connected',
      phase: 'in-sync',
    },
    weights: {
      weights: [],
      deletedCount: 0,
      isLoading: false,
    },
    realWeights: {
      enabled: true,
      status: 'idle',
    },
    diagnostics: {
      databaseName: 'sportpilot-sync-prototype',
      databaseVersion: 2,
      visibleWeightCount: 0,
      deletedWeightCount: 0,
    },
    ...overrides,
  };
}

function createFakeClient(initialSnapshot = createClientSnapshot()) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const syncRealWeights = vi.fn(async () => ({
    localWeightCount: 1,
    cloudWeightCount: 1,
    localDeletionCount: 0,
    cloudDeletionCount: 0,
    differingEntityCount: 0,
    uploadedWeights: 1,
    downloadedWeights: 0,
    removedLocalWeights: 0,
    removedCloudWeights: 0,
    uploadedDeletionRecords: 0,
    downloadedDeletionRecords: 0,
    completedAt: '2026-06-30T12:00:00.000Z',
  }));

  const initialize = vi.fn(async () => undefined);

  const client: SyncPrototypeClient = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    })),
    syncRealWeights,
    saveWeight: vi.fn(async () => {
      throw new Error('non utilisé');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return {
    client,
    initialize,
    syncRealWeights,
    updateSnapshot(next: SyncPrototypeSnapshot) {
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
}

function createSettingsRepository(enabled: boolean) {
  let settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticWeightSyncEnabled: enabled,
  };

  const repository: SettingsRepository = {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => {
      settings = { ...settings, ...changes };
      return settings;
    }),
    reset: vi.fn(async () => {
      settings = createDefaultAppSettings();
      return settings;
    }),
  };

  return { repository, getSettings: () => settings };
}

describe('intégration contrôlée de la synchronisation des pesées', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reste indisponible sans client cloud et refuse l’activation', async () => {
    const { repository } = createSettingsRepository(false);
    const controller = new WeightSyncIntegrationController({
      settingsRepository: repository,
      isOnline: () => true,
    });

    await controller.initialize();

    expect(controller.getSnapshot()).toMatchObject({
      available: false,
      enabled: false,
      status: 'unavailable',
    });
    await expect(controller.setEnabled(true)).rejects.toThrow(
      'n’est pas disponible',
    );
  });

  it('enregistre l’activation sans dépendre de la préparation réseau', async () => {
    let resolveInitialization: (() => void) | undefined;
    const { client, initialize, syncRealWeights } = createFakeClient();
    initialize.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          resolveInitialization = () => resolve(undefined);
        }),
    );
    const { repository, getSettings } = createSettingsRepository(false);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      eventTarget: window,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
    });

    await controller.setEnabled(true);

    expect(getSettings().automaticWeightSyncEnabled).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      accountConnected: true,
    });
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(syncRealWeights).not.toHaveBeenCalled();

    resolveInitialization?.();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(syncRealWeights).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('persiste l’activation même si le compte repasse brièvement en restauration', async () => {
    const { client, updateSnapshot } = createFakeClient();
    const { repository, getSettings } = createSettingsRepository(false);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
    });

    await controller.initialize();
    updateSnapshot(
      createClientSnapshot({
        account: {
          isLoggedIn: false,
          isLoading: true,
        },
        sync: {
          status: 'connecting',
          phase: 'initial',
        },
      }),
    );

    await expect(controller.setEnabled(true)).resolves.toBeUndefined();
    expect(getSettings().automaticWeightSyncEnabled).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      accountConnected: false,
      status: 'disconnected',
    });
    controller.dispose();
  });

  it('persiste l’activation même si la session se déconnecte entre le rendu et le clic', async () => {
    const { client, updateSnapshot } = createFakeClient();
    const { repository, getSettings } = createSettingsRepository(false);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
    });

    await controller.initialize();
    updateSnapshot(
      createClientSnapshot({
        account: {
          isLoggedIn: false,
          isLoading: false,
        },
        sync: {
          status: 'disconnected',
          phase: 'offline',
        },
      }),
    );

    await expect(controller.setEnabled(true)).resolves.toBeUndefined();
    expect(getSettings().automaticWeightSyncEnabled).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      accountConnected: false,
      status: 'offline',
    });
    controller.dispose();
  });

  it('considère l’activation réussie lorsque la préférence a bien été persistée', async () => {
    const { client } = createFakeClient();
    let settings: AppSettings = {
      ...createDefaultAppSettings(),
      automaticWeightSyncEnabled: false,
    };
    const repository: SettingsRepository = {
      get: vi.fn(async () => settings),
      update: vi.fn(async (changes) => {
        settings = { ...settings, ...changes };
        throw new Error('échec post-écriture simulé');
      }),
      reset: vi.fn(async () => settings),
    };
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
    });

    await expect(controller.setEnabled(true)).resolves.toBeUndefined();
    expect(settings.automaticWeightSyncEnabled).toBe(true);
    expect(controller.getSnapshot().enabled).toBe(true);
    controller.dispose();
  });

  it('conserve le bon contexte pour les timers natifs du navigateur', async () => {
    const { client, syncRealWeights } = createFakeClient();
    const { repository } = createSettingsRepository(false);
    const strictSetTimer = vi.fn(function (
      this: unknown,
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return globalThis.setTimeout(handler, timeout, ...args);
    }) as typeof globalThis.setTimeout;
    const strictClearTimer = vi.fn(function (
      this: unknown,
      handle?: ReturnType<typeof globalThis.setTimeout>,
    ) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      globalThis.clearTimeout(handle);
    }) as typeof globalThis.clearTimeout;
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      setTimer: strictSetTimer,
      clearTimer: strictClearTimer,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
    });

    await controller.initialize();
    await expect(controller.setEnabled(true)).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(10);

    expect(strictSetTimer).toHaveBeenCalled();
    expect(syncRealWeights).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('persiste une activation explicite puis lance une synchronisation bornée', async () => {
    const { client, syncRealWeights } = createFakeClient();
    const { repository, getSettings } = createSettingsRepository(false);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      eventTarget: window,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
    });

    await controller.initialize();
    expect(controller.getSnapshot().status).toBe('disabled');

    await controller.setEnabled(true);
    expect(getSettings().automaticWeightSyncEnabled).toBe(true);

    await vi.advanceTimersByTimeAsync(10);

    expect(syncRealWeights).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      status: 'in-sync',
      lastSyncAt: '2026-06-30T12:00:00.000Z',
    });
    controller.dispose();
  });

  it('regroupe les événements de pesée et empêche les opérations concurrentes', async () => {
    let resolveSync: (() => void) | undefined;
    const { client, syncRealWeights } = createFakeClient();
    syncRealWeights.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = () =>
            resolve({
              localWeightCount: 1,
              cloudWeightCount: 1,
              localDeletionCount: 0,
              cloudDeletionCount: 0,
              differingEntityCount: 0,
              uploadedWeights: 0,
              downloadedWeights: 0,
              removedLocalWeights: 0,
              removedCloudWeights: 0,
              uploadedDeletionRecords: 0,
              downloadedDeletionRecords: 0,
              completedAt: '2026-06-30T12:00:01.000Z',
            });
        }),
    );
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      eventTarget: window,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);
    expect(syncRealWeights).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent(REAL_WEIGHT_DATA_CHANGED_EVENT));
    window.dispatchEvent(new CustomEvent(REAL_WEIGHT_DATA_CHANGED_EVENT));
    await vi.advanceTimersByTimeAsync(100);
    expect(syncRealWeights).toHaveBeenCalledTimes(1);

    resolveSync?.();
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(syncRealWeights).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it('attend la fin de la synchronisation Dexie Cloud initiale avant une relance manuelle', async () => {
    const initial = createClientSnapshot({
      sync: { status: 'connected', phase: 'pulling' },
    });
    const { client, syncRealWeights, updateSnapshot } = createFakeClient(initial);
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
    });

    await controller.initialize();
    const manualSync = controller.syncNow();
    await Promise.resolve();
    expect(syncRealWeights).not.toHaveBeenCalled();

    updateSnapshot(
      createClientSnapshot({
        sync: { status: 'connected', phase: 'in-sync' },
      }),
    );
    await manualSync;

    expect(syncRealWeights).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('passe hors ligne puis reprend automatiquement au retour du réseau', async () => {
    let online = false;
    const { client, syncRealWeights } = createFakeClient();
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      eventTarget: window,
      isOnline: () => online,
      debounceMs: 10,
      minimumIntervalMs: 0,
    });

    await controller.initialize();
    expect(controller.getSnapshot().status).toBe('offline');

    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10);

    expect(syncRealWeights).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().status).toBe('in-sync');
    controller.dispose();
  });

  it('affiche hors ligne lorsque Dexie Cloud perd le réseau même si le navigateur se croit connecté', async () => {
    const { client, syncRealWeights } = createFakeClient(
      createClientSnapshot({
        sync: {
          status: 'offline',
          phase: 'offline',
          errorMessage: 'WebSocket connection lost',
        },
      }),
    );
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
    });

    await controller.initialize();

    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      online: true,
      status: 'offline',
    });
    expect(controller.getSnapshot().errorMessage).toBeUndefined();
    await vi.advanceTimersByTimeAsync(100);
    expect(syncRealWeights).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('classe une erreur réseau de synchronisation comme hors ligne', async () => {
    const { client, syncRealWeights } = createFakeClient();
    syncRealWeights.mockRejectedValue(new TypeError('fetch failed'));
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);

    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      status: 'offline',
    });
    expect(controller.getSnapshot().errorMessage).toBeUndefined();
    controller.dispose();
  });

  it('laisse une reprise réseau lente terminer sans faux état erreur à 20 secondes', async () => {
    const { client, syncRealWeights } = createFakeClient();
    syncRealWeights.mockImplementation(
      () =>
        new Promise((resolve) => {
          globalThis.setTimeout(
            () =>
              resolve({
                localWeightCount: 1,
                cloudWeightCount: 1,
                localDeletionCount: 0,
                cloudDeletionCount: 0,
                differingEntityCount: 0,
                uploadedWeights: 1,
                downloadedWeights: 0,
                removedLocalWeights: 0,
                removedCloudWeights: 0,
                uploadedDeletionRecords: 0,
                downloadedDeletionRecords: 0,
                completedAt: '2026-06-30T12:00:30.000Z',
              }),
            30_000,
          );
        }),
    );
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);
    expect(controller.getSnapshot().status).toBe('syncing');

    await vi.advanceTimersByTimeAsync(20_000);
    expect(controller.getSnapshot().status).toBe('syncing');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(controller.getSnapshot()).toMatchObject({
      status: 'in-sync',
      lastSyncAt: '2026-06-30T12:00:30.000Z',
    });
    controller.dispose();
  });

  it('reprend rapidement après reconnexion sans attendre les quinze secondes minimales', async () => {
    let nowMs = 100_000;
    const { client, syncRealWeights, updateSnapshot } = createFakeClient();
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      now: () => new Date(nowMs),
      debounceMs: 10,
      minimumIntervalMs: 15_000,
      timeoutMs: 1_000,
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);
    expect(syncRealWeights).toHaveBeenCalledTimes(1);

    updateSnapshot(
      createClientSnapshot({
        sync: { status: 'offline', phase: 'offline' },
      }),
    );
    expect(controller.getSnapshot().status).toBe('offline');

    nowMs += 100;
    updateSnapshot(createClientSnapshot());
    await vi.advanceTimersByTimeAsync(10);

    expect(syncRealWeights).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().status).toBe('in-sync');
    controller.dispose();
  });

  it('masque une erreur cloud transitoire pendant le passage à jour', async () => {
    const { client, updateSnapshot } = createFakeClient();
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
      clientErrorGraceMs: 500,
      postSuccessErrorGraceMs: 0,
    });
    const observed = [controller.getSnapshot()];
    const unsubscribe = controller.subscribe(() => {
      observed.push(controller.getSnapshot());
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);
    expect(controller.getSnapshot().status).toBe('in-sync');

    updateSnapshot(
      createClientSnapshot({
        sync: {
          status: 'error',
          phase: 'error',
          errorMessage: 'Erreur transitoire Dexie Cloud',
        },
      }),
    );

    expect(controller.getSnapshot()).toMatchObject({
      status: 'in-sync',
    });
    expect(controller.getSnapshot().errorMessage).toBeUndefined();

    await vi.advanceTimersByTimeAsync(250);
    updateSnapshot(createClientSnapshot());
    await vi.advanceTimersByTimeAsync(500);

    expect(
      observed.some(
        (snapshot) => snapshot.status === 'error' || snapshot.errorMessage,
      ),
    ).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({
      status: 'in-sync',
    });
    unsubscribe();
    controller.dispose();
  });


  it('masque une transition cloud de cinq secondes après une synchronisation réussie', async () => {
    let nowMs = 100_000;
    const { client, updateSnapshot } = createFakeClient();
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      now: () => new Date(nowMs),
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
      clientErrorGraceMs: 500,
      postSuccessErrorGraceMs: 10_000,
    });
    const observed = [controller.getSnapshot()];
    const unsubscribe = controller.subscribe(() => {
      observed.push(controller.getSnapshot());
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);
    expect(controller.getSnapshot().status).toBe('in-sync');

    updateSnapshot(
      createClientSnapshot({
        sync: {
          status: 'error',
          phase: 'error',
          errorMessage: 'Dexie Cloud signale une erreur transitoire',
        },
      }),
    );

    nowMs += 5_000;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(controller.getSnapshot()).toMatchObject({
      status: 'in-sync',
    });
    expect(controller.getSnapshot().errorMessage).toBeUndefined();

    updateSnapshot(createClientSnapshot());
    nowMs += 5_000;
    await vi.advanceTimersByTimeAsync(5_000);

    expect(
      observed.some(
        (snapshot) => snapshot.status === 'error' || snapshot.errorMessage,
      ),
    ).toBe(false);
    expect(controller.getSnapshot().status).toBe('in-sync');
    unsubscribe();
    controller.dispose();
  });

  it('affiche une erreur cloud uniquement lorsqu’elle persiste', async () => {
    const { client, updateSnapshot } = createFakeClient();
    const { repository } = createSettingsRepository(true);
    const controller = new WeightSyncIntegrationController({
      client,
      settingsRepository: repository,
      isOnline: () => true,
      debounceMs: 10,
      minimumIntervalMs: 0,
      timeoutMs: 1_000,
      clientErrorGraceMs: 500,
      postSuccessErrorGraceMs: 0,
    });

    await controller.initialize();
    await vi.advanceTimersByTimeAsync(10);

    updateSnapshot(
      createClientSnapshot({
        sync: {
          status: 'error',
          phase: 'error',
          errorMessage: 'Erreur persistante Dexie Cloud',
        },
      }),
    );

    expect(controller.getSnapshot().status).toBe('in-sync');
    await vi.advanceTimersByTimeAsync(499);
    expect(controller.getSnapshot().status).toBe('in-sync');

    await vi.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: 'error',
      errorMessage: 'Erreur persistante Dexie Cloud',
    });
    controller.dispose();
  });

});
