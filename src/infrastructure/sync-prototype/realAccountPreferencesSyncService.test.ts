import Dexie, { type Table } from 'dexie';

import { createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID, USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { UserProfile } from '@/domain/models/profile';
import type { UserSettings } from '@/domain/models/settings';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  ACCOUNT_PREFERENCES_AGGREGATE_ID,
  createSyncedUserSettingsSnapshot,
  previewRealAccountPreferencesSync,
  synchronizeRealAccountPreferences,
  type AccountPreferencesAggregate,
} from '@/infrastructure/sync-prototype/realAccountPreferencesSyncService';

type CloudAggregate = AccountPreferencesAggregate & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};

class TestCloudDatabase extends Dexie {
  declare realAccountPreferences: Table<CloudAggregate, string>;

  constructor() {
    super(`sportpilot-e1-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({ realAccountPreferences: 'id, updatedAt' });
  }
}

const T1 = '2026-07-01T08:00:00.000Z';
const T2 = '2026-07-02T08:00:00.000Z';
const T3 = '2026-07-03T08:00:00.000Z';

function profile(updatedAt = T1, firstName = 'Alex'): UserProfile {
  return {
    id: LOCAL_USER_PROFILE_ID,
    firstName,
    sexForEnergyEquation: 'male',
    ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-07-01' },
    heightCm: 178,
    initialWeightKg: 70,
    goal: 'maintenance',
    targetWeeklyWeightChangePercent: 0,
    occupationalActivity: 'sedentary',
    dailyStepGoal: 8_000,
    proteinGramsPerKg: 1.8,
    fatGramsPerKg: 0.8,
    createdAt: T1,
    updatedAt,
  };
}

function settings(updatedAt = T1, includedBaseSteps = 3_000): UserSettings {
  return {
    ...createDefaultUserSettings(),
    id: USER_SETTINGS_ID,
    includedBaseSteps,
    createdAt: T1,
    updatedAt,
    syncableUpdatedAt: updatedAt,
  };
}

function aggregate(
  profileValue: UserProfile | undefined,
  settingsValue: UserSettings,
): AccountPreferencesAggregate {
  const syncedSettings = createSyncedUserSettingsSnapshot(settingsValue);
  return {
    id: ACCOUNT_PREFERENCES_AGGREGATE_ID,
    ...(profileValue ? { profile: profileValue } : {}),
    settings: syncedSettings,
    updatedAt: [profileValue?.updatedAt, syncedSettings.updatedAt]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)!,
  };
}

describe('synchronisation E1 du profil et des réglages', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-e1-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie le profil et les réglages une seule fois', async () => {
    await local.userProfile.put(profile());
    await local.userSettings.put(settings());

    const first = await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedProfiles).toBe(1);
    expect(first.uploadedSettings).toBe(1);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realAccountPreferences.get('#account-preferences'))
      .toMatchObject({ profile: { firstName: 'Alex' }, settings: { includedBaseSteps: 3_000 } });
  });

  it('télécharge la version cloud la plus récente', async () => {
    await local.userProfile.put(profile(T1, 'Local'));
    await local.userSettings.put(settings(T1, 3_000));
    await cloud.realAccountPreferences.put({
      ...aggregate(profile(T2, 'Cloud'), settings(T2, 4_000)),
      id: '#account-preferences',
      owner: 'user-1',
    });

    const result = await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedProfiles).toBe(1);
    expect(result.downloadedSettings).toBe(1);
    expect(await local.userProfile.get(LOCAL_USER_PROFILE_ID))
      .toMatchObject({ firstName: 'Cloud' });
    expect(await local.userSettings.get(USER_SETTINGS_ID))
      .toMatchObject({ includedBaseSteps: 4_000, syncableUpdatedAt: T2 });
  });

  it('préserve les rappels locaux lorsque les réglages cloud sont reçus', async () => {
    const localSettings = settings(T3, 3_000);
    localSettings.routineReminderPreferences = {
      ...localSettings.routineReminderPreferences!,
      snoozeMinutes: 120,
    };
    localSettings.updatedAt = T3;
    localSettings.syncableUpdatedAt = T1;
    await local.userSettings.put(localSettings);
    await cloud.realAccountPreferences.put({
      ...aggregate(profile(T2), settings(T2, 4_000)),
      id: '#account-preferences',
      owner: 'user-1',
    });

    await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.userSettings.get(USER_SETTINGS_ID)).toMatchObject({
      includedBaseSteps: 4_000,
      syncableUpdatedAt: T2,
      routineReminderPreferences: { snoozeMinutes: 120 },
    });
  });

  it('restaure le cloud sur un espace local vierge sans que les valeurs par défaut gagnent', async () => {
    await local.userSettings.put(settings(T3, 3_000));
    await cloud.realAccountPreferences.put({
      ...aggregate(profile(T1, 'Compte'), settings(T1, 4_500)),
      id: '#account-preferences',
      owner: 'user-1',
    });

    await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
      { writeCloud: false },
    );

    expect(await local.userProfile.get(LOCAL_USER_PROFILE_ID))
      .toMatchObject({ firstName: 'Compte' });
    expect(await local.userSettings.get(USER_SETTINGS_ID))
      .toMatchObject({ includedBaseSteps: 4_500 });
  });

  it('ignore un changement limité aux rappels dans la comparaison', async () => {
    const localSettings = settings(T3, 3_000);
    localSettings.syncableUpdatedAt = T1;
    localSettings.routineReminderPreferences = {
      ...localSettings.routineReminderPreferences!,
      snoozeMinutes: 120,
    };
    await local.userSettings.put(localSettings);
    await cloud.realAccountPreferences.put({
      ...aggregate(undefined, settings(T1, 3_000)),
      id: '#account-preferences',
      owner: 'user-1',
    });

    const preview = await previewRealAccountPreferencesSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
  });

  it('isole les préférences appartenant à un autre compte', async () => {
    await cloud.realAccountPreferences.put({
      ...aggregate(profile(T2, 'Autre compte'), settings(T2, 4_000)),
      id: '#account-preferences',
      owner: 'other-user',
    });

    const result = await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
      { writeCloud: false },
    );

    expect(result.cloudProfilePresent).toBe(false);
    expect(await local.userProfile.count()).toBe(0);
  });
});
