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
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'user-goals-weights-controller';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

function client(): SyncPrototypeClient {
  const snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    initialize: async () => undefined,
  } as unknown as SyncPrototypeClient;
}

function settingsRepository(
  overrides: Partial<AppSettings> = {},
): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint: FINGERPRINT,
    automaticWeightSyncEnabled: false,
    ...overrides,
  };
  return {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => Object.assign(settings, changes)),
    reset: vi.fn(async () => settings),
  };
}

function completedRun(
  request: SyncOrchestratorScheduleRequest,
): SyncOrchestratorRunResult {
  const timestamp = '2026-08-17T16:00:00.000Z';
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

function orchestrator(
  analysisDomainResults: SyncOrchestratorRunResult['domainResults'],
) {
  const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) => {
    const result = completedRun(request);
    return request.operation === 'analyze'
      ? { ...result, domainResults: analysisDomainResults }
      : result;
  });
  return {
    value: {
      schedule,
      dispose: vi.fn(),
      cancelScheduled: vi.fn(),
      getSnapshot: vi.fn(),
      subscribe: vi.fn(),
      run: vi.fn(),
      retryFailures: vi.fn(),
    } as unknown as SyncOrchestrator,
    schedule,
  };
}

describe('AutomaticSyncController — whitelist Goals + Weights', () => {
  it('automatise Goals cloud-only et Weights local-only sans élargir Activities', async () => {
    const { value, schedule } = orchestrator([
      {
        domainId: 'goals',
        status: 'cloud-changes-available',
        differingEntityCount: 1,
        changeOrigin: 'cloud',
      },
      {
        domainId: 'weights',
        status: 'local-changes-pending',
        differingEntityCount: 1,
        changeOrigin: 'local',
      },
      {
        domainId: 'activities',
        status: 'local-changes-pending',
        differingEntityCount: 1,
        changeOrigin: 'local',
      },
    ]);
    const controller = new AutomaticSyncController({
      client: client(),
      settingsRepository: settingsRepository(),
      createOrchestrator: () => value,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledTimes(3);
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'cloud-only',
      source: 'application-start',
      domainIds: ['goals'],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(3, {
      operation: 'sync',
      syncMode: 'local-only',
      source: 'application-start',
      domainIds: ['weights'],
      delayMs: 0,
    });
    expect(schedule.mock.calls.flatMap(([request]) => request.domainIds ?? []))
      .toContain('activities');
    expect(schedule.mock.calls.slice(1).flatMap(([request]) => request.domainIds ?? []))
      .not.toContain('activities');
    controller.dispose();
  });

  it('laisse both et unknown au stade analyse sans écriture automatique', async () => {
    const { value, schedule } = orchestrator([
      {
        domainId: 'goals',
        status: 'action-required',
        differingEntityCount: 2,
        changeOrigin: 'both',
      },
      {
        domainId: 'weights',
        status: 'local-changes-pending',
        differingEntityCount: 1,
        changeOrigin: 'unknown',
      },
    ]);
    const controller = new AutomaticSyncController({
      client: client(),
      settingsRepository: settingsRepository(),
      createOrchestrator: () => value,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'analyze',
    }));
    controller.dispose();
  });

  it('préserve le contrôleur historique Weights quand automaticWeightSyncEnabled est actif', async () => {
    const { value, schedule } = orchestrator([]);
    const controller = new AutomaticSyncController({
      client: client(),
      settingsRepository: settingsRepository({ automaticWeightSyncEnabled: true }),
      createOrchestrator: () => value,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'analyze',
      domainIds: expect.not.arrayContaining(['weights']),
    }));
    controller.dispose();
  });
});
