import { buildConsistencyStreakSnapshot } from "@/application/rewards/consistencyStreakService";

describe("buildConsistencyStreakSnapshot", () => {
  it("calcule la série active, le record et les fenêtres récentes", () => {
    const snapshot = buildConsistencyStreakSnapshot(
      [
        "2026-06-20",
        "2026-06-21",
        "2026-06-22",
        "2026-06-24",
        "2026-06-25",
        "2026-06-26",
        "2026-06-26",
      ],
      new Date(2026, 5, 27),
    );

    expect(snapshot.currentStreak).toBe(3);
    expect(snapshot.bestStreak).toBe(3);
    expect(snapshot.activeDaysLast7).toBe(5);
    expect(snapshot.activeDaysLast30).toBe(6);
    expect(snapshot.latestActiveDate).toBe("2026-06-26");
  });

  it("remet la série actuelle à zéro après deux journées sans activité", () => {
    const snapshot = buildConsistencyStreakSnapshot(
      ["2026-06-20", "2026-06-21", "2026-06-22", "2026-06-24"],
      new Date(2026, 5, 27),
    );

    expect(snapshot.currentStreak).toBe(0);
    expect(snapshot.bestStreak).toBe(3);
    expect(snapshot.latestActiveDate).toBe("2026-06-24");
  });

  it("ignore les dates invalides et ne compte qu'une fois chaque journée", () => {
    const snapshot = buildConsistencyStreakSnapshot(
      ["2026-06-27", "2026-06-27", "date-invalide", "2026-02-31"],
      new Date(2026, 5, 27),
    );

    expect(snapshot.activeDates).toEqual(["2026-06-27"]);
    expect(snapshot.currentStreak).toBe(1);
    expect(snapshot.bestStreak).toBe(1);
  });
});
