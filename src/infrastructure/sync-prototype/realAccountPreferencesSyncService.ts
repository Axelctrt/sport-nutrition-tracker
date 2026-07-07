import type { UserProfile } from '@/domain/models/profile';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  FRIENDS_PRIVACY_SETTINGS_ID,
  type FriendVisibilityLevel,
  type StoredFriendsPrivacySettings,
} from '@/domain/friends/friendship';
import {
  legacyFriendActivitySharingForPolicy,
  socialActivityGlobalPolicyFromLegacyPrivacy,
  validateSocialActivityGlobalSharingPolicy,
  type SocialActivityGlobalSharingPolicy,
} from '@/domain/friends/socialActivitySharingPolicy';
import type { UserSettings } from '@/domain/models/settings';
import {
  createDefaultUserSettings,
  normalizeUserSettings,
} from '@/domain/defaults/appSettings';
import {
  LOCAL_USER_PROFILE_ID,
  USER_SETTINGS_ID,
} from '@/domain/defaults/identifiers';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stableValue,
  stripCloudFields,
  type CloudOwned,
  type CloudSyncExecutionOptions,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import { notifyAccountPreferencesChanged } from '@/infrastructure/sync-prototype/accountPreferencesSyncEvents';
import { notifySocialActivityPrivacyChanged } from '@/infrastructure/sync-prototype/socialActivityPrivacySyncEvents';

export const ACCOUNT_PREFERENCES_AGGREGATE_ID = 'account-preferences';
export const SOCIAL_PROFILE_VISIBILITY_PREFERENCES_ID =
  'social-profile-visibility';
export const SOCIAL_ACTIVITY_SHARING_PREFERENCES_ID =
  'social-activity-sharing';

export type SyncedUserSettings = Omit<
  UserSettings,
  'routineReminderPreferences' | 'routineReminderUpdatedAt' | 'syncableUpdatedAt'
>;

export interface SyncedSocialProfileVisibility {
  readonly id: typeof SOCIAL_PROFILE_VISIBILITY_PREFERENCES_ID;
  readonly visibility: FriendVisibilityLevel;
  readonly updatedAt: string;
}

export interface SyncedSocialActivitySharingPreferences {
  readonly id: typeof SOCIAL_ACTIVITY_SHARING_PREFERENCES_ID;
  readonly policy: SocialActivityGlobalSharingPolicy;
  readonly updatedAt: string;
}

export interface AccountPreferencesAggregate {
  readonly id: string;
  readonly profile?: UserProfile;
  readonly settings: SyncedUserSettings;
  readonly socialProfileVisibility?: SyncedSocialProfileVisibility;
  readonly socialActivitySharing?: SyncedSocialActivitySharingPreferences;
  readonly updatedAt: string;
}

type CloudAccountPreferencesAggregate = Omit<
  AccountPreferencesAggregate,
  'id'
> & {
  readonly id: string;
};

export interface RealAccountPreferencesSyncPreview {
  readonly localProfilePresent: boolean;
  readonly cloudProfilePresent: boolean;
  readonly localSettingsPresent: boolean;
  readonly cloudSettingsPresent: boolean;
  readonly differingEntityCount: number;
}

export interface RealAccountPreferencesSyncResult
  extends RealAccountPreferencesSyncPreview {
  readonly uploadedProfiles: number;
  readonly downloadedProfiles: number;
  readonly uploadedSettings: number;
  readonly downloadedSettings: number;
  readonly completedAt: string;
}

interface AccountPreferencesState {
  readonly local: AccountPreferencesAggregate;
  readonly cloud?: AccountPreferencesAggregate;
}

function maxTimestamp(...values: readonly (string | undefined)[]): string {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? '';
}

export function createSyncedUserSettingsSnapshot(
  settings: UserSettings,
): SyncedUserSettings {
  const normalized = normalizeUserSettings(settings);
  const {
    routineReminderPreferences: _routineReminderPreferences,
    routineReminderUpdatedAt: _routineReminderUpdatedAt,
    syncableUpdatedAt,
    ...syncable
  } = normalized;

  return {
    ...syncable,
    updatedAt: syncableUpdatedAt ?? normalized.updatedAt,
  };
}

function settingsBusinessValue(settings: SyncedUserSettings): string {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...value
  } = settings;
  return stableValue(value);
}

export function isDefaultSyncedUserSettings(
  settings: SyncedUserSettings,
): boolean {
  return settingsBusinessValue(settings) === settingsBusinessValue(
    createSyncedUserSettingsSnapshot(createDefaultUserSettings()),
  );
}

