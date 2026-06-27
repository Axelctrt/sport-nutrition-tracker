import {
  buildWeeklyMissionHistorySnapshot,
  readWeeklyMissionHistoryState,
  recordCompletedWeeklyMission,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
} from "@/domain/rewards/weeklyMissionHistory";

describe("weeklyMissionHistory", () => {
  beforeEach(() => {
    window.localStorage.removeItem(
      WEEKLY_MISSION_HISTORY_STORAGE_KEY,
    );
  });

  it("enregistre une semaine une seule fois", () => {
    const firstResult = recordCompletedWeeklyMission(
      "2026-06-22",
      "2026-06-27T20:00:00.000Z",
      new Date(2026, 5, 27),
    );
    const secondResult = recordCompletedWeeklyMission(
      "2026-06-22",
      "2026-06-28T10:00:00.000Z",
      new Date(2026, 5, 28),
    );

    expect(firstResult.newlyRecorded).toEqual({
      weekStart: "2026-06-22",
      completedAt: "2026-06-27T20:00:00.000Z",
    });
    expect(secondResult.newlyRecorded).toBeUndefined();
    expect(readWeeklyMissionHistoryState().completedWeeks).toHaveLength(1);
  });

  it("calcule la série actuelle et le meilleur record", () => {
    const snapshot = buildWeeklyMissionHistorySnapshot(
      {
        completedWeeks: [
          {
            weekStart: "2026-05-25",
            completedAt: "2026-05-30T12:00:00.000Z",
          },
          {
            weekStart: "2026-06-01",
            completedAt: "2026-06-06T12:00:00.000Z",
          },
          {
            weekStart: "2026-06-15",
            completedAt: "2026-06-20T12:00:00.000Z",
          },
          {
            weekStart: "2026-06-22",
            completedAt: "2026-06-27T12:00:00.000Z",
          },
        ],
      },
      new Date(2026, 5, 27),
    );

    expect(snapshot.completedWeekCount).toBe(4);
    expect(snapshot.currentWeeklyStreak).toBe(2);
    expect(snapshot.bestWeeklyStreak).toBe(2);
    expect(snapshot.latestCompletedWeekStart).toBe("2026-06-22");
  });

  it("maintient la série de la semaine précédente pendant la semaine courante", () => {
    const snapshot = buildWeeklyMissionHistorySnapshot(
      {
        completedWeeks: [
          {
            weekStart: "2026-06-15",
            completedAt: "2026-06-20T12:00:00.000Z",
          },
          {
            weekStart: "2026-06-22",
            completedAt: "2026-06-27T12:00:00.000Z",
          },
        ],
      },
      new Date(2026, 6, 1),
    );

    expect(snapshot.currentWeeklyStreak).toBe(2);
    expect(snapshot.bestWeeklyStreak).toBe(2);
  });
});
