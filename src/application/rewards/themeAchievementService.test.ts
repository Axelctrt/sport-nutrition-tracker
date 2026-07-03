import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";

describe("themeAchievementService", () => {
  const emptyMetrics = {
    totalLoggedSessions: 0,
    enduranceActivities: 0,
    runningKm: 0,
    swimmingActivities: 0,
    swimmingMeters: 0,
    completedStrengthSessions: 0,
    strengthVolumeKg: 0,
    activeDays: 0,
  };

  it("ne débloque que le thème classique sans accomplissement", () => {
    const snapshot = buildThemeAchievementSnapshot(emptyMetrics);

    expect(snapshot.themes).toHaveLength(15);
    expect(snapshot.previewableCount).toBe(15);
    expect(
      snapshot.themes
        .filter((progress) => progress.unlocked)
        .map((progress) => progress.theme.id),
    ).toEqual(["classic"]);
  });

  it("débloque les thèmes lorsque les seuils sont atteints", () => {
    const snapshot = buildThemeAchievementSnapshot({
      totalLoggedSessions: 500,
      enduranceActivities: 5,
      runningKm: 500,
      swimmingActivities: 10,
      swimmingMeters: 100000,
      completedStrengthSessions: 100,
      strengthVolumeKg: 50000,
      activeDays: 14,
    });

    expect(snapshot.themes.every((progress) => progress.unlocked)).toBe(true);
  });

  it("conserve un thème déjà acquis même si les données sont ensuite nettoyées", () => {
    const snapshot = buildThemeAchievementSnapshot(emptyMetrics, ["classic", "power"]);

    expect(
      snapshot.themes.find((progress) => progress.theme.id === "power")
        ?.unlocked,
    ).toBe(true);
  });
});