function validateAggregate(aggregate: AccountPreferencesAggregate): void {
  if (aggregate.id !== ACCOUNT_PREFERENCES_AGGREGATE_ID) {
    throw new Error('Le profil cloud possède un identifiant incohérent.');
  }
  if (aggregate.profile?.id !== undefined && aggregate.profile.id !== LOCAL_USER_PROFILE_ID) {
    throw new Error('Le profil cloud ne correspond pas au profil local unique.');
  }
  if (aggregate.settings.id !== USER_SETTINGS_ID) {
    throw new Error('Les réglages cloud possèdent un identifiant incohérent.');
  }
  if (
    aggregate.socialProfileVisibility
    && aggregate.socialProfileVisibility.id !== SOCIAL_PROFILE_VISIBILITY_PREFERENCES_ID
  ) {
    throw new Error('La visibilité sociale cloud possède un identifiant incohérent.');
  }
  if (
    aggregate.socialProfileVisibility
    && !['private', 'friends', 'public'].includes(
      aggregate.socialProfileVisibility.visibility,
    )
  ) {
    throw new Error('La visibilité sociale cloud est invalide.');
  }
  if (
    aggregate.socialActivitySharing
    && aggregate.socialActivitySharing.id !== SOCIAL_ACTIVITY_SHARING_PREFERENCES_ID
  ) {
    throw new Error('La politique de partage cloud possède un identifiant incohérent.');
  }
  if (
    aggregate.socialActivitySharing
    && !validateSocialActivityGlobalSharingPolicy(
      aggregate.socialActivitySharing.policy,
    ).valid
  ) {
    throw new Error('La politique de partage cloud est invalide.');
  }
  const expectedUpdatedAt = maxTimestamp(
    aggregate.profile?.updatedAt,
    aggregate.settings.updatedAt,
    aggregate.socialProfileVisibility?.updatedAt,
    aggregate.socialActivitySharing?.updatedAt,
  );
  if (aggregate.updatedAt !== expectedUpdatedAt) {
    throw new Error('Le profil et les réglages cloud possèdent un horodatage incohérent.');
  }
}

function buildAggregate(
  profile: UserProfile | undefined,
  settings: SyncedUserSettings,
  socialProfileVisibility?: SyncedSocialProfileVisibility,
  socialActivitySharing?: SyncedSocialActivitySharingPreferences,
): AccountPreferencesAggregate {
  const aggregate: AccountPreferencesAggregate = {
    id: ACCOUNT_PREFERENCES_AGGREGATE_ID,
    ...(profile ? { profile } : {}),
    settings,
    ...(socialProfileVisibility ? { socialProfileVisibility } : {}),
    ...(socialActivitySharing ? { socialActivitySharing } : {}),
    updatedAt: maxTimestamp(
      profile?.updatedAt,
      settings.updatedAt,
      socialProfileVisibility?.updatedAt,
      socialActivitySharing?.updatedAt,
    ),
  };
  validateAggregate(aggregate);
  return aggregate;
}

function toCloudAggregate(
  aggregate: AccountPreferencesAggregate,
): CloudAccountPreferencesAggregate {
  return {
    ...aggregate,
    id: cloudPrivateId(aggregate.id),
  };
}

function fromCloudAggregate(
  aggregate: CloudOwned<CloudAccountPreferencesAggregate>,
): AccountPreferencesAggregate | undefined {
  const id = localIdFromCloud(aggregate.id);
  if (id !== ACCOUNT_PREFERENCES_AGGREGATE_ID) return undefined;
  const value = {
    ...stripCloudFields(aggregate),
    id,
  } as AccountPreferencesAggregate;
  validateAggregate(value);
  return value;
}

function resolveFinalState(
  local: AccountPreferencesAggregate,
  cloud: AccountPreferencesAggregate | undefined,
): AccountPreferencesAggregate {
  if (!cloud) return local;

  const localLooksUninitialized =
    !local.profile && isDefaultSyncedUserSettings(local.settings);
  const profile = localLooksUninitialized
    ? cloud.profile
    : chooseLatest(local.profile, cloud.profile);
  const settings = localLooksUninitialized
    ? cloud.settings
    : chooseLatest(local.settings, cloud.settings) ?? local.settings;

  const socialProfileVisibility = chooseLatest(
    local.socialProfileVisibility,
    cloud.socialProfileVisibility,
  );
  const socialActivitySharing = chooseLatest(
    local.socialActivitySharing,
    cloud.socialActivitySharing,
  );

  return buildAggregate(
    profile,
    settings,
    socialProfileVisibility,
    socialActivitySharing,
  );
}

