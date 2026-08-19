import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
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

const USER_ID = 'user-automatic-nutrition';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

const ALL_AUTOMATIC_DOMAINS = [
  'account-preferences',
  'rewards-routines',
  'weights',
  'activities',
  'goals',
  'strength',
  'nutrition-journal',
  'nutrition-library',
  'nutrition-tracking',
  'daily-coaching',
] as const satisfies readonly SyncOrchestratorDomainId[];

const NUTRITION_DOMAINS = [
  'nutrition-journal',
  'nutrition-library',
  'nutrition-tracking',
] as const satisfies readonly SyncOrchestratorDomainId[];

function snapshot(
  nutritionEnabled = true,
): SyncPrototypeSnapshot {
  return {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realAccountPreferences: { enabled: true, status: 'idle' },
    realRewardsRoutines: { enabled: true, status: 'idle' },
    realWeights: { enabled: true, status: 'idle' },
    realActivities: { enabled: true, status: 'idle' },
    realGoals: { enabled: true, status: 'idle' },
    realStrength: { enabled: true, status: 'idle' },
    realNutritionJournal: {
      enabled: nutritionEnabled,
      status: nutritionEnabled ? 'idle' : 'disabled',
    },
    realNutritionLibrary: {
      enabled: nutritionEnabled,
      status: nutritionEnabled ? 'idle' : 'disabled',
    },
    realNutritionTracking: {
      enabled: nutritionEnabled,
      status: nutritionEnabled ? 'idle' : 'disabled',
    },
    realDailyCoaching: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };
}

function client(
  nutritionEnabled = true,
): SyncPrototypeClient {
  const current = snapshot(nutritionEnabled);
  return {
    getSnapshot: () => current,
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
  const timestamp = '2026-08-19T14:30:00.000Z';
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

function nutritionMergeOrchestrator() {
  let synchronized = false;
  const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) => {
    if (request.operation === 'sync') {
      synchronized = true;
      return result(request);
    }

    const domainResults = synchronized
      ? []
      : (request.domainIds ?? [])
          .filter((domainId) => NUTRITION_DOMAINS.includes(
            domainId as (typeof NUTRITION_DOMAINS)[number],
          ))
          .map((domainId) => ({
            domainId,
            status: 'action-required' as const,
            differingEntityCount: 1,
            changeOrigin: 'unknown' as const,
          }));

    return result(request, domainResults);
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

describe('AutomaticSyncController — domaines Nutrition Lot 2', () => {
  it('sélectionne les 10 domaines actifs et traite Nutrition uniquement en merge-safe', async () => {
    const testClient = client();
    const { value, schedule } = nutritionMergeOrchestrator();
    const controller = new AutomaticSyncController({
      client: testClient,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => value,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    expect(schedule).toHaveBeenNthCalledWith(1, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [...ALL_AUTOMATIC_DOMAINS],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(2, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [...NUTRITION_DOMAINS],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(3, {
      operation: 'sync',
      syncMode: 'bidirectional',
      source: 'application-start',
      domainIds: [...NUTRITION_DOMAINS],
      delayMs: 0,
    });
    expect(schedule).toHaveBeenNthCalledWith(4, {
      operation: 'analyze',
      source: 'application-start',
      domainIds: [...NUTRITION_DOMAINS],
      delayMs: 0,
    });

    const nutritionSyncCalls = schedule.mock.calls
      .map(([request]) => request)
      .filter((request) => request.operation === 'sync');
    expect(nutritionSyncCalls).toHaveLength(1);
    expect(nutritionSyncCalls[0]?.syncMode).toBe('bidirectional');
    expect(testClient.syncNow).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it('exclut les trois domaines Nutrition lorsqu’ils sont désactivés', async () => {
    const testClient = client(false);
    const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
      result(request));
    const orchestrator = {
      schedule,
      dispose: vi.fn(),
      cancelScheduled: vi.fn(),
      getSnapshot: vi.fn(),
      subscribe: vi.fn(),
      run: vi.fn(),
      retryFailures: vi.fn(),
    } as unknown as SyncOrchestrator;
    const controller = new AutomaticSyncController({
      client: testClient,
      settingsRepository: settingsRepository(),
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
    });

    await controller.initialize();

    const firstRequest = schedule.mock.calls[0]?.[0];
    expect(firstRequest?.operation).toBe('analyze');
    expect(firstRequest?.domainIds).toEqual([
      'account-preferences',
      'rewards-routines',
      'weights',
      'activities',
      'goals',
      'strength',
      'daily-coaching',
    ]);
    expect(firstRequest?.domainIds).not.toEqual(
      expect.arrayContaining([...NUTRITION_DOMAINS]),
    );
    expect(testClient.syncNow).not.toHaveBeenCalled();

    controller.dispose();
  });
});
