import Dexie, { type Table } from 'dexie';

import { createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { RoutineReminderPreferences } from '@/domain/reminders/routineReminder';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  REWARDS_ROUTINES_AGGREGATE_ID,
  previewRealRewardsRoutinesSync,
  synchronizeRealRewardsRoutines,
  type RewardsRoutinesAggregate,
} from '@/infrastructure/sync-prototype/realRewardsRoutinesSyncService';
import { initializeUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';
import {
  VISUAL_THEME_PREFERENCE_ID,
  routineReminderCompletionId,
  weeklyMissionCompletionId,
} from '@/infrastructure/user-state/userStateModels';

interface CloudAggregate extends RewardsRoutinesAggregate {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
}

class TestCloudDatabase extends Dexie {
  declare realRewardsRoutines: Table<CloudAggregate, string>;

  constructor() {
    super(`sportpilot-e2-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({ realRewardsRoutines: 'id, updatedAt' });
  }
}

const T1 = '2026-07-01T08:00:00.000Z';
const T2 = '2026-07-02T08:00:00.000Z';
const T3 = '2026-07-03T08:00:00.000Z';

function reminderPreferences(
  snoozeMinutes: 30 | 60 | 120 | 240,
): RoutineReminderPreferences {
  return {
    ...createDefaultUserSettings().routineReminderPreferences!,
    snoozeMinutes,
  };
}

function aggregate(
  overrides: Partial<RewardsRoutinesAggregate> = {},
): RewardsRoutinesAggregate {
  const base: RewardsRoutinesAggregate = {
    id: REWARDS_ROUTINES_AGGREGATE_ID,
    earnedAchievements: [],
    unlockedVisualThemes: [
      { id: 'core', unlockedAt: T1, updatedAt: T1 },
    ],
    visualThemePreference: {
      id: VISUAL_THEME_PREFERENCE_ID,
      activeThemeId: 'core',
      updatedAt: T1,
    },
    weeklyMissionCompletions: [],
    routineReminderCompletions: [],
    routineReminderPreferences: {
      value: reminderPreferences(60),
      updatedAt: T1,
    },
    updatedAt: T1,
  };
  const value = { ...base, ...overrides };
  const timestamps = [
    ...value.earnedAchievements.map((entry) => entry.updatedAt),
    ...value.unlockedVisualThemes.map((entry) => entry.updatedAt),
    value.visualThemePreference.updatedAt,
    ...value.weeklyMissionCompletions.map((entry) => entry.updatedAt),
    ...value.routineReminderCompletions.map((entry) => entry.updatedAt),
    value.routineReminderPreferences.updatedAt,
  ];
  return { ...value, updatedAt: timestamps.sort().at(-1)! };
}

describe('synchronisation E2 des récompenses et rappels', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-e2-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
    await initializeUserStateRuntime(local);
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie l’état local une seule fois', async () => {
    await local.earnedAchievements.put({
      id: 'first-session',
      earnedAt: T1,
      updatedAt: T1,
    });

    const first = await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedAchievements).toBe(1);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realRewardsRoutines.get('#rewards-routines'))
      .toMatchObject({
        earnedAchievements: [{ id: 'first-session', earnedAt: T1 }],
      });
  });

  it('fusionne la progression et conserve les dates les plus anciennes', async () => {
    await local.earnedAchievements.put({
      id: 'first-session',
      earnedAt: T2,
      updatedAt: T2,
    });
    await local.unlockedVisualThemes.bulkPut([
      { id: 'core', unlockedAt: T2, updatedAt: T2 },
      { id: 'neon-pulse', unlockedAt: T2, updatedAt: T2 },
    ]);
    await local.weeklyMissionCompletions.put({
      id: weeklyMissionCompletionId('2026-06-29'),
      weekStart: '2026-06-29',
      completedAt: T2,
      updatedAt: T2,
    });
    await cloud.realRewardsRoutines.put({
      ...aggregate({
        earnedAchievements: [
          { id: 'first-session', earnedAt: T1, updatedAt: T1 },
          { id: 'ten-sessions', earnedAt: T2, updatedAt: T2 },
        ],
        unlockedVisualThemes: [
          { id: 'core', unlockedAt: T1, updatedAt: T1 },
          { id: 'emerald-focus', unlockedAt: T2, updatedAt: T2 },
        ],
        weeklyMissionCompletions: [{
          id: weeklyMissionCompletionId('2026-06-29'),
          weekStart: '2026-06-29',
          completedAt: T1,
          updatedAt: T1,
        }],
      }),
      id: '#rewards-routines',
      owner: 'user-1',
    });

    await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.earnedAchievements.toArray()).toEqual([
      { id: 'first-session', earnedAt: T1, updatedAt: T1 },
      { id: 'ten-sessions', earnedAt: T2, updatedAt: T2 },
    ]);
    expect((await local.unlockedVisualThemes.toArray()).map(({ id }) => id).sort())
      .toEqual(['core', 'emerald-focus', 'neon-pulse']);
    expect(await local.weeklyMissionCompletions.get(
      weeklyMissionCompletionId('2026-06-29'),
    )).toMatchObject({ completedAt: T1 });
  });

  it('restaure le cloud sur un appareil vierge sans que les valeurs par défaut gagnent', async () => {
    const localSettings = createDefaultUserSettings();
    localSettings.createdAt = T3;
    localSettings.updatedAt = T3;
    localSettings.syncableUpdatedAt = T3;
    localSettings.routineReminderUpdatedAt = T3;
    await local.userSettings.put(localSettings);
    await cloud.realRewardsRoutines.put({
      ...aggregate({
        unlockedVisualThemes: [
          { id: 'core', unlockedAt: T1, updatedAt: T1 },
          { id: 'emerald-focus', unlockedAt: T1, updatedAt: T1 },
        ],
        visualThemePreference: {
          id: VISUAL_THEME_PREFERENCE_ID,
          activeThemeId: 'emerald-focus',
          updatedAt: T1,
        },
        routineReminderPreferences: {
          value: reminderPreferences(120),
          updatedAt: T1,
        },
      }),
      id: '#rewards-routines',
      owner: 'user-1',
    });

    await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
      { writeCloud: false },
    );

    expect(await local.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID))
      .toMatchObject({ activeThemeId: 'emerald-focus', updatedAt: T1 });
    expect(await local.userSettings.get(USER_SETTINGS_ID)).toMatchObject({
      routineReminderPreferences: { snoozeMinutes: 120 },
      routineReminderUpdatedAt: T1,
    });
  });

  it('conserve la préférence la plus récente sur un appareil déjà initialisé', async () => {
    await local.earnedAchievements.put({
      id: 'first-session',
      earnedAt: T1,
      updatedAt: T1,
    });
    await local.unlockedVisualThemes.bulkPut([
      { id: 'core', unlockedAt: T1, updatedAt: T1 },
      { id: 'neon-pulse', unlockedAt: T1, updatedAt: T1 },
    ]);
    await local.visualThemePreferences.put({
      id: VISUAL_THEME_PREFERENCE_ID,
      activeThemeId: 'neon-pulse',
      updatedAt: T3,
    });
    const localSettings = createDefaultUserSettings();
    localSettings.routineReminderPreferences = reminderPreferences(240);
    localSettings.routineReminderUpdatedAt = T3;
    localSettings.updatedAt = T3;
    await local.userSettings.put(localSettings);
    await cloud.realRewardsRoutines.put({
      ...aggregate({
        unlockedVisualThemes: [
          { id: 'core', unlockedAt: T1, updatedAt: T1 },
          { id: 'emerald-focus', unlockedAt: T1, updatedAt: T1 },
        ],
        visualThemePreference: {
          id: VISUAL_THEME_PREFERENCE_ID,
          activeThemeId: 'emerald-focus',
          updatedAt: T2,
        },
        routineReminderPreferences: {
          value: reminderPreferences(120),
          updatedAt: T2,
        },
      }),
      id: '#rewards-routines',
      owner: 'user-1',
    });

    await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.visualThemePreferences.get(VISUAL_THEME_PREFERENCE_ID))
      .toMatchObject({ activeThemeId: 'neon-pulse', updatedAt: T3 });
    expect(await local.userSettings.get(USER_SETTINGS_ID)).toMatchObject({
      routineReminderPreferences: { snoozeMinutes: 240 },
      routineReminderUpdatedAt: T3,
    });
  });

  it('fusionne les complétions de rappels sans les dupliquer', async () => {
    const id = routineReminderCompletionId('2026-07-01', 'training');
    await local.routineReminderCompletions.put({
      id,
      date: '2026-07-01',
      type: 'training',
      completedAt: T2,
      updatedAt: T2,
    });
    await cloud.realRewardsRoutines.put({
      ...aggregate({
        routineReminderCompletions: [{
          id,
          date: '2026-07-01',
          type: 'training',
          completedAt: T1,
          updatedAt: T1,
        }],
      }),
      id: '#rewards-routines',
      owner: 'user-1',
    });

    const result = await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const preview = await previewRealRewardsRoutinesSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedReminderCompletions).toBe(1);
    expect(await local.routineReminderCompletions.get(id))
      .toMatchObject({ completedAt: T1 });
    expect(preview.differingEntityCount).toBe(0);
  });

  it('ignore l’état appartenant à un autre compte', async () => {
    await cloud.realRewardsRoutines.put({
      ...aggregate({
        earnedAchievements: [
          { id: 'first-session', earnedAt: T1, updatedAt: T1 },
        ],
      }),
      id: '#rewards-routines',
      owner: 'other-user',
    });

    const result = await synchronizeRealRewardsRoutines(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
      { writeCloud: false },
    );

    expect(result.cloudStatePresent).toBe(false);
    expect(await local.earnedAchievements.count()).toBe(0);
  });
});