function differingComponentCount(
  left: AccountPreferencesAggregate | undefined,
  right: AccountPreferencesAggregate,
): number {
  if (!left) {
    return (right.profile ? 1 : 0)
      + 1
      + Number(Boolean(right.socialProfileVisibility))
      + Number(Boolean(right.socialActivitySharing));
  }
  return Number(!sameEntity(left.profile, right.profile))
    + Number(!sameEntity(left.settings, right.settings))
    + Number(!sameEntity(
      left.socialProfileVisibility,
      right.socialProfileVisibility,
    ))
    + Number(!sameEntity(
      left.socialActivitySharing,
      right.socialActivitySharing,
    ));
}

function buildPreview(
  state: AccountPreferencesState,
  final: AccountPreferencesAggregate,
): RealAccountPreferencesSyncPreview {
  return {
    localProfilePresent: Boolean(state.local.profile),
    cloudProfilePresent: Boolean(state.cloud?.profile),
    localSettingsPresent: true,
    cloudSettingsPresent: Boolean(state.cloud),
    differingEntityCount:
      differingComponentCount(state.local, final)
      + differingComponentCount(state.cloud, final),
  };
}

function socialProfileVisibilityFromStored(
  stored: StoredFriendsPrivacySettings | undefined,
): SyncedSocialProfileVisibility | undefined {
  if (!stored) return undefined;
  return {
    id: SOCIAL_PROFILE_VISIBILITY_PREFERENCES_ID,
    visibility: stored.profileVisibility,
    updatedAt: stored.profileVisibilityUpdatedAt ?? stored.updatedAt,
  };
}

function socialActivitySharingFromStored(
  stored: StoredFriendsPrivacySettings | undefined,
): SyncedSocialActivitySharingPreferences | undefined {
  if (!stored) return undefined;
  return {
    id: SOCIAL_ACTIVITY_SHARING_PREFERENCES_ID,
    policy: stored.socialActivitySharingPolicy
      ?? socialActivityGlobalPolicyFromLegacyPrivacy(stored),
    updatedAt:
      stored.socialActivitySharingPolicyUpdatedAt ?? stored.updatedAt,
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<AccountPreferencesState> {
  const [profile, storedSettings, storedPrivacy, cloudRows] = await Promise.all([
    localDatabase.userProfile.get(LOCAL_USER_PROFILE_ID),
    localDatabase.userSettings.get(USER_SETTINGS_ID),
    localDatabase.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID),
    cloudDatabase.realAccountPreferences.toArray(),
  ]);
  const settings = createSyncedUserSettingsSnapshot(
    storedSettings ?? createDefaultUserSettings(),
  );
  const cloudValues = cloudRows
    .filter((row) => belongsToCurrentUser(row, currentUserId))
    .map(fromCloudAggregate)
    .filter((row): row is AccountPreferencesAggregate => row !== undefined);

  if (cloudValues.length > 1) {
    throw new Error('Plusieurs profils cloud concurrents ont été trouvés pour ce compte.');
  }

  return {
    local: buildAggregate(
      profile,
      settings,
      socialProfileVisibilityFromStored(storedPrivacy),
      socialActivitySharingFromStored(storedPrivacy),
    ),
    ...(cloudValues[0] ? { cloud: cloudValues[0] } : {}),
  };
}

export async function previewRealAccountPreferencesSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealAccountPreferencesSyncPreview> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  return buildPreview(state, resolveFinalState(state.local, state.cloud));
}

async function applySettingsToLocal(
  localDatabase: AppDatabase,
  target: SyncedUserSettings,
): Promise<void> {
  const current = normalizeUserSettings(
    (await localDatabase.userSettings.get(USER_SETTINGS_ID))
      ?? createDefaultUserSettings(),
  );
  const next = normalizeUserSettings({
    ...target,
    id: USER_SETTINGS_ID,
    createdAt: target.createdAt,
    updatedAt: maxTimestamp(current.updatedAt, target.updatedAt),
    syncableUpdatedAt: target.updatedAt,
    routineReminderPreferences: current.routineReminderPreferences!,
    ...(current.routineReminderUpdatedAt
      ? { routineReminderUpdatedAt: current.routineReminderUpdatedAt }
      : {}),
  });
  await localDatabase.userSettings.put(next);
}

