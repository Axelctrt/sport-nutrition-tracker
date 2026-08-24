import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  type SyncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import type {
  SyncOrchestrator,
  SyncOrchestratorDomainId,
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

const USER_ID = 'user-merge-safe-controller';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;
const MERGE_DOMAINS = [
  'account-preferences',
  'rewards-routines',
  'daily-coaching',
] as const satisfies readonly SyncOrchestratorDomainId[];

function client(): SyncPrototypeClient {
  const snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realAccountPreferences: { enabled: true, status: 'idle' },
    realRewardsRoutines: { enabled: true, status: 'idle' },
    realDailyCoaching: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    initialize: async () => undefined,
    syncNow: vi.fn(async () => undefined),
  } as unknown as SyncPrototypeClient;
}

function settingsRepository(): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint: FINGERPRINT,
  };
  return {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => Object.assign(settings, changes)),
    reset: vi.fn(async () => settings),
  };
}

function runResult(
  request: SyncOrchestratorScheduleRequest,
  domainResults: SyncOrchestratorRunResult['domainResults'],
): SyncOrchestratorRunResult {
  const timestamp = '2026-08-19T12:00:00.000Z';
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

function mergeSafeOrchestrator() {
  let synchronized = false;
  let requestedDifferences = new Set<SyncOrchestratorDomainId>(MERGE_DOMAINS);
  const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) => {
    if (request.operation === 'sync') {
      synchronized = true;
      return runResult(request, []);
    }
    const domainResults = synchronized
      ? []
      : (request.domainIds ?? [])
          .filter((domainId) => requestedDifferences.has(domainId))
          .map((domainId) => ({
            domainId,
            status: 'action-required' as const,
            differingEntityCount: 1,
            changeOrigin: 'unknown' as const,
          }));
    return runResult(request, domainResults);
  });
  const value = {
    schedule,
    dispose: vi.fn(),
    cancelScheduled: vi.fn(),
    getSnapshot: vi.fn(),
    subscribe: vi.fn(),
    run: vi.fn(),
    retryFailures: vi.fn(),
  } as unknown as SyncOrchestrator;
  return {
    value,
    schedule,
    resetForLocalChange(domainId: SyncOrchestratorDomainId) {
      synchronized = false;
      requestedDifferences = new Set([domainId]);
      schedule.mockClear();
    },
  };
}

describe('AutomaticSyncController — domaines merge-safe Lot 1', () => {
  it('revalide puis fusionne Account Preferences, Rewards/Routines et Daily Coaching ensemble', async () => {
    const testClient = client();
    const { value, schedule } = mergeSafeOrchestrator();
    const controller = new AutomaticSyncController({
      client: testClient,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => value,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });

    await controller.initialize();

    expect(testClient.syncNow).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenNthCalledWith(1, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [...MERGE_DOMAINS],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [...MERGE_DOMAINS],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(3, {
      operation: 'sync',
      syncMode: 'bidirectional',
      source: 'application-start',
      domainIds: [...MERGE_DOMAINS],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(4, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [...MERGE_DOMAINS],
      delayMs: 0,
    });

    controller.dispose();
  });

  it.each(MERGE_DOMAINS)('cible uniquement %s après une mutation locale persistée', async (domainId) => {
    const eventTarget = new EventTarget();
    const testClient = client();
    const harness = mergeSafeOrchestrator();
    const controller = new AutomaticSyncController({
      client: testClient,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => harness.value,
      eventTarget,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });

    await controller.initialize();
    harness.resetForLocalChange(domainId);
    vi.mocked(testClient.syncNow).mockClear();

    eventTarget.dispatchEvent(new CustomEvent<SyncLocalDataChangedDetail>(
      SYNC_LOCAL_DATA_CHANGED_EVENT,
      { detail: { domainIds: [domainId], reason: 'test-persisted-write' } },
    ));

    await vi.waitFor(() => {
      expect(harness.schedule).toHaveBeenCalledWith({
        operation: 'sync',
        syncMode: 'bidirectional',
        source: 'local-change',
        domainIds: [domainId],
        delayMs: 0,
      });
    });

    expect(harness.schedule.mock.calls.every(([request]) =>
      (request.domainIds ?? []).every((candidate) => candidate === domainId),
    )).toBe(true);
    expect(testClient.syncNow).toHaveBeenCalledTimes(2);

    controller.dispose();
  });
});
