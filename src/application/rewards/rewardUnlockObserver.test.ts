import {
  buildAchievementSnapshot,
  loadAchievementPreview,
} from "@/application/rewards/achievementService";
import {
  buildRewardUnlockBatch,
  observeRewardUnlocks,
  persistRewardUnlockBatch,
} from "@/application/rewards/rewardUnlockObserver";
import {
  buildThemeAchievementSnapshot,
  loadThemeAchievementPreview,
} from "@/application/rewards/themeAchievementService";
import type { Activity } from "@/domain/models/activity";
import {
  flushAchievementStatePersistence,
  readAchievementState,
  writeAchievementState,
} from "@/domain/rewards/achievements";
import {
  flushVisualThemeStatePersistence,
  readVisualThemeState,
  writeVisualThemeState,
} from "@/domain/rewards/visualThemes";
import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { initializeUserStateRuntime } from "@/infrastructure/user-state/userStateRuntime";

const EMPTY_THEME_DATA = {
  activities: [] as Activity[],
  workoutSessions: [],
  checkIns: [],
  checkOuts: [],
  foodEntries: [],
  activityDecisions: [],
};

function activity(id: string, date: string): Activity {
  return {
    id,
    date,
    type: "walking",
    durationMinutes: 30,
    intensity: "moderate",
    met: 4,
    includedInDailySteps: true,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 140,
      calculationVersion: 1,
    },
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

function neonData() {
  const dates = [
    ...Array.from({ length: 3 }, (_, index) => `2026-06-0${index + 1}`),
    ...Array.from({ length: 3 }, (_, index) => `2026-06-${15 + index}`),
    ...Array.from({ length: 14 }, (_, index) => `2026-07-0${index % 3 + 6}`),
  ];
  return {
    ...EMPTY_THEME_DATA,
    activities: dates.map((date, index) => activity(`activity-${index}`, date)),
  };
}

describe("rewardUnlockObserver", () => {
  it("regroupe uniquement les nouveaux badges et thèmes", () => {
    const achievements = buildAchievementSnapshot({
      totalLoggedSessions: 1,
      enduranceActivities: 5,
      completedStrengthSessions: 0,
      activeDays: 2,
      disciplineCount: 1,
    });
    const themes = buildThemeAchievementSnapshot(
      neonData(),
      "2026-07-28",
      {
        activeThemeId: "core",
        unlockedThemeIds: ["core"],
        unlockMetadata: {},
      },
    );

    const batch = buildRewardUnlockBatch(achievements, themes);

    expect(batch.achievements.map((item) => item.achievement.id)).toEqual([
      "first-session",
      "endurance-five",
    ]);
    expect(batch.themes.map((item) => item.theme.id)).toEqual(["neon-pulse"]);
  });

  it("ne signale pas un thème déjà conservé", () => {
    const themes = buildThemeAchievementSnapshot(
      neonData(),
      "2026-07-28",
      {
        activeThemeId: "core",
        unlockedThemeIds: ["core", "neon-pulse"],
        unlockMetadata: {
          "neon-pulse": { unlockedAt: "2026-07-20T08:00:00.000Z" },
        },
      },
    );

    expect(buildRewardUnlockBatch(
      buildAchievementSnapshot({
        totalLoggedSessions: 0,
        enduranceActivities: 0,
        completedStrengthSessions: 0,
        activeDays: 0,
        disciplineCount: 0,
      }),
      themes,
    ).themes).toEqual([]);
  });

  it("persiste la date exacte du lot de déblocage", () => {
    writeVisualThemeState({
      activeThemeId: "core",
      unlockedThemeIds: ["core"],
      unlockMetadata: {},
    });
    const themes = buildThemeAchievementSnapshot(
      neonData(),
      "2026-07-28",
      readVisualThemeState(),
    );

    persistRewardUnlockBatch(
      { achievements: [], themes: themes.newlyUnlockedThemes },
      "2026-07-28T12:30:00.000Z",
    );

    expect(readVisualThemeState().unlockMetadata["neon-pulse"]?.unlockedAt)
      .toBe("2026-07-28T12:30:00.000Z");
  });

  it("persiste les récompenses hors du contexte en lecture seule de liveQuery", async () => {
    const database = new AppDatabase(
      `reward-live-query-${crypto.randomUUID()}`,
    );
    await database.open();
    await initializeUserStateRuntime(database);
    writeAchievementState({ earnedAchievements: [] });
    writeVisualThemeState({
      activeThemeId: "core",
      unlockedThemeIds: ["core"],
      unlockMetadata: {},
    });
    await Promise.all([
      flushAchievementStatePersistence(),
      flushVisualThemeStatePersistence(),
    ]);
    await database.activities.add({
      id: "activity-1",
      type: "running",
      date: "2026-06-29",
      durationMinutes: 45,
      intensity: "moderate",
      sessionType: "easy",
      distanceKm: 8,
      averageCadenceSpm: 170,
      calculation: {
        weightKg: 60,
        estimatedCaloriesKcal: 450,
        calculationVersion: 1,
      },
      createdAt: "2026-06-29T12:00:00.000Z",
      updatedAt: "2026-06-29T12:00:00.000Z",
    });

    const onUnlocks = vi.fn();
    const onError = vi.fn();
    const unsubscribe = observeRewardUnlocks(onUnlocks, onError, database);

    await vi.waitFor(() => {
      expect(onUnlocks).toHaveBeenCalledTimes(1);
    });
    await Promise.all([
      flushAchievementStatePersistence(),
      flushVisualThemeStatePersistence(),
    ]);

    expect(onError).not.toHaveBeenCalled();
    expect(
      readAchievementState().earnedAchievements.map(({ id }) => id),
    ).toContain("first-session");
    expect(readVisualThemeState().unlockedThemeIds).toEqual(["core"]);

    const [achievementPreview, themePreview] = await Promise.all([
      loadAchievementPreview(database),
      loadThemeAchievementPreview(database),
    ]);
    expect(achievementPreview.newlyEarnedAchievements).toEqual([]);
    expect(themePreview.newlyUnlockedThemes).toEqual([]);

    unsubscribe();
    database.close();
    await database.delete();
  });
});
