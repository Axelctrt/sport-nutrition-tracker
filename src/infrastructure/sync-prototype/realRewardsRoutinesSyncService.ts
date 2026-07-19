import {
  createDefaultRoutineReminderPreferences,
  normalizeRoutineReminderPreferences,
  type RoutineReminderPreferences,
} from '@/domain/reminders/routineReminder';
import { DEFAULT_VISUAL_THEME_ID } from '@/domain/rewards/visualThemes';
import { USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import {
  createDefaultUserSettings,
  normalizeUserSettings,
} from '@/domain/defaults/appSettings';
import type { UserSettings } from '@/domain/models/settings';
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
import {
  notifyRewardsRoutinesChanged,
} from '@/infrastructure/sync-prototype/rewardsRoutinesSyncEvents';
import {
  flushUserStatePersistence,
  reloadUserStateRuntime,
} from '@/infrastructure/user-state/userStateRuntime';
import {
  VISUAL_THEME_PREFERENCE_ID,
  type CompletedWeeklyMissionRecord,
  type EarnedAchievementRecord,
  type RoutineReminderCompletionRecord,
  type UnlockedVisualThemeRecord,
  type VisualThemePreferenceRecord,
} from '@/infrastructure/user-state/userStateModels';
import { notifyRoutineReminderChanged } from '@/application/reminders/routineReminderService';
import { sameLocalCollection } from '@/infrastructure/sync-prototype/localSyncCompareAndSwap';
import {
  logicalSyncStamp,
  persistLogicalSyncBaseline,
  resolveDatabaseLogicalSyncState,
  resolveSyncActorId,
  stripLogicalSyncFields,
  upsertLogicalCloudValue,
  type LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';

export const REWARDS_ROUTINES_AGGREGATE_ID = 'rewards-routines';

export interface SyncedRoutineReminderPreferences {
  readonly value: RoutineReminderPreferences;
  readonly updatedAt: string;
}

export interface RewardsRoutinesAggregate {
  readonly id: string;
  readonly earnedAchievements: readonly EarnedAchievementRecord[];
  readonly unlockedVisualThemes: readonly UnlockedVisualThemeRecord[];
  readonly visualThemePreference: VisualThemePreferenceRecord;
  readonly weeklyMissionCompletions: readonly CompletedWeeklyMissionRecord[];
  readonly routineReminderCompletions: readonly RoutineReminderCompletionRecord[];
  readonly routineReminderPreferences: SyncedRoutineReminderPreferences;
  readonly updatedAt: string;
}

type CloudRewardsRoutinesAggregate = Omit<RewardsRoutinesAggregate, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

export interface RealRewardsRoutinesSyncPreview {
  readonly localAchievementCount: number;
  readonly cloudAchievementCount: number;
  readonly localUnlockedThemeCount: number;
  readonly cloudUnlockedThemeCount: number;
  readonly localWeeklyMissionCount: number;
  readonly cloudWeeklyMissionCount: number;
  readonly localReminderCompletionCount: number;
  readonly cloudReminderCompletionCount: number;
  readonly cloudStatePresent: boolean;
  readonly differingEntityCount: number;
}

export interface RealRewardsRoutinesSyncResult
  extends RealRewardsRoutinesSyncPreview {
  readonly uploadedAchievements: number;
  readonly downloadedAchievements: number;
  readonly uploadedThemes: number;
  readonly downloadedThemes: number;
  readonly uploadedThemePreference: number;
  readonly downloadedThemePreference: number;
  readonly uploadedWeeklyMissions: number;
  readonly downloadedWeeklyMissions: number;
  readonly uploadedReminderCompletions: number;
  readonly downloadedReminderCompletions: number;
  readonly uploadedReminderPreferences: number;
  readonly downloadedReminderPreferences: number;
  readonly completedAt: string;
}

interface RewardsRoutinesState {
  readonly localSnapshot: {
    readonly earnedAchievements: EarnedAchievementRecord[];
    readonly unlockedVisualThemes: UnlockedVisualThemeRecord[];
    readonly visualThemePreference: VisualThemePreferenceRecord | undefined;
    readonly weeklyMissionCompletions: CompletedWeeklyMissionRecord[];
    readonly routineReminderCompletions: RoutineReminderCompletionRecord[];
    readonly settings: UserSettings;
  };
  readonly local: RewardsRoutinesAggregate;
  readonly cloud?: RewardsRoutinesAggregate;
  readonly cloudRow?: CloudRewardsRoutinesAggregate;
}

function maxTimestamp(...values: readonly (string | undefined)[]): string {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? '';
}

function earliestTimestamp(...values: readonly string[]): string {
  return [...values].sort()[0] ?? '';
}

function sortById<T extends { readonly id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function mergeEarliestById<T extends {
  readonly id: string;
  readonly updatedAt: string;
}>(
  local: readonly T[],
  cloud: readonly T[],
  dateOf: (value: T) => string,
  withDate: (value: T, date: string) => T,
): T[] {
  const byId = new Map<string, T>();

  for (const value of [...local, ...cloud]) {
    const existing = byId.get(value.id);
    if (!existing) {
      byId.set(value.id, value);
      continue;
    }

    const date = earliestTimestamp(dateOf(existing), dateOf(value));
    const base = stableValue(existing) <= stableValue(value) ? existing : value;
    byId.set(base.id, withDate(base, date));
  }

  return sortById([...byId.values()]);
}

function mergeAchievements(
  local: readonly EarnedAchievementRecord[],
  cloud: readonly EarnedAchievementRecord[],
): EarnedAchievementRecord[] {
  return mergeEarliestById(
    local,
    cloud,
    (value) => value.earnedAt,
    (value, earnedAt) => ({ ...value, earnedAt, updatedAt: earnedAt }),
  );
}

function mergeUnlockedThemes(
  local: readonly UnlockedVisualThemeRecord[],
  cloud: readonly UnlockedVisualThemeRecord[],
): UnlockedVisualThemeRecord[] {
  return mergeEarliestById(
    local,
    cloud,
    (value) => value.unlockedAt,
    (value, unlockedAt) => ({ ...value, unlockedAt, updatedAt: unlockedAt }),
  );
}

function mergeWeeklyMissions(
  local: readonly CompletedWeeklyMissionRecord[],
  cloud: readonly CompletedWeeklyMissionRecord[],
): CompletedWeeklyMissionRecord[] {
  return mergeEarliestById(
    local,
    cloud,
    (value) => value.completedAt,
    (value, completedAt) => ({ ...value, completedAt, updatedAt: completedAt }),
  );
}

function mergeReminderCompletions(
  local: readonly RoutineReminderCompletionRecord[],
  cloud: readonly RoutineReminderCompletionRecord[],
): RoutineReminderCompletionRecord[] {
  return mergeEarliestById(
    local,
    cloud,
    (value) => value.completedAt,
    (value, completedAt) => ({ ...value, completedAt, updatedAt: completedAt }),
  );
}

export function createRoutineReminderPreferencesSnapshot(
  settings: UserSettings,
): SyncedRoutineReminderPreferences {
  const normalized = normalizeUserSettings(settings);
  return {
    value: normalizeRoutineReminderPreferences(
      normalized.routineReminderPreferences,
    ),
    updatedAt:
      normalized.routineReminderUpdatedAt ?? normalized.updatedAt,
  };
}

function reminderPreferencesBusinessValue(
  snapshot: SyncedRoutineReminderPreferences,
): string {
  return stableValue(snapshot.value);
}

export function isDefaultRoutineReminderPreferencesSnapshot(
  snapshot: SyncedRoutineReminderPreferences,
): boolean {
  return reminderPreferencesBusinessValue(snapshot) === stableValue(
    createDefaultRoutineReminderPreferences(),
  );
}

function aggregateUpdatedAt(
  aggregate: Omit<RewardsRoutinesAggregate, 'updatedAt'>,
): string {
  return maxTimestamp(
    ...aggregate.earnedAchievements.map((value) => value.updatedAt),
    ...aggregate.unlockedVisualThemes.map((value) => value.updatedAt),
    aggregate.visualThemePreference.updatedAt,
    ...aggregate.weeklyMissionCompletions.map((value) => value.updatedAt),
    ...aggregate.routineReminderCompletions.map((value) => value.updatedAt),
    aggregate.routineReminderPreferences.updatedAt,
  );
}

function validateUniqueIds(
  label: string,
  values: readonly { readonly id: string }[],
): void {
  if (new Set(values.map((value) => value.id)).size !== values.length) {
    throw new Error(`${label} contient des identifiants dupliqués.`);
  }
}

function validateAggregate(aggregate: RewardsRoutinesAggregate): void {
  if (aggregate.id !== REWARDS_ROUTINES_AGGREGATE_ID) {
    throw new Error('L’état cloud des récompenses possède un identifiant incohérent.');
  }
  validateUniqueIds('Les badges cloud', aggregate.earnedAchievements);
  validateUniqueIds('Les thèmes cloud', aggregate.unlockedVisualThemes);
  validateUniqueIds('Les missions cloud', aggregate.weeklyMissionCompletions);
  validateUniqueIds(
    'Les complétions de rappels cloud',
    aggregate.routineReminderCompletions,
  );
  if (aggregate.visualThemePreference.id !== VISUAL_THEME_PREFERENCE_ID) {
    throw new Error('La préférence de thème cloud possède un identifiant incohérent.');
  }
  if (
    !aggregate.unlockedVisualThemes.some(
      (value) => value.id === aggregate.visualThemePreference.activeThemeId,
    )
  ) {
    throw new Error('Le thème actif cloud n’est pas débloqué.');
  }
  const { updatedAt: _updatedAt, ...withoutUpdatedAt } = aggregate;
  if (aggregate.updatedAt !== aggregateUpdatedAt(withoutUpdatedAt)) {
    throw new Error('L’état cloud des récompenses possède un horodatage incohérent.');
  }
}

function buildAggregate(
  values: Omit<RewardsRoutinesAggregate, 'id' | 'updatedAt'>,
): RewardsRoutinesAggregate {
  const unlockedVisualThemes = sortById(values.unlockedVisualThemes);
  const unlockedIds = new Set(unlockedVisualThemes.map((value) => value.id));
  const visualThemePreference = unlockedIds.has(
    values.visualThemePreference.activeThemeId,
  )
    ? values.visualThemePreference
    : {
        ...values.visualThemePreference,
        activeThemeId: DEFAULT_VISUAL_THEME_ID,
      };
  const withoutUpdatedAt = {
    id: REWARDS_ROUTINES_AGGREGATE_ID,
    earnedAchievements: sortById(values.earnedAchievements),
    unlockedVisualThemes,
    visualThemePreference,
    weeklyMissionCompletions: sortById(values.weeklyMissionCompletions),
    routineReminderCompletions: sortById(values.routineReminderCompletions),
    routineReminderPreferences: {
      value: normalizeRoutineReminderPreferences(
        values.routineReminderPreferences.value,
      ),
      updatedAt: values.routineReminderPreferences.updatedAt,
    },
  } as const;
  const aggregate: RewardsRoutinesAggregate = {
    ...withoutUpdatedAt,
    updatedAt: aggregateUpdatedAt(withoutUpdatedAt),
  };
  validateAggregate(aggregate);
  return aggregate;
}

function toCloudAggregate(
  aggregate: RewardsRoutinesAggregate,
): CloudRewardsRoutinesAggregate {
  return { ...aggregate, id: cloudPrivateId(aggregate.id) };
}

function fromCloudAggregate(
  aggregate: CloudOwned<CloudRewardsRoutinesAggregate>,
): RewardsRoutinesAggregate | undefined {
  const id = localIdFromCloud(aggregate.id);
  if (id !== REWARDS_ROUTINES_AGGREGATE_ID) return undefined;
  const value = {
    ...stripLogicalSyncFields(stripCloudFields(aggregate)),
    id,
  } as RewardsRoutinesAggregate;
  validateAggregate(value);
  return value;
}

function isUninitializedLocalState(
  aggregate: RewardsRoutinesAggregate,
): boolean {
  return (
    aggregate.earnedAchievements.length === 0 &&
    aggregate.unlockedVisualThemes.every(
      (value) => value.id === DEFAULT_VISUAL_THEME_ID,
    ) &&
    aggregate.visualThemePreference.activeThemeId === DEFAULT_VISUAL_THEME_ID &&
    aggregate.weeklyMissionCompletions.length === 0 &&
    aggregate.routineReminderCompletions.length === 0 &&
    isDefaultRoutineReminderPreferencesSnapshot(
      aggregate.routineReminderPreferences,
    )
  );
}

function resolveFinalState(
  local: RewardsRoutinesAggregate,
  cloud: RewardsRoutinesAggregate | undefined,
): RewardsRoutinesAggregate {
  if (!cloud) return local;

  const localLooksUninitialized = isUninitializedLocalState(local);
  const unlockedVisualThemes = mergeUnlockedThemes(
    local.unlockedVisualThemes,
    cloud.unlockedVisualThemes,
  );
  const chosenThemePreference = localLooksUninitialized
    ? cloud.visualThemePreference
    : chooseLatest(
        local.visualThemePreference,
        cloud.visualThemePreference,
      ) ?? local.visualThemePreference;
  const chosenReminderPreferences = localLooksUninitialized
    ? cloud.routineReminderPreferences
    : chooseLatest(
        local.routineReminderPreferences,
        cloud.routineReminderPreferences,
      ) ?? local.routineReminderPreferences;

  return buildAggregate({
    earnedAchievements: mergeAchievements(
      local.earnedAchievements,
      cloud.earnedAchievements,
    ),
    unlockedVisualThemes,
    visualThemePreference: chosenThemePreference,
    weeklyMissionCompletions: mergeWeeklyMissions(
      local.weeklyMissionCompletions,
      cloud.weeklyMissionCompletions,
    ),
    routineReminderCompletions: mergeReminderCompletions(
      local.routineReminderCompletions,
      cloud.routineReminderCompletions,
    ),
    routineReminderPreferences: chosenReminderPreferences,
  });
}

function changedRecordCount<T extends { readonly id: string }>(
  current: readonly T[] | undefined,
  final: readonly T[],
): number {
  const currentById = new Map(
    (current ?? []).map((value) => [value.id, value]),
  );
  return final.reduce(
    (count, value) => count + Number(!sameEntity(currentById.get(value.id), value)),
    0,
  );
}

function differingEntityCount(
  current: RewardsRoutinesAggregate | undefined,
  final: RewardsRoutinesAggregate,
): number {
  return (
    changedRecordCount(current?.earnedAchievements, final.earnedAchievements) +
    changedRecordCount(current?.unlockedVisualThemes, final.unlockedVisualThemes) +
    Number(!sameEntity(current?.visualThemePreference, final.visualThemePreference)) +
    changedRecordCount(
      current?.weeklyMissionCompletions,
      final.weeklyMissionCompletions,
    ) +
    changedRecordCount(
      current?.routineReminderCompletions,
      final.routineReminderCompletions,
    ) +
    Number(
      !sameEntity(
        current?.routineReminderPreferences,
        final.routineReminderPreferences,
      ),
    )
  );
}

function buildPreview(
  state: RewardsRoutinesState,
  final: RewardsRoutinesAggregate,
): RealRewardsRoutinesSyncPreview {
  return {
    localAchievementCount: state.local.earnedAchievements.length,
    cloudAchievementCount: state.cloud?.earnedAchievements.length ?? 0,
    localUnlockedThemeCount: state.local.unlockedVisualThemes.length,
    cloudUnlockedThemeCount: state.cloud?.unlockedVisualThemes.length ?? 0,
    localWeeklyMissionCount: state.local.weeklyMissionCompletions.length,
    cloudWeeklyMissionCount: state.cloud?.weeklyMissionCompletions.length ?? 0,
    localReminderCompletionCount: state.local.routineReminderCompletions.length,
    cloudReminderCompletionCount: state.cloud?.routineReminderCompletions.length ?? 0,
    cloudStatePresent: Boolean(state.cloud),
    differingEntityCount:
      differingEntityCount(state.local, final) +
      differingEntityCount(state.cloud, final),
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RewardsRoutinesState> {
  await flushUserStatePersistence();
  const [
    earnedAchievements,
    unlockedVisualThemes,
    storedThemePreference,
    weeklyMissionCompletions,
    routineReminderCompletions,
    storedSettings,
    cloudRows,
  ] = await Promise.all([
    localDatabase.earnedAchievements.toArray(),
    localDatabase.unlockedVisualThemes.toArray(),
    localDatabase.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID),
    localDatabase.weeklyMissionCompletions.toArray(),
    localDatabase.routineReminderCompletions.toArray(),
    localDatabase.userSettings.get(USER_SETTINGS_ID),
    cloudDatabase.realRewardsRoutines.toArray(),
  ]);
  const settings = normalizeUserSettings(
    storedSettings ?? createDefaultUserSettings(),
  );
  if (!storedSettings) {
    await localDatabase.userSettings.put(settings);
  }
  const fallbackTimestamp = settings.createdAt;
  const classicRecord = unlockedVisualThemes.find(
    (value) => value.id === DEFAULT_VISUAL_THEME_ID,
  ) ?? {
    id: DEFAULT_VISUAL_THEME_ID,
    unlockedAt: fallbackTimestamp,
    updatedAt: fallbackTimestamp,
  };
  const local = buildAggregate({
    earnedAchievements,
    unlockedVisualThemes: [
      ...unlockedVisualThemes.filter(
        (value) => value.id !== DEFAULT_VISUAL_THEME_ID,
      ),
      classicRecord,
    ],
    visualThemePreference: storedThemePreference ?? {
      id: VISUAL_THEME_PREFERENCE_ID,
      activeThemeId: DEFAULT_VISUAL_THEME_ID,
      updatedAt: fallbackTimestamp,
    },
    weeklyMissionCompletions,
    routineReminderCompletions,
    routineReminderPreferences:
      createRoutineReminderPreferencesSnapshot(settings),
  });
  const cloudValueRows = cloudRows
    .filter((row) => belongsToCurrentUser(row, currentUserId));
  const cloudValues = cloudValueRows
    .map(fromCloudAggregate)
    .filter((row): row is RewardsRoutinesAggregate => row !== undefined);

  if (cloudValues.length > 1) {
    throw new Error(
      'Plusieurs états cloud concurrents de récompenses ont été trouvés pour ce compte.',
    );
  }

  return {
    localSnapshot: {
      earnedAchievements,
      unlockedVisualThemes,
      visualThemePreference: storedThemePreference,
      weeklyMissionCompletions,
      routineReminderCompletions,
      settings,
    },
    local,
    ...(cloudValues[0] ? { cloud: cloudValues[0] } : {}),
    ...(cloudValueRows[0]
      ? { cloudRow: cloudValueRows[0] as CloudRewardsRoutinesAggregate }
      : {}),
  };
}

export async function previewRealRewardsRoutinesSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealRewardsRoutinesSyncPreview> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  return buildPreview(state, resolveFinalState(state.local, state.cloud));
}

async function applyAggregateToLocal(
  localDatabase: AppDatabase,
  expected: RewardsRoutinesState['localSnapshot'],
  aggregate: RewardsRoutinesAggregate,
): Promise<boolean> {
  const applied = await localDatabase.transaction(
    'rw',
    [
      localDatabase.earnedAchievements,
      localDatabase.unlockedVisualThemes,
      localDatabase.visualThemePreferences,
      localDatabase.weeklyMissionCompletions,
      localDatabase.routineReminderCompletions,
      localDatabase.userSettings,
    ],
    async () => {
      const [
        currentAchievements,
        currentThemes,
        currentThemePreference,
        currentMissions,
        currentReminderCompletions,
        storedSettings,
      ] = await Promise.all([
        localDatabase.earnedAchievements.toArray(),
        localDatabase.unlockedVisualThemes.toArray(),
        localDatabase.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID),
        localDatabase.weeklyMissionCompletions.toArray(),
        localDatabase.routineReminderCompletions.toArray(),
        localDatabase.userSettings.get(USER_SETTINGS_ID),
      ]);
      const currentSettings = normalizeUserSettings(
        storedSettings ?? createDefaultUserSettings(),
      );
      const unchanged =
        sameLocalCollection(
          currentAchievements,
          expected.earnedAchievements,
        )
        && sameLocalCollection(currentThemes, expected.unlockedVisualThemes)
        && sameEntity(currentThemePreference, expected.visualThemePreference)
        && sameLocalCollection(
          currentMissions,
          expected.weeklyMissionCompletions,
        )
        && sameLocalCollection(
          currentReminderCompletions,
          expected.routineReminderCompletions,
        )
        && sameEntity(currentSettings, expected.settings);
      if (!unchanged) return false;

      const nextSettings = normalizeUserSettings({
        ...currentSettings,
        routineReminderPreferences: aggregate.routineReminderPreferences.value,
        routineReminderUpdatedAt: aggregate.routineReminderPreferences.updatedAt,
        updatedAt: maxTimestamp(
          currentSettings.updatedAt,
          aggregate.routineReminderPreferences.updatedAt,
        ),
      });
      await Promise.all([
        localDatabase.earnedAchievements.clear(),
        localDatabase.unlockedVisualThemes.clear(),
        localDatabase.weeklyMissionCompletions.clear(),
        localDatabase.routineReminderCompletions.clear(),
      ]);
      if (aggregate.earnedAchievements.length > 0) {
        await localDatabase.earnedAchievements.bulkPut(
          [...aggregate.earnedAchievements],
        );
      }
      if (aggregate.unlockedVisualThemes.length > 0) {
        await localDatabase.unlockedVisualThemes.bulkPut(
          [...aggregate.unlockedVisualThemes],
        );
      }
      await localDatabase.visualThemePreferences.put(
        aggregate.visualThemePreference,
      );
      if (aggregate.weeklyMissionCompletions.length > 0) {
        await localDatabase.weeklyMissionCompletions.bulkPut(
          [...aggregate.weeklyMissionCompletions],
        );
      }
      if (aggregate.routineReminderCompletions.length > 0) {
        await localDatabase.routineReminderCompletions.bulkPut(
          [...aggregate.routineReminderCompletions],
        );
      }
      await localDatabase.userSettings.put(nextSettings);
      return true;
    },
  );

  if (applied) {
    await reloadUserStateRuntime(localDatabase);
    notifyRoutineReminderChanged();
    notifyRewardsRoutinesChanged();
  }
  return applied;
}

export async function synchronizeRealRewardsRoutines(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealRewardsRoutinesSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const actorId = await resolveSyncActorId(localDatabase);
  const resolution = await resolveDatabaseLogicalSyncState({
    cloudDatabase,
    accountUserId: currentUserId,
    domainId: 'rewards-routines',
    entityId: REWARDS_ROUTINES_AGGREGATE_ID,
    actorId,
    localValue: state.local,
    cloudValue: state.cloud ?? state.local,
    cloudStamp: logicalSyncStamp(state.cloudRow),
    legacyResolve: (local, cloud) => resolveFinalState(local, cloud),
    concurrentResolve: (local, cloud) => resolveFinalState(local, cloud),
  });
  const final = resolution.value;
  const preview = buildPreview(state, final);

  const downloadedAchievements = changedRecordCount(
    state.local.earnedAchievements,
    final.earnedAchievements,
  );
  const downloadedThemes = changedRecordCount(
    state.local.unlockedVisualThemes,
    final.unlockedVisualThemes,
  );
  const downloadedThemePreference = Number(
    !sameEntity(state.local.visualThemePreference, final.visualThemePreference),
  );
  const downloadedWeeklyMissions = changedRecordCount(
    state.local.weeklyMissionCompletions,
    final.weeklyMissionCompletions,
  );
  const downloadedReminderCompletions = changedRecordCount(
    state.local.routineReminderCompletions,
    final.routineReminderCompletions,
  );
  const downloadedReminderPreferences = Number(
    !sameEntity(
      state.local.routineReminderPreferences,
      final.routineReminderPreferences,
    ),
  );
  const uploadedAchievements = writeCloud
    ? changedRecordCount(state.cloud?.earnedAchievements, final.earnedAchievements)
    : 0;
  const uploadedThemes = writeCloud
    ? changedRecordCount(state.cloud?.unlockedVisualThemes, final.unlockedVisualThemes)
    : 0;
  const uploadedThemePreference = writeCloud
    ? Number(!sameEntity(state.cloud?.visualThemePreference, final.visualThemePreference))
    : 0;
  const uploadedWeeklyMissions = writeCloud
    ? changedRecordCount(
        state.cloud?.weeklyMissionCompletions,
        final.weeklyMissionCompletions,
      )
    : 0;
  const uploadedReminderCompletions = writeCloud
    ? changedRecordCount(
        state.cloud?.routineReminderCompletions,
        final.routineReminderCompletions,
      )
    : 0;
  const uploadedReminderPreferences = writeCloud
    ? Number(
        !sameEntity(
          state.cloud?.routineReminderPreferences,
          final.routineReminderPreferences,
        ),
      )
    : 0;

  let localStateApplied = true;
  if (
    downloadedAchievements +
      downloadedThemes +
      downloadedThemePreference +
      downloadedWeeklyMissions +
      downloadedReminderCompletions +
      downloadedReminderPreferences >
    0
  ) {
    localStateApplied = await applyAggregateToLocal(
      localDatabase,
      state.localSnapshot,
      final,
    );
  }

  if (writeCloud && localStateApplied) {
    await upsertLogicalCloudValue(
      cloudDatabase.realRewardsRoutines,
      state.cloud,
      state.cloudRow,
      final,
      resolution.stamp,
      (value) => toCloudAggregate(value) as RewardsRoutinesAggregate,
    );
    await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
  }

  return {
    ...preview,
    uploadedAchievements,
    downloadedAchievements: localStateApplied ? downloadedAchievements : 0,
    uploadedThemes,
    downloadedThemes: localStateApplied ? downloadedThemes : 0,
    uploadedThemePreference,
    downloadedThemePreference: localStateApplied ? downloadedThemePreference : 0,
    uploadedWeeklyMissions,
    downloadedWeeklyMissions: localStateApplied ? downloadedWeeklyMissions : 0,
    uploadedReminderCompletions,
    downloadedReminderCompletions: localStateApplied
      ? downloadedReminderCompletions
      : 0,
    uploadedReminderPreferences,
    downloadedReminderPreferences: localStateApplied
      ? downloadedReminderPreferences
      : 0,
    completedAt: new Date().toISOString(),
  };
}
