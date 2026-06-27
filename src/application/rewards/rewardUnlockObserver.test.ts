import { buildAchievementSnapshot } from "@/application/rewards/achievementService";
import { buildRewardUnlockBatch } from "@/application/rewards/rewardUnlockObserver";
import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";

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
});
