import type { UserProfile } from '@/domain/models/profile';
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

export const ACCOUNT_PREFERENCES_AGGREGATE_ID = 'account-preferences';

export type SyncedUserSettings = Omit<
  UserSettings,
  'routineReminderPreferences' | 'routineReminderUpdatedAt' | 'syncableUpdatedAt'
>;

export interface AccountPreferencesAggregate {
  readonly id: string;
  readonly profile?: UserProfile;
  readonly settings: SyncedUserSettings;
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
  const expectedUpdatedAt = maxTimestamp(
    aggregate.profile?.updatedAt,
    aggregate.settings.updatedAt,
  );
  if (aggregate.updatedAt !== expectedUpdatedAt) {
    throw new Error('Le profil et les réglages cloud possèdent un horodatage incohérent.');
  }
}

function buildAggregate(
  profile: UserProfile | undefined,
  settings: SyncedUserSettings,
): AccountPreferencesAggregate {
  const aggregate: AccountPreferencesAggregate = {
    id: ACCOUNT_PREFERENCES_AGGREGATE_ID,
    ...(profile ? { profile } : {}),
    settings,
    updatedAt: maxTimestamp(profile?.updatedAt, settings.updatedAt),
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

  return buildAggregate(profile, settings);
}

function differingComponentCount(
  left: AccountPreferencesAggregate | undefined,
  right: AccountPreferencesAggregate,
): number {
  if (!left) {
    return (right.profile ? 1 : 0) + 1;
  }
  return Number(!sameEntity(left.profile, right.profile))
    + Number(!sameEntity(left.settings, right.settings));
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

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<AccountPreferencesState> {
  const [profile, storedSettings, cloudRows] = await Promise.all([
    localDatabase.userProfile.get(LOCAL_USER_PROFILE_ID),
    localDatabase.userSettings.get(USER_SETTINGS_ID),
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
    local: buildAggregate(profile, settings),
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
  const downloadedSettings = Number(
    !sameEntity(state.local.settings, final.settings),
  );
  const uploadedProfiles = writeCloud
    ? Number(!sameEntity(state.cloud?.profile, final.profile))
    : 0;
  const uploadedSettings = writeCloud
    ? Number(!sameEntity(state.cloud?.settings, final.settings))
    : 0;

  if (downloadedProfiles > 0 && final.profile) {
    await localDatabase.userProfile.put(final.profile);
  }
  if (downloadedSettings > 0) {
    await applySettingsToLocal(localDatabase, final.settings);
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

  return {
    ...preview,
    uploadedProfiles,
    downloadedProfiles,
    uploadedSettings,
    downloadedSettings,
    completedAt: new Date().toISOString(),
  };
}
