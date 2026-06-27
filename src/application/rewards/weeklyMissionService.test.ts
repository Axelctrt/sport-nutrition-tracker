import { buildWeeklyMissionSnapshot } from "@/application/rewards/weeklyMissionService";

describe("buildWeeklyMissionSnapshot", () => {
  it("calcule les cinq missions sur une semaine du lundi au dimanche", () => {
    const snapshot = buildWeeklyMissionSnapshot(
      {
        activityDates: [
          "2026-06-22",
          "2026-06-24",
          "2026-06-26",
          "2026-06-28",
        ],
        enduranceActivityDates: ["2026-06-22", "2026-06-24"],
        completedStrengthSessionDates: [
          "2026-06-24",
          "2026-06-26",
        ],
        completedNutritionDates: [
          "2026-06-22",
          "2026-06-23",
          "2026-06-24",
          "2026-06-25",
          "2026-06-26",
        ],
        weightDates: ["2026-06-25"],
      },
      new Date(2026, 5, 27),
    );

    expect(snapshot.weekStart).toBe("2026-06-22");
    expect(snapshot.weekEnd).toBe("2026-06-28");
    expect(snapshot.completedCount).toBe(5);
    expect(snapshot.completionPercentage).toBe(100);
    expect(snapshot.missions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "activeDays",
          current: 4,
          completed: true,
        }),
        expect.objectContaining({
          id: "nutritionDays",
          current: 5,
          completed: true,
        }),
      ]),
    );
  });

  it("ignore les données hors semaine et déduplique les missions en journées", () => {
    const snapshot = buildWeeklyMissionSnapshot(
      {
        activityDates: [
          "2026-06-21",
          "2026-06-22",
          "2026-06-22",
        ],
        enduranceActivityDates: ["2026-06-21", "2026-06-22"],
        completedStrengthSessionDates: ["2026-06-22"],
        completedNutritionDates: [
          "2026-06-22",
          "2026-06-22",
          "2026-06-29",
        ],
        weightDates: [
          "2026-06-20",
          "2026-06-23",
          "2026-06-23",
        ],
      },
      new Date(2026, 5, 27),
    );

    expect(
      snapshot.missions.find((mission) => mission.id === "activeDays"),
    ).toEqual(expect.objectContaining({ current: 1 }));
    expect(
      snapshot.missions.find((mission) => mission.id === "nutritionDays"),
    ).toEqual(expect.objectContaining({ current: 1 }));
    expect(
      snapshot.missions.find((mission) => mission.id === "weighInDays"),
    ).toEqual(expect.objectContaining({ current: 1 }));
  });

  it("conserve la progression réelle tout en plafonnant la barre à 100 pour cent", () => {
    const snapshot = buildWeeklyMissionSnapshot(
      {
        activityDates: [
          "2026-06-22",
          "2026-06-23",
          "2026-06-24",
          "2026-06-25",
        ],
        enduranceActivityDates: [
          "2026-06-22",
          "2026-06-23",
          "2026-06-24",
        ],
        completedStrengthSessionDates: [],
        completedNutritionDates: [],
        weightDates: [],
      },
      new Date(2026, 5, 27),
    );

    expect(
      snapshot.missions.find((mission) => mission.id === "activeDays"),
    ).toEqual(
      expect.objectContaining({
        current: 4,
        target: 3,
        remaining: 0,
        percentage: 100,
        completed: true,
      }),
    );
  });
});
