import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
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
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_A = 'user-merge-safe-a';
const USER_B = 'user-merge-safe-b';
const FINGERPRINT_A = createSyncPrototypeAccountFingerprint(USER_A)!;

function settingsRepository(): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint: FINGERPRINT_A,
  };
  return {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => Object.assign(settings, changes)),
    reset: vi.fn(async () => settings),
  };
}

function snapshotFor(
  userId: string,
  overrides: Partial<SyncPrototypeSnapshot> = {},
): SyncPrototypeSnapshot {
  return {
    account: { isLoggedIn: true, isLoading: false, userId },
    realAccountPreferences: { enabled: true, status: 'idle' },
    ...overrides,
  } as unknown as SyncPrototypeSnapshot;
}

function runResult(
  request: SyncOrchestratorScheduleRequest,
  domainResults: SyncOrchestratorRunResult['domainResults'],
): SyncOrchestratorRunResult {
  const timestamp = '2026-08-19T12:30:00.000Z';
  return {
    operation: request.operation,
    source: request.source ?? 'manual',
    startedAt: timestamp,
    completedAt: timestamp,
    completedDomainIds: [...(request.domainIds ?? [])],
    failedDomainIds: [],
    domainResults,
  };
}

function actionRequired(
  request: SyncOrchestratorScheduleRequest,
): SyncOrchestratorRunResult {
  return runResult(request, [{
    domainId: 'account-preferences',
    status: 'action-required',
    differingEntityCount: 1,
    changeOrigin: 'unknown',
  }]);
}

function orchestrator(
  schedule: ReturnType<typeof vi.fn>,
): SyncOrchestrator {
  return {
    schedule,
    dispose: vi.fn(),
    cancelScheduled: vi.fn(),
    getSnapshot: vi.fn(),
    subscribe: vi.fn(),
    run: vi.fn(),
    retryFailures: vi.fn(),
  } as unknown as SyncOrchestrator;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AutomaticSyncController — gardes merge-safe', () => {
  it('n’écrit rien si le compte change pendant le refresh transport', async () => {
    let snapshot = snapshotFor(USER_A);
    const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
      actionRequired(request));
    const syncNow = vi.fn(async () => {
      snapshot = snapshotFor(USER_B);
    });
    const client = {
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn(() => () => undefined),
      initialize: vi.fn(async () => undefined),
      syncNow,
    } as unknown as SyncPrototypeClient;
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => orchestrator(schedule),
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(syncNow).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).not.toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'sync' }),
    );

    controller.dispose();
  });

  it('signale une non-convergence sans relancer une boucle automatique', async () => {
    const snapshot = snapshotFor(USER_A);
    const client = {
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn(() => () => undefined),
      initialize: vi.fn(async () => undefined),
      syncNow: vi.fn(async () => undefined),
    } as unknown as SyncPrototypeClient;
    const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
      request.operation === 'analyze'
        ? actionRequired(request)
        : runResult(request, []));
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => orchestrator(schedule),
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();
    await flush();

    expect(client.syncNow).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledTimes(4);
    expect(schedule.mock.calls.filter(([request]) =>
      request.operation === 'sync')).toHaveLength(1);
    expect(controller.getSnapshot().errorMessage).toContain(
      '1 rubrique(s) n’ont pas pu être traitées automatiquement.',
    );

    await flush();
    expect(schedule).toHaveBeenCalledTimes(4);

    controller.dispose();
  });

  it('exclut les domaines désactivés et Nutrition même si leurs flags sont actifs', async () => {
    const snapshot = snapshotFor(USER_A, {
      realAccountPreferences: { enabled: false, status: 'disabled' },
      realRewardsRoutines: { enabled: false, status: 'disabled' },
      realDailyCoaching: { enabled: false, status: 'disabled' },
      realNutritionJournal: { enabled: true, status: 'idle' },
      realNutritionLibrary: { enabled: true, status: 'idle' },
      realNutritionTracking: { enabled: true, status: 'idle' },
    } as Partial<SyncPrototypeSnapshot>);
    const client = {
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn(() => () => undefined),
      initialize: vi.fn(async () => undefined),
      syncNow: vi.fn(async () => undefined),
    } as unknown as SyncPrototypeClient;
    const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
      runResult(request, []));
    const controller = new AutomaticSyncController({
      client,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => orchestrator(schedule),
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).not.toHaveBeenCalled();
    expect(client.syncNow).not.toHaveBeenCalled();

    controller.dispose();
  });
});
