import {
  buildPerformanceAnalytics,
  type PerformanceAnalyticsSource,
} from "@/application/analytics/performanceAnalyticsService";
import type { Activity } from "@/domain/models/activity";
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from "@/domain/models/dailyCoaching";
import type { FoodEntry } from "@/domain/models/food";
import type { TwelveWeekAnalytics } from "@/domain/models/analytics";
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from "@/domain/models/strength";
import type { PlannedEnduranceSession } from "@/domain/planning/endurancePlanningState";
import type { DailyTarget } from "@/domain/models/targets";

const CREATED_AT = "2026-07-01T08:00:00.000Z";

function walking(id: string, date: string): Activity {
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
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function checkIn(id: string, date: string): DailyCheckIn {
  return {
    id,
    date,
    contextFlags: [],
    contextSyncPreference: "localOnly",
    readiness: "normal",
    sleepDurationMinutes: 480,
    completedAt: `${date}T07:00:00.000Z`,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function checkOut(id: string, date: string): DailyCheckOut {
  return {
    id,
    date,
    energy: "high",
    hunger: "normal",
    foodJournalComplete: true,
    contextFlags: [],
    contextSyncPreference: "localOnly",
    completedAt: `${date}T21:00:00.000Z`,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function dailyTarget(id: string, date: string): DailyTarget {
  return {
    id,
    date,
    calculationWeightKg: 70,
    energy: {
      bmrKcal: 1_600,
      occupationalBaseKcal: 1_900,
      walkingKcal: 0,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 1_900,
    },
    goalAdjustmentKcal: -200,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1_600,
    targetCaloriesKcal: 2_200,
    macros: {
      proteinGrams: 120,
      carbohydratesGrams: 250,
      fatGrams: 70,
    },
    calculationVersion: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function food(id: string, date: string, proteinGrams: number): FoodEntry {
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
        caloriesKcal: 200,
        proteinGrams,
        carbohydratesGrams: 20,
        fatGrams: 8,
      },
    },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

const base: TwelveWeekAnalytics = {
  from: "2026-07-07",
  to: "2026-07-13",
  running: [],
  swimming: [],
  cycling: [],
  enduranceRecords: {
    running: {
      commonDistances: [],
    },
    swimming: {
      commonDistances: [],
    },
    cycling: {},
  },
  nutrition: [{
    weekStart: "2026-07-07",
    weekEnd: "2026-07-13",
    label: "7 juil.",
    trackedDayCount: 3,
    completedDayCount: 0,
    averageConsumedCaloriesKcal: 200,
    averageTargetCaloriesKcal: 2200,
    averageConsumedProteinGrams: 20,
    averageTargetProteinGrams: 120,
    calorieAdherencePercent: 0,
    proteinAdherencePercent: 0,
  }],
  activity: [{
    weekStart: "2026-07-07",
    weekEnd: "2026-07-13",
    label: "7 juil.",
    recordedStepDays: 0,
    totalSportMinutes: 30,
    sessionCount: 1,
    breakdown: [{
      type: "walking",
      durationMinutes: 30,
      sessionCount: 1,
    }],
  }],
  weight: {
    movingAverage: [],
    weekly: [],
  },
  activityBreakdown: [{
    type: "walking",
    durationMinutes: 30,
    sessionCount: 1,
  }],
};

function workoutSession(
  id: string,
  date: string,
  planned = true,
): WorkoutSession {
  return {
    id,
    date,
    status: "completed",
    completedAt: `${date}T18:00:00.000Z`,
    ...(planned ? { plannedAt: `${date}T08:00:00.000Z` } : {}),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function sessionExercise(
  id: string,
  sessionId: string,
): WorkoutSessionExercise {
  return {
    id,
    sessionId,
    exerciseDefinitionId: "bench",
    exerciseNameSnapshot: "Développé couché",
    sortOrder: 0,
    loadIncrementKg: 2.5,
    loadUnitSnapshot: "kg",
    trackingModeSnapshot: "loadRepetitions",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function strengthSet(
  id: string,
  sessionId: string,
  sessionExerciseId: string,
  weightKg: number,
): StrengthSet {
  return {
    id,
    sessionId,
    sessionExerciseId,
    setNumber: 1,
    repetitions: 5,
    weightKg,
    type: "working",
    isCompleted: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function source(): PerformanceAnalyticsSource {
  const activities = [walking("walk-1", "2026-07-07")];
  const checkIns = [
    checkIn("in-1", "2026-07-07"),
    checkIn("in-2", "2026-07-08"),
    checkIn("in-3", "2026-07-09"),
  ];
  const foodEntries = [
    food("food-1", "2026-07-07", 10),
    food("food-2", "2026-07-08", 20),
    food("food-3", "2026-07-09", 30),
  ];
  const activityDecisions: DailyActivityDecision[] = [{
    id: "rest-1",
    date: "2026-07-08",
    decision: "rest",
    confirmedAt: "2026-07-08T09:00:00.000Z",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }];
  const workoutSessions = [
    workoutSession("session-1", "2026-07-09"),
    workoutSession("session-2", "2026-07-12", false),
  ];
  const workoutSessionExercises = [
    sessionExercise("exercise-1", "session-1"),
    sessionExercise("exercise-2", "session-2"),
  ];
  const strengthSets = [
    strengthSet("set-1", "session-1", "exercise-1", 100),
    strengthSet("set-2", "session-2", "exercise-2", 105),
  ];
  const exerciseDefinitions: ExerciseDefinition[] = [{
    id: "bench",
    name: "Développé couché",
    primaryMuscleGroup: "pectorals",
    secondaryMuscleGroups: ["triceps"],
    equipment: "barbell",
    category: "strength",
    movementType: "compound",
    loadUnit: "kg",
    trackingMode: "loadRepetitions",
    source: "catalog",
    isArchived: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }];
  const endurancePlanningSessions: PlannedEnduranceSession[] = [{
    id: "plan-1",
    title: "Marche",
    activityType: "walking",
    date: "2026-07-07",
    intensity: "moderate",
    status: "planned",
    completedActivityId: "walk-1",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }];
  return {
    base,
    activities,
    checkIns,
    checkOuts: [checkOut("out-1", "2026-07-07")],
    activityDecisions,
    foodEntries,
    dailyTargets: [
      dailyTarget("target-1", "2026-07-07"),
      dailyTarget("target-2", "2026-07-08"),
      dailyTarget("target-3", "2026-07-09"),
    ],
    workoutSessions,
    workoutSessionExercises,
    strengthSets,
    exerciseDefinitions,
    endurancePlanningSessions,
  };
}

describe("performanceAnalyticsService", () => {
  it("calcule une semaine équilibrée avec une activité et un repos confirmé", () => {
    const snapshot = buildPerformanceAnalytics(source());

    expect(snapshot.regularity).toEqual([expect.objectContaining({
      trackingDays: 3,
      nutritionDays: 3,
      completedActivities: 1,
      confirmedRestDays: 1,
      balanced: true,
    })]);
  });

  it("ne considère réalisés que les plans reliés ou les séances planifiées terminées", () => {
    const snapshot = buildPerformanceAnalytics(source());

    expect(snapshot.plannedActual[0]).toMatchObject({
      plannedActivities: 2,
      realizedPlannedActivities: 2,
      completedActivities: 1,
      confirmedRestDays: 1,
      checkInDays: 3,
      nutritionDays: 3,
    });
  });

  it("calcule les macros sur les seuls jours réellement renseignés", () => {
    const snapshot = buildPerformanceAnalytics(source());

    expect(snapshot.macroWeeks[0]).toMatchObject({
      trackedDays: 3,
      proteinGrams: 20,
      carbohydratesGrams: 20,
      fatGrams: 8,
    });
  });

  it("ordonne la musculation et sépare volume, meilleure série et 1RM estimé", () => {
    const snapshot = buildPerformanceAnalytics(source());
    const exercise = snapshot.strengthExercises[0];

    expect(exercise).toMatchObject({
      exerciseId: "bench",
      name: "Développé couché",
      sessionCount: 2,
      latestEstimatedOneRepMaxKg: 122.5,
    });
    expect(exercise?.points).toEqual([
      expect.objectContaining({
        volumeKg: 500,
        bestSetLabel: "100 kg × 5",
        estimatedOneRepMaxKg: 116.7,
        personalRecord: false,
      }),
      expect.objectContaining({
        volumeKg: 525,
        bestSetLabel: "105 kg × 5",
        estimatedOneRepMaxKg: 122.5,
        personalRecord: true,
      }),
    ]);
  });

  it("sépare les consommations, cibles et repas au niveau quotidien", () => {
    const snapshot = buildPerformanceAnalytics(source());

    expect(snapshot.nutritionDays[0]).toMatchObject({
      date: "2026-07-07",
      caloriesKcal: 200,
      targetCaloriesKcal: 2_200,
      proteinGrams: 10,
      targetProteinGrams: 120,
      mealCalories: {
        breakfast: 0,
        lunch: 200,
        dinner: 0,
        snacks: 0,
      },
    });
  });

  it("expose uniquement les signaux déclarés et les séries musculaires réelles", () => {
    const snapshot = buildPerformanceAnalytics(source());

    expect(snapshot.recoveryDays[0]).toMatchObject({
      date: "2026-07-07",
      readiness: 2,
      energy: 3,
      hunger: 2,
      sleepHours: 8,
    });
    expect(snapshot.muscleGroupCells).toEqual([
      expect.objectContaining({
        date: "2026-07-09",
        muscleGroup: "pectorals",
        workingSets: 1,
      }),
      expect.objectContaining({
        date: "2026-07-12",
        muscleGroup: "pectorals",
        workingSets: 1,
      }),
    ]);
  });

  it("construit la heatmap sans inventer de données pour les jours vides", () => {
    const snapshot = buildPerformanceAnalytics(source());

    expect(snapshot.heatmap).toHaveLength(7);
    expect(snapshot.heatmap.find(({ date }) => date === "2026-07-07"))
      .toMatchObject({ score: 3, detail: "suivi quotidien, nutrition, activité" });
    expect(snapshot.heatmap.find(({ date }) => date === "2026-07-13"))
      .toMatchObject({ score: 0, detail: "aucune donnée renseignée" });
  });
});
