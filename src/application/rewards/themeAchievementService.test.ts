import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";

describe("themeAchievementService", () => {
  it("ne débloque que le thème classique sans accomplissement", () => {
    const snapshot = buildThemeAchievementSnapshot({
      enduranceActivities: 0,
      completedStrengthSessions: 0,
      activeDays: 0,
    });

    expect(
      snapshot.themes
        .filter((progress) => progress.unlocked)
        .map((progress) => progress.theme.id),
    ).toEqual(["classic"]);
  });

  it("débloque les thèmes lorsque les seuils sont atteints", () => {
    const snapshot = buildThemeAchievementSnapshot({
      enduranceActivities: 5,
      completedStrengthSessions: 5,
      activeDays: 14,
    });

    expect(snapshot.themes.every((progress) => progress.unlocked)).toBe(true);
  });

  it("conserve un thème déjà acquis même si les données sont ensuite nettoyées", () => {
    const snapshot = buildThemeAchievementSnapshot(
      {
        enduranceActivities: 0,
        completedStrengthSessions: 0,
        activeDays: 0,
      },
      ["classic", "power"],
    );

    expect(
      snapshot.themes.find((progress) => progress.theme.id === "power")
        ?.unlocked,
    ).toBe(true);
  });
});