async function applySocialPrivacyToLocal(
  localDatabase: AppDatabase,
  input: {
    readonly socialProfileVisibility?: SyncedSocialProfileVisibility;
    readonly socialActivitySharing?: SyncedSocialActivitySharingPreferences;
  },
): Promise<void> {
  const current = await localDatabase.friendsPrivacySettings.get(
    FRIENDS_PRIVACY_SETTINGS_ID,
  );
  const firstTimestamp = maxTimestamp(
    input.socialProfileVisibility?.updatedAt,
    input.socialActivitySharing?.updatedAt,
  );
  const base: StoredFriendsPrivacySettings = current ?? {
    id: FRIENDS_PRIVACY_SETTINGS_ID,
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    createdAt: firstTimestamp,
    updatedAt: firstTimestamp,
  };
  const policy = input.socialActivitySharing?.policy
    ?? base.socialActivitySharingPolicy
    ?? socialActivityGlobalPolicyFromLegacyPrivacy(base);
  const next: StoredFriendsPrivacySettings = {
    ...base,
    ...(input.socialProfileVisibility
      ? {
          profileVisibility: input.socialProfileVisibility.visibility,
          profileVisibilityUpdatedAt:
            input.socialProfileVisibility.updatedAt,
        }
      : {}),
    ...(input.socialActivitySharing
      ? {
          activitySharing: legacyFriendActivitySharingForPolicy(policy),
          socialActivitySharingPolicy: policy,
          socialActivitySharingPolicyUpdatedAt:
            input.socialActivitySharing.updatedAt,
        }
      : {}),
    updatedAt: maxTimestamp(
      base.updatedAt,
      input.socialProfileVisibility?.updatedAt,
      input.socialActivitySharing?.updatedAt,
    ),
  };
  await localDatabase.friendsPrivacySettings.put(next);
}

export async function synchronizeRealAccountPreferences(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealAccountPreferencesSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const final = resolveFinalState(state.local, state.cloud);
  const preview = buildPreview(state, final);

  const downloadedProfiles = Number(
    !sameEntity(state.local.profile, final.profile),
  );
  const downloadedSocialProfileVisibility = Number(
    !sameEntity(
      state.local.socialProfileVisibility,
      final.socialProfileVisibility,
    ),
  );
  const downloadedSocialActivitySharing = Number(
    !sameEntity(
      state.local.socialActivitySharing,
      final.socialActivitySharing,
    ),
  );
  const downloadedSettings = Number(
    !sameEntity(state.local.settings, final.settings),
  ) + downloadedSocialProfileVisibility + downloadedSocialActivitySharing;
  const uploadedProfiles = writeCloud
    ? Number(!sameEntity(state.cloud?.profile, final.profile))
    : 0;
  const uploadedSettings = writeCloud
    ? Number(!sameEntity(state.cloud?.settings, final.settings))
      + Number(!sameEntity(
        state.cloud?.socialProfileVisibility,
        final.socialProfileVisibility,
      ))
      + Number(!sameEntity(
        state.cloud?.socialActivitySharing,
        final.socialActivitySharing,
      ))
    : 0;

  if (downloadedProfiles > 0 && final.profile) {
    await localDatabase.userProfile.put(final.profile);
  }
  if (!sameEntity(state.local.settings, final.settings)) {
    await applySettingsToLocal(localDatabase, final.settings);
  }
  if (
    downloadedSocialProfileVisibility > 0
    || downloadedSocialActivitySharing > 0
  ) {
    await applySocialPrivacyToLocal(localDatabase, {
      ...(downloadedSocialProfileVisibility > 0 && final.socialProfileVisibility
        ? { socialProfileVisibility: final.socialProfileVisibility }
        : {}),
      ...(downloadedSocialActivitySharing > 0 && final.socialActivitySharing
        ? { socialActivitySharing: final.socialActivitySharing }
        : {}),
    });
  }

  if (
    writeCloud
    && (uploadedProfiles > 0 || uploadedSettings > 0)
  ) {
    await cloudDatabase.realAccountPreferences.put(toCloudAggregate(final));
  }

  if (downloadedProfiles > 0 || downloadedSettings > 0) {
    notifyAccountPreferencesChanged();
  }
  if (
    downloadedSocialProfileVisibility > 0
    || downloadedSocialActivitySharing > 0
  ) {
    notifySocialActivityPrivacyChanged();
  }

  return {
    ...preview,
    uploadedProfiles,
    downloadedProfiles,
    uploadedSettings,
    downloadedSettings,
    completedAt: new Date().toISOString(),
  };
}
