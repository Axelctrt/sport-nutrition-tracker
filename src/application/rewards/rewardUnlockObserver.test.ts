import {
  buildAchievementSnapshot,
  loadAchievementPreview,
} from "@/application/rewards/achievementService";
import {
  buildRewardUnlockBatch,
  observeRewardUnlocks,
} from "@/application/rewards/rewardUnlockObserver";
import {
  buildThemeAchievementSnapshot,
  loadThemeAchievementPreview,
} from "@/application/rewards/themeAchievementService";
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

describe("rewardUnlockObserver", () => {
  it("regroupe uniquement les nouveaux badges et thèmes", () => {
    const achievements = buildAchievementSnapshot({
      totalLoggedSessions: 1,
      enduranceActivities: 5,
      completedStrengthSessions: 0,
      activeDays: 2,
      disciplineCount: 1,
    });
    const themes = buildThemeAchievementSnapshot({
      enduranceActivities: 5,
      completedStrengthSessions: 0,
      activeDays: 2,
    });

    const batch = buildRewardUnlockBatch(achievements, themes);

    expect(batch.achievements.map((item) => item.achievement.id)).toEqual([
      "first-session",
      "endurance-five",
    ]);
    expect(batch.themes.map((item) => item.theme.id)).toEqual(["endurance"]);
  });

  it("ne signale pas une récompense déjà conservée dans le stockage", () => {
    const achievements = buildAchievementSnapshot(
      {
        totalLoggedSessions: 1,
        enduranceActivities: 0,
        completedStrengthSessions: 0,
        activeDays: 1,
        disciplineCount: 1,
      },
      [{ id: "first-session", earnedAt: "2026-06-27T12:00:00.000Z" }],
    );
    const themes = buildThemeAchievementSnapshot(
      {
        enduranceActivities: 5,
        completedStrengthSessions: 0,
        activeDays: 1,
      },
      ["classic", "endurance"],
    );

    const batch = buildRewardUnlockBatch(achievements, themes);

    expect(batch.achievements).toEqual([]);
    expect(batch.themes).toEqual([]);
  });

  it("persiste les récompenses hors du contexte en lecture seule de liveQuery", async () => {
    const database = new AppDatabase(
      `reward-live-query-${crypto.randomUUID()}`,
    );
    await database.open();
    await initializeUserStateRuntime(database);
    writeAchievementState({ earnedAchievements: [] });
    writeVisualThemeState({
      activeThemeId: "classic",
      unlockedThemeIds: ["classic"],
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
    expect(onUnlocks).toHaveBeenCalledTimes(1);
    expect(
      readAchievementState().earnedAchievements.map(({ id }) => id),
    ).toContain("first-session");
    expect(readVisualThemeState().unlockedThemeIds).toEqual(["classic"]);

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
