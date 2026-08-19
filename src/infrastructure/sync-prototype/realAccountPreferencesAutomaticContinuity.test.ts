import Dexie, { type Table } from 'dexie';

import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { UserProfile } from '@/domain/models/profile';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieProfileRepository } from '@/infrastructure/repositories/dexie/DexieProfileRepository';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealAccountPreferencesSync,
  synchronizeRealAccountPreferences,
  type AccountPreferencesAggregate,
} from '@/infrastructure/sync-prototype/realAccountPreferencesSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'account-preferences-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;

type CloudAggregate = AccountPreferencesAggregate & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};

class TestCloudDatabase extends Dexie {
  declare realAccountPreferences: Table<CloudAggregate, string>;

  constructor(label: string) {
    super(`sportpilot-account-preferences-a-b-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({ realAccountPreferences: 'id, updatedAt' });
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
    realAccountPreferences: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  } as SyncPrototypeSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealAccountPreferences = vi.fn(async () => {
    const preview = await previewRealAccountPreferencesSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realAccountPreferences: { enabled: true, status: 'ready', preview },
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
    analyzeRealAccountPreferences,
    syncRealAccountPreferences: vi.fn(async () =>
      synchronizeRealAccountPreferences(
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
  const rows = await source.realAccountPreferences.toArray();
  await target.realAccountPreferences.clear();
  if (rows.length > 0) await target.realAccountPreferences.bulkPut(rows);
}

function profileInput(): Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    firstName: 'Compte A',
    sexForEnergyEquation: 'male',
    ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-08-19' },
    heightCm: 178,
    initialWeightKg: 70,
    goal: 'maintenance',
    targetWeeklyWeightChangePercent: 0,
    occupationalActivity: 'sedentary',
    dailyStepGoal: 8_000,
    proteinGramsPerKg: 1.8,
    fatGramsPerKg: 0.8,
  };
}

describe('gate A→B Account Preferences', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    localA = new AppDatabase(`account-preferences-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`account-preferences-b-${crypto.randomUUID()}`);
    cloudA = new TestCloudDatabase('a');
    cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);
  });

  afterEach(async () => {
    const names = [localA.name, localB.name, cloudA.name, cloudB.name];
    localA.close();
    localB.close();
    cloudA.close();
    cloudB.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('profil + réglage partageable A déclenchent le cloud automatique puis B frais les restaure sans toucher au thème appareil', async () => {
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

    const profileRepository = new DexieProfileRepository(localA);
    await profileRepository.save(profileInput());
    await vi.waitFor(async () => {
      expect(await cloudA.realAccountPreferences.get('#account-preferences'))
        .toMatchObject({ profile: { firstName: 'Compte A' } });
    });

    await settingsA.update({ includedBaseSteps: 4_200 });
    await vi.waitFor(async () => {
      expect(await cloudA.realAccountPreferences.get('#account-preferences'))
        .toMatchObject({ settings: { includedBaseSteps: 4_200 } });
    });

    await replicateCloud(cloudA, cloudB);

    const settingsB = new DexieSettingsRepository(localB);
    await settingsB.update({ theme: 'dark' });
    const cloudBeforeRestore = await cloudB.realAccountPreferences.toArray();
    const restored = await synchronizeRealAccountPreferences(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(restored.downloadedProfiles).toBe(1);
    expect(restored.downloadedSettings).toBe(1);
    expect(await localB.userProfile.get(LOCAL_USER_PROFILE_ID)).toMatchObject({
      firstName: 'Compte A',
    });
    expect(await settingsB.get()).toMatchObject({
      includedBaseSteps: 4_200,
      theme: 'dark',
    });
    expect(await cloudB.realAccountPreferences.toArray()).toEqual(cloudBeforeRestore);

    controllerA.dispose();
  });
});
