import { addDays, format, parseISO } from "date-fns";

import { loadTwelveWeekAnalytics } from "@/application/analytics/analyticsService";
import { calculateEstimatedOneRepMax } from "@/domain/calculations/strength";
import { calculateDailyNutrition } from "@/domain/calculations/nutrition";
import type { Activity } from "@/domain/models/activity";
import type {
  DailyActivityDecision,
  DailyCheckIn,
  DailyCheckOut,
} from "@/domain/models/dailyCoaching";
import type { FoodEntry } from "@/domain/models/food";
import type { TwelveWeekAnalytics } from "@/domain/models/analytics";
import type { LocalDate } from "@/domain/models/common";
import type { UserProfile } from "@/domain/models/profile";
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
} from "@/domain/models/strength";
import type { PlannedEnduranceSession } from "@/domain/planning/endurancePlanningState";
import { appDatabase } from "@/infrastructure/database/database";

export interface PerformanceRegularityWeek {
  weekStart: LocalDate;
  label: string;
  trackingDays: number;
  nutritionDays: number;
  completedActivities: number;
  confirmedRestDays: number;
  balanced: boolean;
}

export interface PlannedActualWeek {
  weekStart: LocalDate;
  label: string;
  plannedActivities: number;
  realizedPlannedActivities: number;
  completedActivities: number;
  confirmedRestDays: number;
  checkInDays: number;
  nutritionDays: number;
}

export interface PerformanceStrengthPoint {
  sessionId: string;
  date: LocalDate;
  label: string;
  volumeKg: number;
  bestSetLabel: string;
  estimatedOneRepMaxKg?: number;
}

export interface PerformanceStrengthExercise {
  exerciseId: string;
  name: string;
  sessionCount: number;
  points: PerformanceStrengthPoint[];
  latestEstimatedOneRepMaxKg?: number;
  oneRepMaxChangePercent?: number;
}

export interface PerformanceMacroWeek {
  weekStart: LocalDate;
  label: string;
  trackedDays: number;
  proteinGrams?: number;
  carbohydratesGrams?: number;
  fatGrams?: number;
}

export interface PerformanceHeatmapDay {
  date: LocalDate;
  label: string;
  score: number;
  detail: string;
}

export interface PerformanceAnalyticsSnapshot {
  base: TwelveWeekAnalytics;
  regularity: PerformanceRegularityWeek[];
  plannedActual: PlannedActualWeek[];
  strengthExercises: PerformanceStrengthExercise[];
  macroWeeks: PerformanceMacroWeek[];
  heatmap: PerformanceHeatmapDay[];
}

export interface PerformanceAnalyticsSource {
  base: TwelveWeekAnalytics;
  activities: readonly Activity[];
  checkIns: readonly DailyCheckIn[];
  checkOuts: readonly DailyCheckOut[];
  activityDecisions: readonly DailyActivityDecision[];
  foodEntries: readonly FoodEntry[];
  workoutSessions: readonly WorkoutSession[];
  workoutSessionExercises: readonly WorkoutSessionExercise[];
  strengthSets: readonly StrengthSet[];
  exerciseDefinitions: readonly ExerciseDefinition[];
  endurancePlanningSessions: readonly PlannedEnduranceSession[];
}

