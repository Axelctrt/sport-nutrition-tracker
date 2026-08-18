import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import type {
  SyncOrchestrator,
  SyncOrchestratorRunResult,
  SyncOrchestratorScheduleRequest,
} from '@/application/sync/syncOrchestrator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  ENDURANCE_PLANNING_PERSISTED_EVENT,
} from '@/domain/planning/endurancePlanningState';
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

const USER_ID = 'automatic-activities-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

function snapshot(): SyncPrototypeSnapshot {
  return {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realActivities: {
      enabled: true,
      status: 'ready',
      preview: {
        localActivityCount: 0,
        cloudActivityCount: 0,
        localDeletionCount: 0,
        cloudDeletionCount: 0,
        differingEntityCount: 0,
      },
    },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  };
}

function client(): SyncPrototypeClient {
  const current = snapshot();
  return {
    getSnapshot: () => current,
    subscribe: () => () => undefined,
    initialize: vi.fn(async () => undefined),
  } as unknown as SyncPrototypeClient;
}

function settingsRepository(): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint: FINGERPRINT,
    automaticWeightSyncEnabled: false,
  };
  return {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => Object.assign(settings, changes)),
    reset: vi.fn(async () => settings),
  };
}

function result(
  request: SyncOrchestratorScheduleRequest,
  domainResults: SyncOrchestratorRunResult['domainResults'] = [],
): SyncOrchestratorRunResult {
  return {
    operation: request.operation,
    source: request.source ?? 'manual',
    startedAt: '2026-08-18T13:00:00.000Z',
    completedAt: '2026-08-18T13:00:01.000Z',
    completedDomainIds: [...(request.domainIds ?? [])],
    failedDomainIds: [],
    domainResults,
  };
}

function orchestrator(
  analyzeResult: (request: SyncOrchestratorScheduleRequest) => SyncOrchestratorRunResult['domainResults'],
) {
  const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
    result(request, request.operation === 'analyze' ? analyzeResult(request) : []));
  return {
    schedule,
    value: {
      schedule,
      dispose: vi.fn(),
      cancelScheduled: vi.fn(),
      getSnapshot: vi.fn(),
      subscribe: vi.fn(),
      run: vi.fn(),
      retryFailures: vi.fn(),
    } as unknown as SyncOrchestrator,
  };
}

describe('AutomaticSyncController — Activities', () => {
  it('converge automatiquement Activities quand une analyse fraîche prouve cloud-only', async () => {
    const run = orchestrator(() => [{
      domainId: 'activities',
      status: 'cloud-changes-available',
      differingEntityCount: 1,
      changeOrigin: 'cloud',
    }]);
    const controller = new AutomaticSyncController({
      client: client(),
      settingsRepository: settingsRepository(),
      createOrchestrator: () => run.value,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(run.schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'cloud-only',
      source: 'application-start',
      domainIds: ['activities'],
      delayMs: 0,
    });
    controller.dispose();
  });

  it('déclenche Activities sur PERSISTED seulement puis envoie local-only', async () => {
    const eventTarget = new EventTarget();
    let localChange = false;
    const run = orchestrator((request) =>
      request.source === 'local-change' && localChange
        ? [{
            domainId: 'activities',
            status: 'local-changes-pending',
            differingEntityCount: 1,
            changeOrigin: 'local',
          }]
        : []);
    const controller = new AutomaticSyncController({
      client: client(),
      settingsRepository: settingsRepository(),
      eventTarget,
      createOrchestrator: () => run.value,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controller.initialize();
    run.schedule.mockClear();

    eventTarget.dispatchEvent(new Event(ENDURANCE_PLANNING_CHANGED_EVENT));
    await Promise.resolve();
    expect(run.schedule).not.toHaveBeenCalled();

    localChange = true;
    eventTarget.dispatchEvent(new Event(ENDURANCE_PLANNING_PERSISTED_EVENT));
    await vi.waitFor(() => expect(run.schedule).toHaveBeenCalledTimes(2));
    expect(run.schedule).toHaveBeenNthCalledWith(1, {
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['activities'],
      delayMs: 0,
    });
    expect(run.schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'local-only',
      source: 'local-change',
      domainIds: ['activities'],
      delayMs: 0,
    });
    controller.dispose();
  });

  it.each(['unknown', 'both'] as const)(
    'n’écrit jamais Activities automatiquement pour %s',
    async (changeOrigin) => {
      const run = orchestrator(() => [{
        domainId: 'activities',
        status: 'action-required',
        differingEntityCount: 1,
        changeOrigin,
      }]);
      const controller = new AutomaticSyncController({
        client: client(),
        settingsRepository: settingsRepository(),
        createOrchestrator: () => run.value,
        lifecycleDebounceMs: 0,
      });

      await controller.initialize();

      expect(run.schedule).toHaveBeenCalledTimes(1);
      expect(run.schedule).not.toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'sync' }),
      );
      controller.dispose();
    },
  );
});
