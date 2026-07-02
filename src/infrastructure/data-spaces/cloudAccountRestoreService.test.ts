import Dexie from 'dexie';

import type { Activity } from '@/domain/models/activity';
import type { WeightEntry } from '@/domain/models/weight';
import type { DailyTarget } from '@/domain/models/targets';
import { createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { AccountPreferencesAggregate } from '@/infrastructure/sync-prototype/realAccountPreferencesSyncService';
import { createSyncedUserSettingsSnapshot } from '@/infrastructure/sync-prototype/realAccountPreferencesSyncService';
import type { RewardsRoutinesAggregate } from '@/infrastructure/sync-prototype/realRewardsRoutinesSyncService';
import { VISUAL_THEME_PREFERENCE_ID, routineReminderCompletionId, weeklyMissionCompletionId } from '@/infrastructure/user-state/userStateModels';
import {
  applyPreparedCloudAccountRestore,
  prepareCloudAccountRestore,
  type CloudAccountRestoreRuntime,
  type CloudAccountRestoreSourceSnapshot,
} from '@/infrastructure/data-spaces/cloudAccountRestoreService';
import {
  readDataSpaceRegistry,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { accountDatabaseNameForFingerprint } from '@/infrastructure/database/databaseNames';

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const ACCOUNT_FINGERPRINT = 'acct-a1b2c3d4';
const TARGET_NAME = accountDatabaseNameForFingerprint(ACCOUNT_FINGERPRINT);
const STAGE_NAME = `${TARGET_NAME}--cloud-restore-stage-test`;

function emptySource(): CloudAccountRestoreSourceSnapshot {
  return {
    weights: [],
    weightMarkers: [],
    activities: [],
    activityMarkers: [],
    goals: [],
    goalMarkers: [],
    strengthExercises: [],
    workoutTemplates: [],
    workoutSessions: [],
    strengthMarkers: [],
    nutritionJournalDays: [],
    nutritionJournalMarkers: [],
    nutritionProducts: [],
    nutritionRecipes: [],
    favoriteMeals: [],
    nutritionLibraryMarkers: [],
    nutritionTracking: [],
    accountPreferences: [],
    rewardsRoutines: [],
  };
}

function weight(id = 'weight-cloud'): WeightEntry {
  return {
    id,
    date: '2026-07-01',
    weightKg: 61.2,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  };
}


function dailyTarget(): DailyTarget {
  return {
    id: 'daily-target:2026-07-01',
    date: '2026-07-01',
    calculationWeightKg: 60,
    energy: {
      bmrKcal: 1500,
      occupationalBaseKcal: 300,
      walkingKcal: 100,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 1900,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1500,
    targetCaloriesKcal: 1900,
    macros: {
      proteinGrams: 120,
      carbohydratesGrams: 220,
      fatGrams: 60,
    },
    calculationVersion: 1,
    createdAt: '2026-07-01T09:10:00.000Z',
    updatedAt: '2026-07-01T09:10:00.000Z',
  };
}

function activity(id = 'activity-cloud'): Activity {
  return {
    id,
    date: '2026-07-01',
    type: 'running',
    durationMinutes: 45,
    distanceKm: 8,
    caloriesKcal: 520,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
  } as unknown as Activity;
}


function accountPreferences(
  includedBaseSteps = 4_000,
): AccountPreferencesAggregate {
  const settings = createDefaultUserSettings();
  settings.includedBaseSteps = includedBaseSteps;
  settings.createdAt = '2026-07-01T08:00:00.000Z';
  settings.updatedAt = '2026-07-01T08:00:00.000Z';
  settings.syncableUpdatedAt = settings.updatedAt;
  return {
    id: 'account-preferences',
    settings: createSyncedUserSettingsSnapshot(settings),
    updatedAt: settings.updatedAt,
  };
}

function rewardsRoutines(): RewardsRoutinesAggregate {
  const updatedAt = '2026-07-01T08:00:00.000Z';
  const settings = createDefaultUserSettings();
  return {
    id: 'rewards-routines',
    earnedAchievements: [
      { id: 'first-session', earnedAt: updatedAt, updatedAt },
    ],
    unlockedVisualThemes: [
      { id: 'classic', unlockedAt: updatedAt, updatedAt },
      { id: 'endurance', unlockedAt: updatedAt, updatedAt },
    ],
    visualThemePreference: {
      id: VISUAL_THEME_PREFERENCE_ID,
      activeThemeId: 'endurance',
      updatedAt,
    },
    weeklyMissionCompletions: [{
      id: weeklyMissionCompletionId('2026-06-29'),
      weekStart: '2026-06-29',
      completedAt: updatedAt,
      updatedAt,
    }],
    routineReminderCompletions: [{
      id: routineReminderCompletionId('2026-07-01', 'training'),
      date: '2026-07-01',
      type: 'training',
      completedAt: updatedAt,
      updatedAt,
    }],
    routineReminderPreferences: {
      value: {
        ...settings.routineReminderPreferences!,
        snoozeMinutes: 120,
      },
      updatedAt,
    },
    updatedAt,
  };
}

function createRuntime(
  readSource: () => CloudAccountRestoreSourceSnapshot,
  restoreTo: CloudAccountRestoreRuntime['restoreTo'] = async () => undefined,
): CloudAccountRestoreRuntime {
  return {
    syncCloud: vi.fn(async () => undefined),
    readSourceSnapshot: vi.fn(async () => structuredClone(readSource())),
    restoreTo: vi.fn(restoreTo),
  };
}

describe('cloudAccountRestoreService', () => {
  beforeEach(async () => {
    await Dexie.delete(TARGET_NAME);
    await Dexie.delete(STAGE_NAME);
  });

  afterEach(async () => {
    await Dexie.delete(TARGET_NAME);
    await Dexie.delete(STAGE_NAME);
  });

  it('détecte les données cloud sans créer prématurément la base du compte', async () => {
    const source = {
      ...emptySource(),
      weights: [weight()],
      activities: [activity()],
    };
    const runtime = createRuntime(() => source);

    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
      { now: '2026-07-02T08:00:00.000Z' },
    );

    expect(prepared.preview.hasCloudData).toBe(true);
    expect(prepared.preview.cloudRecordCount).toBe(2);
    expect(prepared.preview.localState).toBe('missing');
    expect(prepared.preview.canRestore).toBe(true);
    expect(await Dexie.exists(TARGET_NAME)).toBe(false);
  });

  it('restaure via une base temporaire puis active atomiquement l’espace du compte', async () => {
    const source = {
      ...emptySource(),
      weights: [weight()],
      activities: [activity()],
    };
    const runtime = createRuntime(() => source, async (database) => {
      await database.weights.put(weight());
      await database.activities.put(activity());
    });
    const storage = new MemoryStorage();
    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
    );

    const result = await applyPreparedCloudAccountRestore(prepared, runtime, {
      storage,
      stageDatabaseName: STAGE_NAME,
      now: '2026-07-02T09:00:00.000Z',
    });

    expect(result.sourcePreserved).toBe(true);
    expect(result.restoredRecords).toBe(2);
    expect(await Dexie.exists(STAGE_NAME)).toBe(false);

    const target = new AppDatabase(TARGET_NAME);
    await target.open();
    expect(await target.weights.count()).toBe(1);
    expect(await target.activities.count()).toBe(1);
    target.close();

    const registry = readDataSpaceRegistry(storage);
    expect(registry.activeSpaceId).toBe(`account:${ACCOUNT_FINGERPRINT}`);
    expect(result.space.accountFingerprint).toBe(ACCOUNT_FINGERPRINT);
  });

  it('refuse une restauration basée sur une analyse cloud devenue obsolète', async () => {
    let source = {
      ...emptySource(),
      weights: [weight()],
    };
    const runtime = createRuntime(() => source);
    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
    );
    source = {
      ...source,
      weights: [weight(), weight('weight-new')],
    };

    await expect(
      applyPreparedCloudAccountRestore(prepared, runtime, {
        stageDatabaseName: STAGE_NAME,
      }),
    ).rejects.toThrow('Les données cloud ont changé depuis l’analyse');
    expect(await Dexie.exists(TARGET_NAME)).toBe(false);
  });

  it('interrompt la restauration si le cloud change pendant la préparation temporaire', async () => {
    let source = {
      ...emptySource(),
      weights: [weight()],
    };
    const runtime = createRuntime(() => source, async (database) => {
      await database.weights.put(weight());
      source = {
        ...source,
        activities: [activity('activity-arrived-during-restore')],
      };
    });
    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
    );

    await expect(
      applyPreparedCloudAccountRestore(prepared, runtime, {
        stageDatabaseName: STAGE_NAME,
      }),
    ).rejects.toThrow('Les données cloud ont changé pendant la préparation');
    expect(await Dexie.exists(TARGET_NAME)).toBe(false);
    expect(await Dexie.exists(STAGE_NAME)).toBe(false);
  });

  it('préserve un espace créé concurremment pendant la préparation', async () => {
    const source = {
      ...emptySource(),
      weights: [weight()],
    };
    const runtime = createRuntime(() => source, async (database) => {
      await database.weights.put(weight());
      const concurrentTarget = new AppDatabase(TARGET_NAME);
      await concurrentTarget.open();
      await concurrentTarget.activities.put(activity('activity-concurrent'));
      concurrentTarget.close();
    });
    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
    );

    await expect(
      applyPreparedCloudAccountRestore(prepared, runtime, {
        stageDatabaseName: STAGE_NAME,
      }),
    ).rejects.toThrow('L’espace local a changé pendant la préparation');

    expect(await Dexie.exists(TARGET_NAME)).toBe(true);
    const target = new AppDatabase(TARGET_NAME);
    await target.open();
    expect(await target.activities.get('activity-concurrent')).toBeDefined();
    expect(await target.weights.count()).toBe(0);
    target.close();
  });

  it('refuse de remplacer un espace contenant déjà des données utilisateur', async () => {
    const target = new AppDatabase(TARGET_NAME);
    await target.open();
    await target.weights.put(weight('weight-local'));
    const source = {
      ...emptySource(),
      weights: [weight()],
    };
    const runtime = createRuntime(() => source);

    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
      { targetDatabase: target },
    );

    expect(prepared.preview.localState).toBe('non-empty');
    expect(prepared.preview.canRestore).toBe(false);
    await expect(
      applyPreparedCloudAccountRestore(prepared, runtime, {
        targetDatabase: target,
        stageDatabaseName: STAGE_NAME,
      }),
    ).rejects.toThrow('contient déjà des données locales');
    expect(await target.weights.count()).toBe(1);
    target.close();
  });

  it('autorise la restauration différée malgré un objectif quotidien recalculable', async () => {
    const target = new AppDatabase(TARGET_NAME);
    await target.open();
    await target.dailyTargets.put(dailyTarget());
    const source = {
      ...emptySource(),
      weights: [weight()],
    };
    const runtime = createRuntime(() => source, async (database) => {
      await database.weights.put(weight());
    });

    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
      { targetDatabase: target },
    );

    expect(prepared.preview.localState).toBe('empty');
    expect(prepared.preview.canRestore).toBe(true);

    await applyPreparedCloudAccountRestore(prepared, runtime, {
      targetDatabase: target,
      stageDatabaseName: STAGE_NAME,
    });

    expect(await target.weights.count()).toBe(1);
    expect(await target.dailyTargets.count()).toBe(0);
    target.close();
  });


  it('ne considère pas les réglages par défaut comme des données locales bloquantes', async () => {
    const target = new AppDatabase(TARGET_NAME);
    await target.open();
    const defaults = createDefaultUserSettings();
    await target.userSettings.put(defaults);
    const source = {
      ...emptySource(),
      accountPreferences: [accountPreferences()],
    };
    const runtime = createRuntime(() => source);

    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
      { targetDatabase: target },
    );

    expect(prepared.preview.cloudRecordCount).toBe(1);
    expect(prepared.preview.localState).toBe('empty');
    expect(prepared.preview.canRestore).toBe(true);
    target.close();
  });

  it('considère un réglage utilisateur personnalisé comme une donnée locale', async () => {
    const target = new AppDatabase(TARGET_NAME);
    await target.open();
    const customized = createDefaultUserSettings();
    customized.id = USER_SETTINGS_ID;
    customized.includedBaseSteps = 4_500;
    await target.userSettings.put(customized);
    const source = {
      ...emptySource(),
      accountPreferences: [accountPreferences()],
    };
    const runtime = createRuntime(() => source);

    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
      { targetDatabase: target },
    );

    expect(prepared.preview.localState).toBe('non-empty');
    expect(prepared.preview.canRestore).toBe(false);
    target.close();
  });

  it('restaure aussi les récompenses, thèmes, missions et rappels', async () => {
    const source = {
      ...emptySource(),
      rewardsRoutines: [rewardsRoutines()],
    };
    const runtime = createRuntime(() => source, async (database) => {
      const aggregate = rewardsRoutines();
      const settings = createDefaultUserSettings();
      settings.routineReminderPreferences = aggregate.routineReminderPreferences.value;
      settings.routineReminderUpdatedAt = aggregate.routineReminderPreferences.updatedAt;
      await database.transaction(
        'rw',
        [
          database.userSettings,
          database.earnedAchievements,
          database.unlockedVisualThemes,
          database.visualThemePreferences,
          database.weeklyMissionCompletions,
          database.routineReminderCompletions,
        ],
        async () => {
          await database.userSettings.put(settings);
          await database.earnedAchievements.bulkPut([...aggregate.earnedAchievements]);
          await database.unlockedVisualThemes.bulkPut([...aggregate.unlockedVisualThemes]);
          await database.visualThemePreferences.put(aggregate.visualThemePreference);
          await database.weeklyMissionCompletions.bulkPut([...aggregate.weeklyMissionCompletions]);
          await database.routineReminderCompletions.bulkPut([...aggregate.routineReminderCompletions]);
        },
      );
    });

    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
    );

    expect(prepared.preview.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'rewardsRoutines', recordCount: 6 }),
      ]),
    );
    await applyPreparedCloudAccountRestore(prepared, runtime, {
      stageDatabaseName: STAGE_NAME,
    });

    const restored = new AppDatabase(TARGET_NAME);
    await restored.open();
    expect(await restored.earnedAchievements.count()).toBe(1);
    expect(await restored.unlockedVisualThemes.count()).toBe(2);
    expect(await restored.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID))
      .toMatchObject({ activeThemeId: 'endurance' });
    expect(await restored.weeklyMissionCompletions.count()).toBe(1);
    expect(await restored.routineReminderCompletions.count()).toBe(1);
    expect(await restored.userSettings.get(USER_SETTINGS_ID)).toMatchObject({
      routineReminderPreferences: { snoozeMinutes: 120 },
    });
    restored.close();
  });

  it('annule toute écriture locale si la préparation temporaire échoue', async () => {
    const source = {
      ...emptySource(),
      weights: [weight()],
    };
    const runtime = createRuntime(() => source, async (database) => {
      await database.weights.put(weight());
      throw new Error('échec simulé');
    });
    const prepared = await prepareCloudAccountRestore(
      ACCOUNT_FINGERPRINT,
      runtime,
    );

    await expect(
      applyPreparedCloudAccountRestore(prepared, runtime, {
        stageDatabaseName: STAGE_NAME,
      }),
    ).rejects.toThrow('échec simulé');
    expect(await Dexie.exists(TARGET_NAME)).toBe(false);
    expect(await Dexie.exists(STAGE_NAME)).toBe(false);
  });
});
