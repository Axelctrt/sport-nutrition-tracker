import { addDays, format, parseISO, startOfWeek, subDays, subWeeks } from "date-fns";

import {
  buildThemeAchievementSnapshot,
  type ThemeAchievementData,
} from "@/application/rewards/themeAchievementService";
import type { Activity } from "@/domain/models/activity";
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from "@/domain/models/dailyCoaching";
import type { FoodEntry } from "@/domain/models/food";
import type { LocalDate } from "@/domain/models/common";
import type { VisualThemeState } from "@/domain/rewards/visualThemes";

const REFERENCE_DATE = "2026-07-28";
const CORE_STATE: VisualThemeState = {
  activeThemeId: "core",
  unlockedThemeIds: ["core"],
  unlockMetadata: {},
};

type MutableThemeAchievementData = {
  activities: Activity[];
  workoutSessions: ThemeAchievementData["workoutSessions"][number][];
  checkIns: DailyCheckIn[];
  checkOuts: DailyCheckOut[];
  foodEntries: FoodEntry[];
  activityDecisions: DailyActivityDecision[];
};

function localDate(value: Date): LocalDate {
  return format(value, "yyyy-MM-dd");
}

function entityTimes(date: LocalDate) {
  return {
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

function activity(id: string, date: LocalDate): Activity {
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
    ...entityTimes(date),
  };
}

function checkIn(id: string, date: LocalDate): DailyCheckIn {
  return {
    id,
    date,
    contextFlags: [],
    contextSyncPreference: "localOnly",
    completedAt: `${date}T07:30:00.000Z`,
    ...entityTimes(date),
  };
}

function checkOut(id: string, date: LocalDate): DailyCheckOut {
  return {
    id,
    date,
    foodJournalComplete: true,
    contextFlags: [],
    contextSyncPreference: "localOnly",
    completedAt: `${date}T20:30:00.000Z`,
    ...entityTimes(date),
  };
}

function foodEntry(id: string, date: LocalDate): FoodEntry {
  return {
    id,
    date,
    mealId: `meal-${date}`,
    mealSlot: "lunch",
    sourceType: "product",
    reference: {
      sourceType: "product",
      productId: "product-1",
      inputMode: "amount",
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: "g",
      nutritionPer100Snapshot: {
        caloriesKcal: 150,
        proteinGrams: 10,
        carbohydratesGrams: 15,
        fatGrams: 5,
      },
    },
    ...entityTimes(date),
  };
}

function restDecision(id: string, date: LocalDate): DailyActivityDecision {
  return {
    id,
    date,
    decision: "rest",
    confirmedAt: `${date}T09:00:00.000Z`,
    ...entityTimes(date),
  };
}

function emptyData(): MutableThemeAchievementData {
  return {
    activities: [],
    workoutSessions: [],
    checkIns: [],
    checkOuts: [],
    foodEntries: [],
    activityDecisions: [],
  };
}

function themeUnlocked(
  data: ThemeAchievementData,
  themeId: VisualThemeState["activeThemeId"],
  state: VisualThemeState = CORE_STATE,
): boolean {
  return buildThemeAchievementSnapshot(data, REFERENCE_DATE, state)
    .themes.find(({ theme }) => theme.id === themeId)?.unlocked ?? false;
}

function addBalancedWeek(
  data: {
    activities: Activity[];
    checkIns: DailyCheckIn[];
    checkOuts: DailyCheckOut[];
    foodEntries: FoodEntry[];
    activityDecisions: DailyActivityDecision[];
  },
  weekStart: LocalDate,
  index: number,
  useConfirmedRest = false,
): void {
  const dates = [0, 1, 2].map((offset) => (
    localDate(addDays(parseISO(weekStart), offset))
  ));
  for (const [dayIndex, date] of dates.entries()) {
    data.checkIns.push(checkIn(`in-${index}-${dayIndex}`, date));
    data.foodEntries.push(foodEntry(`food-${index}-${dayIndex}`, date));
  }
  data.activities.push(activity(`activity-${index}-0`, dates[0]!));
  if (useConfirmedRest) {
    data.activityDecisions.push(restDecision(`rest-${index}`, dates[1]!));
  } else {
    data.activities.push(activity(`activity-${index}-1`, dates[2]!));
  }
}

describe("themeAchievementService", () => {
  it("ne débloque que Core sans données", () => {
    const snapshot = buildThemeAchievementSnapshot(
      emptyData(),
      REFERENCE_DATE,
      CORE_STATE,
    );

    expect(snapshot.themes).toHaveLength(5);
    expect(snapshot.previewableCount).toBe(5);
    expect(
      snapshot.themes
        .filter(({ unlocked }) => unlocked)
        .map(({ theme }) => theme.id),
    ).toEqual(["core"]);
  });

  it("débloque Neon Pulse avec 20 activités sur au moins 3 semaines régulières", () => {
    const data = emptyData();
    const weekStarts = ["2026-06-01", "2026-06-15", "2026-07-06"] as LocalDate[];
    for (const [weekIndex, weekStart] of weekStarts.entries()) {
      for (let dayIndex = 0; dayIndex < 3; dayIndex += 1) {
        data.activities.push(activity(
          `regular-${weekIndex}-${dayIndex}`,
          localDate(addDays(parseISO(weekStart), dayIndex)),
        ));
      }
    }
    for (let index = 9; index < 20; index += 1) {
      data.activities.push(activity(`extra-${index}`, "2026-07-06"));
    }

    expect(themeUnlocked(data, "neon-pulse")).toBe(true);
    expect(
      buildThemeAchievementSnapshot(data, REFERENCE_DATE, CORE_STATE)
        .metrics.regularActivityWeeks,
    ).toBe(3);
  });

  it("ne compte plus une activité supprimée avant le déblocage mais conserve un thème acquis", () => {
    const data = emptyData();
    for (let index = 0; index < 20; index += 1) {
      const weekOffset = index < 3 ? 0 : index < 6 ? 2 : 4;
      data.activities.push(activity(
        `activity-${index}`,
        localDate(addDays(
          subWeeks(parseISO("2026-07-27"), weekOffset),
          index % 3,
        )),
      ));
    }
    const deletedBeforeUnlock = {
      ...data,
      activities: data.activities.slice(0, 19),
    };
    const acquiredState: VisualThemeState = {
      activeThemeId: "core",
      unlockedThemeIds: ["core", "neon-pulse"],
      unlockMetadata: {
        "neon-pulse": { unlockedAt: "2026-07-20T08:00:00.000Z" },
      },
    };

    expect(themeUnlocked(deletedBeforeUnlock, "neon-pulse")).toBe(false);
    expect(themeUnlocked(emptyData(), "neon-pulse", acquiredState)).toBe(true);
  });

  it("débloque Emerald Focus sur une fenêtre glissante de 30 jours", () => {
    const data = emptyData();
    for (let index = 0; index < 12; index += 1) {
      const date = localDate(subDays(parseISO(REFERENCE_DATE), index));
      data.checkIns.push(checkIn(`in-${index}`, date));
      data.checkOuts.push(checkOut(`out-${index}`, date));
      if (index < 10) data.foodEntries.push(foodEntry(`food-${index}`, date));
    }
    const staleDate = "2026-06-20";
    data.checkIns.push(checkIn("stale-in", staleDate));
    data.checkOuts.push(checkOut("stale-out", staleDate));

    const snapshot = buildThemeAchievementSnapshot(
      data,
      REFERENCE_DATE,
      CORE_STATE,
    );

    expect(themeUnlocked(data, "emerald-focus")).toBe(true);
    expect(snapshot.metrics.completeDaysInThirtyDays).toBe(12);
    expect(snapshot.metrics.nutritionDaysInThirtyDays).toBe(10);
  });

  it("accepte quatre semaines équilibrées non consécutives avec repos confirmé", () => {
    const data = emptyData();
    const currentWeekStart = startOfWeek(parseISO(REFERENCE_DATE), {
      weekStartsOn: 1,
    });
    for (const [index, weekOffset] of [1, 3, 5, 7].entries()) {
      addBalancedWeek(
        data,
        localDate(subWeeks(currentWeekStart, weekOffset)),
        index,
        true,
      );
    }

    const snapshot = buildThemeAchievementSnapshot(
      data,
      REFERENCE_DATE,
      CORE_STATE,
    );

    expect(themeUnlocked(data, "aurora")).toBe(true);
    expect(snapshot.metrics.balancedWeeks).toBe(4);
    expect(snapshot.balancedWeeks.every(({ activityAxisMet }) => activityAxisMet))
      .toBe(true);
  });

  it("exige bien les trois axes d'une semaine équilibrée", () => {
    const data = emptyData();
    const weekStart = "2026-07-13";
    for (let index = 0; index < 3; index += 1) {
      const date = localDate(addDays(parseISO(weekStart), index));
      data.checkIns.push(checkIn(`in-${index}`, date));
      data.foodEntries.push(foodEntry(`food-${index}`, date));
    }
    data.activities.push(activity("only-activity", weekStart));

    const [week] = buildThemeAchievementSnapshot(
      data,
      REFERENCE_DATE,
      CORE_STATE,
    ).balancedWeeks;

    expect(week).toMatchObject({
      trackingDays: 3,
      nutritionDays: 3,
      completedActivities: 1,
      confirmedRestDays: 0,
      activityAxisMet: false,
      balanced: false,
    });
  });

  it("débloque Zenith Gold avec 8 semaines équilibrées sur 12, 50 activités et 40 journées complètes", () => {
    const data = emptyData();
    const currentWeekStart = startOfWeek(parseISO(REFERENCE_DATE), {
      weekStartsOn: 1,
    });
    for (let index = 1; index <= 8; index += 1) {
      addBalancedWeek(
        data,
        localDate(subWeeks(currentWeekStart, index)),
        index,
      );
    }
    while (data.activities.length < 50) {
      data.activities.push(activity(
        `extra-${data.activities.length}`,
        "2026-07-01",
      ));
    }
    for (let index = 0; index < 40; index += 1) {
      const date = localDate(subDays(parseISO(REFERENCE_DATE), index));
      if (!data.checkIns.some((entry) => entry.date === date)) {
        data.checkIns.push(checkIn(`complete-in-${index}`, date));
      }
      data.checkOuts.push(checkOut(`complete-out-${index}`, date));
    }

    const snapshot = buildThemeAchievementSnapshot(
      data,
      REFERENCE_DATE,
      CORE_STATE,
    );

    expect(themeUnlocked(data, "zenith-gold")).toBe(true);
    expect(snapshot.metrics).toMatchObject({
      balancedWeeksInTwelveWeeks: 8,
      completedActivities: 50,
      completeDaysAllTime: 40,
    });
  });
});
