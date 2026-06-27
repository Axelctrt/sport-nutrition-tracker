import { buildAchievementSnapshot } from "@/application/rewards/achievementService";

describe("achievementService", () => {
  const emptyMetrics = {
    totalLoggedSessions: 0,
    enduranceActivities: 0,
    completedStrengthSessions: 0,
    activeDays: 0,
    disciplineCount: 0,
  };

  it("ne gagne aucun badge sans historique", () => {
    const snapshot = buildAchievementSnapshot(emptyMetrics);

    expect(snapshot.earnedCount).toBe(0);
    expect(snapshot.totalCount).toBe(8);
  });

  it("gagne les badges dont les seuils sont atteints", () => {
    const snapshot = buildAchievementSnapshot(
      {
        totalLoggedSessions: 10,
        enduranceActivities: 5,
        completedStrengthSessions: 5,
        activeDays: 7,
        disciplineCount: 3,
      },
      [],
      "2026-06-27T12:00:00.000Z",
    );

    expect(snapshot.earnedCount).toBe(6);
    expect(
      snapshot.achievements.find(
        (progress) => progress.achievement.id === "first-session",
      )?.earnedAt,
    ).toBe("2026-06-27T12:00:00.000Z");
  });

  it("conserve un badge acquis après nettoyage des données", () => {
    const snapshot = buildAchievementSnapshot(emptyMetrics, [
      {
        id: "strength-five",
        earnedAt: "2026-06-20T08:00:00.000Z",
      },
    ]);

    const strengthBadge = snapshot.achievements.find(
      (progress) => progress.achievement.id === "strength-five",
    );

    expect(strengthBadge?.earned).toBe(true);
    expect(strengthBadge?.earnedAt).toBe("2026-06-20T08:00:00.000Z");
    expect(strengthBadge?.current).toBe(0);
  });
});
