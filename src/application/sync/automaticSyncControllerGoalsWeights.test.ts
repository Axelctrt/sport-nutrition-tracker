import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import type {
  SyncOrchestrator,
  SyncOrchestratorRunResult,
  SyncOrchestratorScheduleRequest,
} from '@/application/sync/syncOrchestrator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import {
  GOAL_STATE_CHANGED_EVENT,
  GOAL_STATE_PERSISTED_EVENT,
} from '@/domain/goals/goalState';
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
    realAccountPreferences: { enabled: true, status: 'idle' },
    realRewardsRoutines: { enabled: true, status: 'idle' },
    realWeights: { enabled: true, status: 'idle' },
    realActivities: { enabled: true, status: 'idle' },
    realGoals: { enabled: true, status: 'idle' },
    realStrength: { enabled: true, status: 'idle' },
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

describe('AutomaticSyncController — whitelist automatique Lot 1', () => {
  it('automatise Goals cloud-only puis Weights et Activities local-only', async () => {
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

    expect(schedule).toHaveBeenNthCalledWith(1, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [
        'account-preferences',
        'rewards-routines',
        'weights',
        'activities',
        'goals',
        'strength',
        'daily-coaching',
      ],
      delayMs: 0,
    });
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
      domainIds: ['weights', 'activities'],
      delayMs: 0,
    });
    const writtenDomainIds = schedule.mock.calls
      .slice(1)
      .flatMap(([request]) => request.domainIds ?? []);
    expect(writtenDomainIds).toEqual(
      expect.arrayContaining(['goals', 'weights', 'activities']),
    );
    expect(writtenDomainIds).not.toEqual(
      expect.arrayContaining([
        'account-preferences',
        'rewards-routines',
        'nutrition-journal',
        'nutrition-library',
        'nutrition-tracking',
        'daily-coaching',
      ]),
    );
    controller.dispose();
  });

  it('résout Goals both via merge-safe mais laisse unknown Weights intact', async () => {
    const { value, schedule } = orchestrator([
      {
        domainId: 'goals',
        status: 'action-required',
        differingEntityCount: 2,
        changeOrigin: 'both',
      },
      {
        domainId: 'weights',
        status: 'action-required',
        differingEntityCount: 1,
        changeOrigin: 'unknown',
      },
    ]);
    const testClient = client();
    const controller = new AutomaticSyncController({
      client: testClient,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => value,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(testClient.syncNow).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledTimes(4);

    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: ['goals'],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(3, {
      operation: 'sync',
      syncMode: 'bidirectional',
      source: 'application-start',
      domainIds: ['goals'],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(4, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: ['goals'],
      delayMs: 0,
    });

    const synchronizedDomains = schedule.mock.calls
      .filter(([request]) => request.operation === 'sync')
      .flatMap(([request]) => request.domainIds ?? []);

    expect(synchronizedDomains).toEqual(['goals']);
    expect(synchronizedDomains).not.toContain('weights');

    controller.dispose();
  });

  it('ignore goals-changed et déclenche Goals seulement après goals-persisted', async () => {
    const eventTarget = new EventTarget();
    const { value, schedule } = orchestrator([
      {
        domainId: 'goals',
        status: 'local-changes-pending',
        differingEntityCount: 1,
        changeOrigin: 'local',
      },
    ]);
    const controller = new AutomaticSyncController({
      client: client(),
      settingsRepository: settingsRepository(),
      createOrchestrator: () => value,
      eventTarget,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controller.initialize();
    schedule.mockClear();

    eventTarget.dispatchEvent(new Event(GOAL_STATE_CHANGED_EVENT));
    await Promise.resolve();
    expect(schedule).not.toHaveBeenCalled();

    eventTarget.dispatchEvent(new Event(GOAL_STATE_PERSISTED_EVENT));
    await vi.waitFor(() => expect(schedule).toHaveBeenCalled());
    expect(schedule).toHaveBeenNthCalledWith(1, {
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['goals'],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'sync',
      syncMode: 'local-only',
      source: 'local-change',
      domainIds: ['goals'],
      delayMs: 0,
    });
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
