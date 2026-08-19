import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
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
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'rewards-event-isolation-user';
const ACCOUNT_FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

function completedRun(
  request: SyncOrchestratorScheduleRequest,
): SyncOrchestratorRunResult {
  const timestamp = '2026-08-19T11:30:00.000Z';
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

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AutomaticSyncController Rewards/Routines event isolation', () => {
  it('ignore les événements UI historiques et ne réagit qu’au signal post-persistance', async () => {
    const eventTarget = new EventTarget();
    const snapshot = {
      account: {
        isLoggedIn: true,
        isLoading: false,
        userId: USER_ID,
      },
      realRewardsRoutines: {
        enabled: true,
        status: 'idle',
      },
    } as unknown as SyncPrototypeSnapshot;
    const client = {
      initialize: vi.fn(async () => undefined),
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn(() => () => undefined),
    } as unknown as SyncPrototypeClient;
    const settings = {
      ...createDefaultAppSettings(),
      automaticAccountSyncEnabled: true,
      automaticAccountSyncConnectionMode: 'any-connection' as const,
      automaticAccountSyncAccountFingerprint: ACCOUNT_FINGERPRINT,
    };
    const settingsRepository = {
      get: vi.fn(async () => settings),
      update: vi.fn(async () => settings),
      reset: vi.fn(async () => settings),
    } as unknown as SettingsRepository;
    const schedule = vi.fn(async (request: SyncOrchestratorScheduleRequest) =>
      completedRun(request));
    const orchestrator = {
      schedule,
      dispose: vi.fn(),
    } as unknown as SyncOrchestrator;
    const controller = new AutomaticSyncController({
      client,
      settingsRepository,
      eventTarget,
      createOrchestrator: () => orchestrator,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });

    await controller.initialize();
    schedule.mockClear();

    eventTarget.dispatchEvent(
      new Event('sport-pilot:weekly-mission-history-changed'),
    );
    eventTarget.dispatchEvent(
      new Event('sportpilot:routine-reminders-changed'),
    );
    await flush();

    expect(schedule).not.toHaveBeenCalled();

    eventTarget.dispatchEvent(
      new CustomEvent<SyncLocalDataChangedDetail>(
        SYNC_LOCAL_DATA_CHANGED_EVENT,
        {
          detail: {
            domainIds: ['rewards-routines'],
            reason: 'weekly-mission-state-write',
          },
        },
      ),
    );

    await vi.waitFor(() => expect(schedule).toHaveBeenCalledTimes(1));
    expect(schedule).toHaveBeenCalledWith({
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['rewards-routines'],
      delayMs: 0,
    });

    controller.dispose();
  });
});
