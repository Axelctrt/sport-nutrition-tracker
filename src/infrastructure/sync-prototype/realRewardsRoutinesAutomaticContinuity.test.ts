import Dexie, { type Table } from 'dexie';

import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import {
  flushRoutineReminderCompletionPersistence,
  recordRoutineReminderCompletion,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  flushAchievementStatePersistence,
  unlockAchievements,
} from '@/domain/rewards/achievements';
import {
  activateVisualTheme,
  flushVisualThemeStatePersistence,
  unlockVisualThemes,
} from '@/domain/rewards/visualThemes';
import {
  flushWeeklyMissionHistoryPersistence,
  recordCompletedWeeklyMission,
} from '@/domain/rewards/weeklyMissionHistory';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealRewardsRoutinesSync,
  synchronizeRealRewardsRoutines,
  type RewardsRoutinesAggregate,
} from '@/infrastructure/sync-prototype/realRewardsRoutinesSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import {
  initializeUserStateRuntime,
} from '@/infrastructure/user-state/userStateRuntime';
import { VISUAL_THEME_PREFERENCE_ID } from '@/infrastructure/user-state/userStateModels';

const USER_ID = 'rewards-routines-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

type CloudAggregate = RewardsRoutinesAggregate & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};

class TestCloudDatabase extends Dexie {
  declare realRewardsRoutines: Table<CloudAggregate, string>;

  constructor(label: string) {
    super(`sportpilot-rewards-routines-a-b-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({ realRewardsRoutines: 'id, updatedAt' });
  }
}

function createDeviceClient(
  local: AppDatabase,
  cloud: TestCloudDatabase,
): SyncPrototypeClient {
  let snapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realRewardsRoutines: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  } as SyncPrototypeSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealRewardsRoutines = vi.fn(async () => {
    const preview = await previewRealRewardsRoutinesSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realRewardsRoutines: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealRewardsRoutines,
    syncRealRewardsRoutines: vi.fn(async () =>
      synchronizeRealRewardsRoutines(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )),
  } as unknown as SyncPrototypeClient;
}

async function replicateCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const rows = await source.realRewardsRoutines.toArray();
  await target.realRewardsRoutines.clear();
  if (rows.length > 0) await target.realRewardsRoutines.bulkPut(rows);
}

describe('gate A→B Rewards/Routines', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    window.localStorage.clear();
    localA = new AppDatabase(`rewards-routines-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`rewards-routines-b-${crypto.randomUUID()}`);
    cloudA = new TestCloudDatabase('a');
    cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);
    await initializeUserStateRuntime(localA);
  });

  afterEach(async () => {
    window.localStorage.clear();
    const names = [localA.name, localB.name, cloudA.name, cloudB.name];
    localA.close();
    localB.close();
    cloudA.close();
    cloudB.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('mutations persistées A → upload automatique → B frais restaure rewards et rappels sans modifier son thème appareil', async () => {
    const settingsA = new DexieSettingsRepository(localA);
    await settingsA.update({
      automaticAccountSyncEnabled: true,
      automaticAccountSyncConnectionMode: 'any-connection',
      automaticAccountSyncAccountFingerprint: FINGERPRINT,
    });

    const clientA = createDeviceClient(localA, cloudA);
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: settingsA,
      eventTarget: window,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controllerA.initialize();

    unlockAchievements(['first-session'], '2026-08-19T12:00:00.000Z');
    await flushAchievementStatePersistence();
    await vi.waitFor(async () => {
      expect((await cloudA.realRewardsRoutines.get('#rewards-routines'))
        ?.earnedAchievements).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'first-session' })]),
      );
    });

    unlockVisualThemes(['emerald-focus'], '2026-08-19T12:01:00.000Z');
    activateVisualTheme('emerald-focus');
    await flushVisualThemeStatePersistence();
    await vi.waitFor(async () => {
      expect((await cloudA.realRewardsRoutines.get('#rewards-routines'))
        ?.visualThemePreference.activeThemeId).toBe('emerald-focus');
    });

    recordCompletedWeeklyMission(
      '2026-08-17',
      '2026-08-19T12:02:00.000Z',
      new Date(2026, 7, 19),
    );
    await flushWeeklyMissionHistoryPersistence();
    await vi.waitFor(async () => {
      expect((await cloudA.realRewardsRoutines.get('#rewards-routines'))
        ?.weeklyMissionCompletions.length).toBe(1);
    });

    recordRoutineReminderCompletion(
      '2026-08-19',
      'weighIn',
      '2026-08-19T12:03:00.000Z',
    );
    await flushRoutineReminderCompletionPersistence();
    await vi.waitFor(async () => {
      expect((await cloudA.realRewardsRoutines.get('#rewards-routines'))
        ?.routineReminderCompletions.length).toBe(1);
    });

    const currentSettings = await settingsA.get();
    await settingsA.update({
      routineReminderPreferences: {
        ...currentSettings.routineReminderPreferences!,
        snoozeMinutes: 45,
      },
    });
    await vi.waitFor(async () => {
      expect((await cloudA.realRewardsRoutines.get('#rewards-routines'))
        ?.routineReminderPreferences.value.snoozeMinutes).toBe(45);
    });

    controllerA.dispose();
    await replicateCloud(cloudA, cloudB);

    const settingsB = new DexieSettingsRepository(localB);
    await settingsB.update({ theme: 'dark' });
    const cloudBeforeRestore = await cloudB.realRewardsRoutines.toArray();
    await synchronizeRealRewardsRoutines(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(await localB.earnedAchievements.get('first-session')).toBeDefined();
    expect(await localB.unlockedVisualThemes.get('emerald-focus')).toBeDefined();
    expect(await localB.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID))
      .toMatchObject({ activeThemeId: 'emerald-focus' });
    expect(await localB.weeklyMissionCompletions.count()).toBe(1);
    expect(await localB.routineReminderCompletions.count()).toBe(1);
    expect(await settingsB.get()).toMatchObject({
      theme: 'dark',
      routineReminderPreferences: { snoozeMinutes: 45 },
    });
    expect(await cloudB.realRewardsRoutines.toArray()).toEqual(cloudBeforeRestore);
  });
});