function inRange(date: LocalDate, from: LocalDate, to: LocalDate): boolean {
  return date >= from && date <= to;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function datesForWeek<T extends { date: LocalDate }>(
  values: readonly T[],
  weekStart: LocalDate,
  weekEnd: LocalDate,
): Set<LocalDate> {
  return new Set(
    values
      .filter(({ date }) => inRange(date, weekStart, weekEnd))
      .map(({ date }) => date),
  );
}

function buildRegularity(
  source: PerformanceAnalyticsSource,
): PerformanceRegularityWeek[] {
  return source.base.activity.map((week) => {
    const trackingDays = new Set([
      ...datesForWeek(source.checkIns, week.weekStart, week.weekEnd),
      ...datesForWeek(source.checkOuts, week.weekStart, week.weekEnd),
    ]).size;
    const nutritionDays = datesForWeek(
      source.foodEntries,
      week.weekStart,
      week.weekEnd,
    ).size;
    const confirmedRestDays = new Set(
      source.activityDecisions
        .filter(({ date, decision, confirmedAt }) => (
          inRange(date, week.weekStart, week.weekEnd)
          && decision === "rest"
          && Boolean(confirmedAt)
        ))
        .map(({ date }) => date),
    ).size;
    const activityAxisMet = week.sessionCount >= 2
      || (week.sessionCount >= 1 && confirmedRestDays >= 1);
    return {
      weekStart: week.weekStart,
      label: week.label,
      trackingDays,
      nutritionDays,
      completedActivities: week.sessionCount,
      confirmedRestDays,
      balanced:
        trackingDays >= 3
        && nutritionDays >= 3
        && activityAxisMet,
    };
  });
}

function plannedStrengthDate(session: WorkoutSession): LocalDate | undefined {
  if (!session.plannedAt && !session.plannedDate && !session.originalPlannedDate) {
    return undefined;
  }
  return session.plannedDate ?? session.originalPlannedDate ?? session.date;
}

function buildPlannedActual(
  source: PerformanceAnalyticsSource,
): PlannedActualWeek[] {
  return source.base.activity.map((week) => {
    const endurancePlans = source.endurancePlanningSessions.filter(
      ({ date }) => inRange(date, week.weekStart, week.weekEnd),
    );
    const strengthPlans = source.workoutSessions.flatMap((session) => {
      const date = plannedStrengthDate(session);
      return date && inRange(date, week.weekStart, week.weekEnd)
        ? [{ session, date }]
        : [];
    });
    const realizedEndurance = endurancePlans.filter(
      ({ completedActivityId }) => Boolean(completedActivityId),
    ).length;
    const realizedStrength = strengthPlans.filter(
      ({ session }) => session.status === "completed",
    ).length;
    const confirmedRestDays = new Set(
      source.activityDecisions
        .filter(({ date, decision, confirmedAt }) => (
          inRange(date, week.weekStart, week.weekEnd)
          && decision === "rest"
          && Boolean(confirmedAt)
        ))
        .map(({ date }) => date),
    ).size;

    return {
      weekStart: week.weekStart,
      label: week.label,
      plannedActivities: endurancePlans.length + strengthPlans.length,
      realizedPlannedActivities: realizedEndurance + realizedStrength,
      completedActivities: week.sessionCount,
      confirmedRestDays,
      checkInDays: datesForWeek(
        source.checkIns,
        week.weekStart,
        week.weekEnd,
      ).size,
      nutritionDays: datesForWeek(
        source.foodEntries,
        week.weekStart,
        week.weekEnd,
      ).size,
    };
  });
}

function buildStrengthExercises(
  source: PerformanceAnalyticsSource,
): PerformanceStrengthExercise[] {
  const completedSessions = new Map(
    source.workoutSessions
      .filter(({ date, status }) => (
        status === "completed"
        && inRange(date, source.base.from, source.base.to)
      ))
      .map((session) => [session.id, session]),
  );
  const definitions = new Map(
    source.exerciseDefinitions.map((definition) => [definition.id, definition]),
  );
  const setsByExercise = new Map<string, StrengthSet[]>();
  for (const set of source.strengthSets) {
    if (!set.isCompleted || set.type === "warmup") continue;
    const current = setsByExercise.get(set.sessionExerciseId) ?? [];
    current.push(set);
    setsByExercise.set(set.sessionExerciseId, current);
  }
  const pointsByExercise = new Map<string, PerformanceStrengthPoint[]>();

  for (const sessionExercise of source.workoutSessionExercises) {
    const session = completedSessions.get(sessionExercise.sessionId);
    const sets = setsByExercise.get(sessionExercise.id) ?? [];
    if (!session || sets.length === 0) continue;
    const volumeKg = sets.reduce(
      (total, set) => total + Math.max(0, set.weightKg) * Math.max(0, set.repetitions),
      0,
    );
    const bestSet = [...sets].sort((left, right) => (
      right.weightKg - left.weightKg
      || right.repetitions - left.repetitions
    ))[0]!;
    const estimatedOneRepMaxKg = sessionExercise.trackingModeSnapshot === "loadRepetitions"
      || (
        sessionExercise.trackingModeSnapshot === undefined
        && sessionExercise.loadUnitSnapshot === "kg"
      )
      ? sets.reduce<number | undefined>((best, set) => {
          const estimate = calculateEstimatedOneRepMax(
            set.weightKg,
            set.repetitions,
          );
          if (estimate === undefined) return best;
          return best === undefined ? estimate : Math.max(best, estimate);
        }, undefined)
      : undefined;
    const point: PerformanceStrengthPoint = {
      sessionId: session.id,
      date: session.date,
      label: format(parseISO(session.date), "dd/MM"),
      volumeKg: round(volumeKg, 1),
      bestSetLabel: `${bestSet.weightKg.toLocaleString("fr-FR")} kg × ${bestSet.repetitions}`,
      ...(estimatedOneRepMaxKg === undefined
        ? {}
        : { estimatedOneRepMaxKg }),
    };
    const current = pointsByExercise.get(sessionExercise.exerciseDefinitionId) ?? [];
    current.push(point);
    pointsByExercise.set(sessionExercise.exerciseDefinitionId, current);
  }

  return [...pointsByExercise.entries()]
    .map(([exerciseId, unsortedPoints]) => {
      const points = [...unsortedPoints].sort((left, right) => (
        left.date.localeCompare(right.date)
      ));
      const oneRepMaxPoints = points.filter(
        (point) => point.estimatedOneRepMaxKg !== undefined,
      );
      const first = oneRepMaxPoints[0]?.estimatedOneRepMaxKg;
      const latest = oneRepMaxPoints.at(-1)?.estimatedOneRepMaxKg;
      return {
        exerciseId,
        name: definitions.get(exerciseId)?.name ?? "Exercice",
        sessionCount: points.length,
        points,
        ...(latest === undefined ? {} : { latestEstimatedOneRepMaxKg: latest }),
        ...(first === undefined || latest === undefined || first === 0
          ? {}
          : { oneRepMaxChangePercent: round((latest - first) / first * 100, 1) }),
      };
    })
    .sort((left, right) => (
      right.sessionCount - left.sessionCount
      || left.name.localeCompare(right.name)
    ));
}

function buildMacroWeeks(
  source: PerformanceAnalyticsSource,
): PerformanceMacroWeek[] {
  return source.base.nutrition.map((week) => {
    const days = new Map<LocalDate, FoodEntry[]>();
    for (const entry of source.foodEntries) {
      if (!inRange(entry.date, week.weekStart, week.weekEnd)) continue;
      const current = days.get(entry.date) ?? [];
      current.push(entry);
      days.set(entry.date, current);
    }
    const values = [...days.values()].map(calculateDailyNutrition);
    if (values.length === 0) {
      return {
        weekStart: week.weekStart,
        label: week.label,
        trackedDays: 0,
      };
    }
    const average = (selector: (value: (typeof values)[number]) => number) => (
      round(values.reduce((total, value) => total + selector(value), 0) / values.length, 1)
    );
    return {
      weekStart: week.weekStart,
      label: week.label,
      trackedDays: values.length,
      proteinGrams: average((value) => value.proteinGrams),
      carbohydratesGrams: average((value) => value.carbohydratesGrams),
      fatGrams: average((value) => value.fatGrams),
    };
  });
}

function buildHeatmap(
  source: PerformanceAnalyticsSource,
): PerformanceHeatmapDay[] {
  const trackingDates = new Set([
    ...source.checkIns.map(({ date }) => date),
    ...source.checkOuts.map(({ date }) => date),
  ]);
  const nutritionDates = new Set(source.foodEntries.map(({ date }) => date));
  const sportDates = new Set(source.activities.map(({ date }) => date));
  const restDates = new Set(
    source.activityDecisions
      .filter(({ decision, confirmedAt }) => decision === "rest" && Boolean(confirmedAt))
      .map(({ date }) => date),
  );
  const start = parseISO(source.base.from);
  const end = parseISO(source.base.to);
  const days: PerformanceHeatmapDay[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = format(cursor, "yyyy-MM-dd");
    const tracking = trackingDates.has(date);
    const nutrition = nutritionDates.has(date);
    const movement = sportDates.has(date) || restDates.has(date);
    const labels = [
      tracking ? "suivi quotidien" : undefined,
      nutrition ? "nutrition" : undefined,
      sportDates.has(date) ? "activité" : restDates.has(date) ? "repos confirmé" : undefined,
    ].filter((value): value is string => Boolean(value));
    days.push({
      date,
      label: new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
      }).format(cursor),
      score: Number(tracking) + Number(nutrition) + Number(movement),
      detail: labels.length > 0 ? labels.join(", ") : "aucune donnée renseignée",
    });
  }
  return days;
}

