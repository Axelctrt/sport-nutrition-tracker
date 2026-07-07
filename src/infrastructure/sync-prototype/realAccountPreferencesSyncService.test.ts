import Dexie, { type Table } from 'dexie';

import { createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID, USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { UserProfile } from '@/domain/models/profile';
import type { UserSettings } from '@/domain/models/settings';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  FRIENDS_PRIVACY_SETTINGS_ID,
  type StoredFriendsPrivacySettings,
} from '@/domain/friends/friendship';
import {
  createSocialActivityGlobalSharingPolicy,
  type SocialActivityGlobalSharingPolicy,
} from '@/domain/friends/socialActivitySharingPolicy';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT } from '@/infrastructure/sync-prototype/socialActivityPrivacySyncEvents';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  ACCOUNT_PREFERENCES_AGGREGATE_ID,
  SOCIAL_ACTIVITY_SHARING_PREFERENCES_ID,
  SOCIAL_PROFILE_VISIBILITY_PREFERENCES_ID,
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
  social: {
    readonly visibility?: {
      readonly value: 'private' | 'friends' | 'public';
      readonly updatedAt: string;
    };
    readonly policy?: {
      readonly value: SocialActivityGlobalSharingPolicy;
      readonly updatedAt: string;
    };
  } = {},
): AccountPreferencesAggregate {
  const syncedSettings = createSyncedUserSettingsSnapshot(settingsValue);
  const socialProfileVisibility = social.visibility
    ? ({
        id: SOCIAL_PROFILE_VISIBILITY_PREFERENCES_ID,
        visibility: social.visibility.value,
        updatedAt: social.visibility.updatedAt,
      } satisfies NonNullable<AccountPreferencesAggregate['socialProfileVisibility']>)
    : undefined;
  const socialActivitySharing = social.policy
    ? ({
        id: SOCIAL_ACTIVITY_SHARING_PREFERENCES_ID,
        policy: social.policy.value,
        updatedAt: social.policy.updatedAt,
      } satisfies NonNullable<AccountPreferencesAggregate['socialActivitySharing']>)
    : undefined;
  return {
    id: ACCOUNT_PREFERENCES_AGGREGATE_ID,
    ...(profileValue ? { profile: profileValue } : {}),
    settings: syncedSettings,
    ...(socialProfileVisibility ? { socialProfileVisibility } : {}),
    ...(socialActivitySharing ? { socialActivitySharing } : {}),
    updatedAt: [
      profileValue?.updatedAt,
      syncedSettings.updatedAt,
      socialProfileVisibility?.updatedAt,
      socialActivitySharing?.updatedAt,
    ]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)!,
  };
}

function privacySettings(input: {
  readonly visibility?: 'private' | 'friends' | 'public';
  readonly visibilityUpdatedAt?: string;
  readonly policy?: SocialActivityGlobalSharingPolicy;
  readonly policyUpdatedAt?: string;
  readonly updatedAt?: string;
} = {}): StoredFriendsPrivacySettings {
  const updatedAt = input.updatedAt ?? T1;
  return {
    id: FRIENDS_PRIVACY_SETTINGS_ID,
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    profileVisibility: input.visibility ?? 'friends',
    socialActivitySharingPolicy:
      input.policy ?? createSocialActivityGlobalSharingPolicy('summary'),
    profileVisibilityUpdatedAt: input.visibilityUpdatedAt ?? updatedAt,
    socialActivitySharingPolicyUpdatedAt:
      input.policyUpdatedAt ?? updatedAt,
    createdAt: T1,
    updatedAt,
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


  it('synchronise la visibilité sociale et la politique globale avec les préférences du compte', async () => {
    await local.userSettings.put(settings(T1, 3_000));
    await local.friendsPrivacySettings.put(privacySettings({
      visibility: 'private',
      visibilityUpdatedAt: T2,
      policy: createSocialActivityGlobalSharingPolicy('custom', {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: ['exercises', 'sets', 'repetitions'],
      }),
      policyUpdatedAt: T3,
      updatedAt: T3,
    }));

    const result = await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.uploadedSettings).toBe(3);
    expect(await cloud.realAccountPreferences.get('#account-preferences'))
      .toMatchObject({
        socialProfileVisibility: {
          visibility: 'private',
          updatedAt: T2,
        },
        socialActivitySharing: {
          policy: {
            visibility: 'custom',
            fields: {
              common: ['activityType', 'date', 'duration'],
              cardio: ['distance', 'pace'],
              strength: ['exercises', 'sets', 'repetitions'],
            },
          },
          updatedAt: T3,
        },
      });
  });

  it('résout séparément la visibilité et la politique selon leurs horodatages', async () => {
    await local.userSettings.put(settings(T1, 3_000));
    await local.friendsPrivacySettings.put(privacySettings({
      visibility: 'private',
      visibilityUpdatedAt: T3,
      policy: createSocialActivityGlobalSharingPolicy('summary'),
      policyUpdatedAt: T1,
      updatedAt: T3,
    }));
    await cloud.realAccountPreferences.put({
      ...aggregate(undefined, settings(T1, 3_000), {
        visibility: { value: 'public', updatedAt: T2 },
        policy: {
          value: createSocialActivityGlobalSharingPolicy('detailed'),
          updatedAt: T2,
        },
      }),
      id: '#account-preferences',
      owner: 'user-1',
    });

    let privacyChangeCount = 0;
    const listener = () => {
      privacyChangeCount += 1;
    };
    window.addEventListener(SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT, listener);
    const result = await synchronizeRealAccountPreferences(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    window.removeEventListener(SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT, listener);

    expect(result.downloadedSettings).toBe(1);
    expect(privacyChangeCount).toBe(1);
    expect(result.uploadedSettings).toBe(1);
    expect(await local.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID))
      .toMatchObject({
        profileVisibility: 'private',
        profileVisibilityUpdatedAt: T3,
        activitySharing: 'detailed',
        socialActivitySharingPolicy: { visibility: 'detailed' },
        socialActivitySharingPolicyUpdatedAt: T2,
      });
    expect(await cloud.realAccountPreferences.get('#account-preferences'))
      .toMatchObject({
        socialProfileVisibility: {
          visibility: 'private',
          updatedAt: T3,
        },
        socialActivitySharing: {
          policy: { visibility: 'detailed' },
          updatedAt: T2,
        },
      });
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