export function buildPerformanceAnalytics(
  source: PerformanceAnalyticsSource,
): PerformanceAnalyticsSnapshot {
  return {
    base: source.base,
    regularity: buildRegularity(source),
    plannedActual: buildPlannedActual(source),
    strengthExercises: buildStrengthExercises(source),
    macroWeeks: buildMacroWeeks(source),
    heatmap: buildHeatmap(source),
  };
}

export async function loadPerformanceAnalytics(
  referenceDate: LocalDate,
  profile: UserProfile,
): Promise<PerformanceAnalyticsSnapshot> {
  const [
    base,
    activities,
    checkIns,
    checkOuts,
    activityDecisions,
    foodEntries,
    workoutSessions,
    workoutSessionExercises,
    strengthSets,
    exerciseDefinitions,
    endurancePlanningSessions,
  ] = await Promise.all([
    loadTwelveWeekAnalytics(referenceDate, profile),
    appDatabase.activities.toArray(),
    appDatabase.dailyCheckIns.toArray(),
    appDatabase.dailyCheckOuts.toArray(),
    appDatabase.dailyActivityDecisions.toArray(),
    appDatabase.foodEntries.toArray(),
    appDatabase.workoutSessions.toArray(),
    appDatabase.workoutSessionExercises.toArray(),
    appDatabase.strengthSets.toArray(),
    appDatabase.exerciseDefinitions.toArray(),
    appDatabase.endurancePlanningSessions.toArray(),
  ]);
  const from = base.from;
  const to = base.to;
  return buildPerformanceAnalytics({
    base,
    activities: activities.filter(({ date }) => inRange(date, from, to)),
    checkIns: checkIns.filter(({ date }) => inRange(date, from, to)),
    checkOuts: checkOuts.filter(({ date }) => inRange(date, from, to)),
    activityDecisions: activityDecisions.filter(
      ({ date }) => inRange(date, from, to),
    ),
    foodEntries: foodEntries.filter(({ date }) => inRange(date, from, to)),
    workoutSessions,
    workoutSessionExercises,
    strengthSets,
    exerciseDefinitions,
    endurancePlanningSessions: endurancePlanningSessions.filter(
      ({ date }) => inRange(date, from, to),
    ),
  });
}
