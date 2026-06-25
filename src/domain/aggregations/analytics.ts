import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Activity, ActivityType, RunningActivity, SwimmingActivity } from '@/domain/models/activity';
import type {
  ActivityTimeBreakdown,
  ActivityWeekSummary,
  CalendarWeek,
  HistoryDaySummary,
  NutritionWeekSummary,
  RunningWeekSummary,
  SwimmingWeekSummary,
  TwelveWeekAnalytics,
  WeightMovingAveragePoint,
  WeightWeekSummary,
} from '@/domain/models/analytics';
import type { LocalDate } from '@/domain/models/common';
import type { DailyJournalStatus, FoodEntry } from '@/domain/models/food';
import type { UserProfile } from '@/domain/models/profile';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeightEntry } from '@/domain/models/weight';
import { calculateDailyNutrition } from '@/domain/calculations/nutrition';
import { getEffectiveActivityCalories } from '@/domain/calculations/activityCalories';
import { toLocalDate } from '@/shared/utils/dates';

const WEEK_OPTIONS = { weekStartsOn: 1 as const };
const CALORIE_ADHERENCE_TOLERANCE = 0.1;

export interface AnalyticsSourceData {
  profile: UserProfile;
  activities: readonly Activity[];
  weights: readonly WeightEntry[];
  steps: readonly DailySteps[];
  foodEntries: readonly FoodEntry[];
  dailyTargets: readonly DailyTarget[];
  journalStatuses: readonly DailyJournalStatus[];
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function dateInRange(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
  return date >= start && date <= end;
}

function createCalendarWeek(weekStartDate: Date): CalendarWeek {
  const weekEndDate = endOfWeek(weekStartDate, WEEK_OPTIONS);
  return {
    weekStart: toLocalDate(weekStartDate),
    weekEnd: toLocalDate(weekEndDate),
    label: format(weekStartDate, "d MMM", { locale: fr }),
  };
}

export function createTwelveWeekWindow(referenceDate: LocalDate): CalendarWeek[] {
  const currentWeekStart = startOfWeek(parseISO(referenceDate), WEEK_OPTIONS);
  return Array.from({ length: 12 }, (_, index) => (
    createCalendarWeek(subWeeks(currentWeekStart, 11 - index))
  ));
}

function activitiesForWeek<T extends Activity>(
  activities: readonly Activity[],
  week: CalendarWeek,
  predicate: (activity: Activity) => activity is T,
): T[] {
  return activities.filter((activity): activity is T => (
    predicate(activity) && dateInRange(activity.date, week.weekStart, week.weekEnd)
  ));
}

function isRunning(activity: Activity): activity is RunningActivity {
  return activity.type === 'running';
}

function isSwimming(activity: Activity): activity is SwimmingActivity {
  return activity.type === 'swimming';
}

export function aggregateRunningWeeks(
  activities: readonly Activity[],
  weeks: readonly CalendarWeek[],
): RunningWeekSummary[] {
  return weeks.map((week) => {
    const sessions = activitiesForWeek(activities, week, isRunning);
    const distanceKm = sessions.reduce((total, session) => total + session.distanceKm, 0);
    const durationMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);

    return {
      ...week,
      distanceKm: round(distanceKm, 2),
      durationMinutes: round(durationMinutes, 1),
      ...(distanceKm > 0
        ? { weightedPaceSecondsPerKm: round((durationMinutes * 60) / distanceKm, 1) }
        : {}),
      sessionCount: sessions.length,
      longestDistanceKm: round(Math.max(0, ...sessions.map((session) => session.distanceKm)), 2),
    };
  });
}

export function aggregateSwimmingWeeks(
  activities: readonly Activity[],
  weeks: readonly CalendarWeek[],
): SwimmingWeekSummary[] {
  return weeks.map((week) => {
    const sessions = activitiesForWeek(activities, week, isSwimming);
    const distanceMeters = sessions.reduce((total, session) => total + session.distanceMeters, 0);
    const durationMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);

    return {
      ...week,
      distanceMeters: round(distanceMeters, 0),
      durationMinutes: round(durationMinutes, 1),
      ...(distanceMeters > 0
        ? { weightedPaceSecondsPer100m: round((durationMinutes * 60) / (distanceMeters / 100), 1) }
        : {}),
      sessionCount: sessions.length,
      longestDistanceMeters: round(Math.max(0, ...sessions.map((session) => session.distanceMeters)), 0),
    };
  });
}

function groupFoodEntriesByDate(entries: readonly FoodEntry[]): Map<LocalDate, FoodEntry[]> {
  const grouped = new Map<LocalDate, FoodEntry[]>();
  for (const entry of entries) {
    const current = grouped.get(entry.date) ?? [];
    current.push(entry);
    grouped.set(entry.date, current);
  }
  return grouped;
}

export function aggregateNutritionWeeks(
  entries: readonly FoodEntry[],
  targets: readonly DailyTarget[],
  statuses: readonly DailyJournalStatus[],
  weeks: readonly CalendarWeek[],
): NutritionWeekSummary[] {
  const entriesByDate = groupFoodEntriesByDate(entries);
  const targetsByDate = new Map(targets.map((target) => [target.date, target]));
  const statusByDate = new Map(statuses.map((status) => [status.date, status]));

  return weeks.map((week) => {
    const trackedDates = [...entriesByDate.keys()].filter((date) => (
      dateInRange(date, week.weekStart, week.weekEnd) && targetsByDate.has(date)
    ));
    const dailyRows = trackedDates.map((date) => {
      const consumed = calculateDailyNutrition(entriesByDate.get(date) ?? []);
      const target = targetsByDate.get(date);
      if (!target) return undefined;
      return { date, consumed, target };
    }).filter((row): row is NonNullable<typeof row> => row !== undefined);

    const averageConsumedCalories = average(dailyRows.map((row) => row.consumed.caloriesKcal));
    const averageTargetCalories = average(dailyRows.map((row) => row.target.targetCaloriesKcal));
    const averageConsumedProtein = average(dailyRows.map((row) => row.consumed.proteinGrams));
    const averageTargetProtein = average(dailyRows.map((row) => row.target.macros.proteinGrams));
    const calorieAdherentDays = dailyRows.filter((row) => (
      Math.abs(row.consumed.caloriesKcal - row.target.targetCaloriesKcal)
      <= row.target.targetCaloriesKcal * CALORIE_ADHERENCE_TOLERANCE
    )).length;
    const proteinAdherentDays = dailyRows.filter((row) => (
      row.consumed.proteinGrams >= row.target.macros.proteinGrams
    )).length;

    return {
      ...week,
      trackedDayCount: dailyRows.length,
      completedDayCount: trackedDates.filter((date) => statusByDate.get(date)?.isComplete).length,
      ...(averageConsumedCalories === undefined ? {} : { averageConsumedCaloriesKcal: round(averageConsumedCalories, 0) }),
      ...(averageTargetCalories === undefined ? {} : { averageTargetCaloriesKcal: round(averageTargetCalories, 0) }),
      ...(averageConsumedProtein === undefined ? {} : { averageConsumedProteinGrams: round(averageConsumedProtein, 1) }),
      ...(averageTargetProtein === undefined ? {} : { averageTargetProteinGrams: round(averageTargetProtein, 1) }),
      ...(dailyRows.length === 0 ? {} : {
        calorieAdherencePercent: round((calorieAdherentDays / dailyRows.length) * 100, 0),
        proteinAdherencePercent: round((proteinAdherentDays / dailyRows.length) * 100, 0),
      }),
    };
  });
}

function aggregateBreakdown(activities: readonly Activity[]): ActivityTimeBreakdown[] {
  const totals = new Map<ActivityType, { durationMinutes: number; sessionCount: number }>();
  for (const activity of activities) {
    const current = totals.get(activity.type) ?? { durationMinutes: 0, sessionCount: 0 };
    totals.set(activity.type, {
      durationMinutes: current.durationMinutes + activity.durationMinutes,
      sessionCount: current.sessionCount + 1,
    });
  }

  return [...totals.entries()]
    .map(([type, value]) => ({
      type,
      durationMinutes: round(value.durationMinutes, 1),
      sessionCount: value.sessionCount,
    }))
    .sort((left, right) => right.durationMinutes - left.durationMinutes);
}

export function aggregateActivityWeeks(
  activities: readonly Activity[],
  steps: readonly DailySteps[],
  weeks: readonly CalendarWeek[],
): ActivityWeekSummary[] {
  return weeks.map((week) => {
    const weekActivities = activities.filter((activity) => dateInRange(activity.date, week.weekStart, week.weekEnd));
    const weekSteps = steps.filter((entry) => dateInRange(entry.date, week.weekStart, week.weekEnd));
    return {
      ...week,
      ...(weekSteps.length === 0 ? {} : {
        averageSteps: round(average(weekSteps.map((entry) => entry.totalSteps)) ?? 0, 0),
      }),
      recordedStepDays: weekSteps.length,
      totalSportMinutes: round(weekActivities.reduce((total, activity) => total + activity.durationMinutes, 0), 1),
      sessionCount: weekActivities.length,
      breakdown: aggregateBreakdown(weekActivities),
    };
  });
}

export function calculateTargetWeight(
  profile: UserProfile,
  date: LocalDate,
): number {
  const profileDate = profile.createdAt.slice(0, 10);
  const elapsedDays = Math.max(0, differenceInCalendarDays(parseISO(date), parseISO(profileDate)));
  const elapsedWeeks = elapsedDays / 7;
  const weeklyRate = profile.targetWeeklyWeightChangePercent / 100;
  return round(profile.initialWeightKg * ((1 + weeklyRate) ** elapsedWeeks), 2);
}

export function calculateWeightMovingAverage(
  weights: readonly WeightEntry[],
  profile: UserProfile,
): WeightMovingAveragePoint[] {
  const ordered = [...weights].sort((left, right) => left.date.localeCompare(right.date));
  return ordered.map((entry) => {
    const windowStart = toLocalDate(addDays(parseISO(entry.date), -6));
    const samples = ordered.filter((candidate) => (
      candidate.date >= windowStart && candidate.date <= entry.date
    ));
    return {
      date: entry.date,
      weightKg: entry.weightKg,
      movingAverageKg: round(average(samples.map((sample) => sample.weightKg)) ?? entry.weightKg, 2),
      targetWeightKg: calculateTargetWeight(profile, entry.date),
      sampleCount: samples.length,
    };
  });
}

export function aggregateWeightWeeks(
  weights: readonly WeightEntry[],
  weeks: readonly CalendarWeek[],
  profile: UserProfile,
): WeightWeekSummary[] {
  return weeks.map((week) => {
    const samples = weights.filter((entry) => dateInRange(entry.date, week.weekStart, week.weekEnd));
    const weeklyAverage = average(samples.map((sample) => sample.weightKg));
    return {
      ...week,
      ...(weeklyAverage === undefined ? {} : { averageWeightKg: round(weeklyAverage, 2) }),
      weighInCount: samples.length,
      targetWeightKg: calculateTargetWeight(profile, week.weekEnd),
    };
  });
}

export function buildTwelveWeekAnalytics(
  referenceDate: LocalDate,
  source: AnalyticsSourceData,
): TwelveWeekAnalytics {
  const weeks = createTwelveWeekWindow(referenceDate);
  const from = weeks[0]?.weekStart ?? referenceDate;
  const to = weeks.at(-1)?.weekEnd ?? referenceDate;
  const activities = source.activities.filter((activity) => dateInRange(activity.date, from, to));

  return {
    from,
    to,
    running: aggregateRunningWeeks(activities, weeks),
    swimming: aggregateSwimmingWeeks(activities, weeks),
    nutrition: aggregateNutritionWeeks(source.foodEntries, source.dailyTargets, source.journalStatuses, weeks),
    activity: aggregateActivityWeeks(activities, source.steps, weeks),
    weight: {
      movingAverage: calculateWeightMovingAverage(source.weights, source.profile)
        .filter((point) => dateInRange(point.date, from, to)),
      weekly: aggregateWeightWeeks(source.weights, weeks, source.profile),
    },
    activityBreakdown: aggregateBreakdown(activities),
  };
}

export interface HistorySourceData {
  activities: readonly Activity[];
  weights: readonly WeightEntry[];
  steps: readonly DailySteps[];
  foodEntries: readonly FoodEntry[];
  dailyTargets: readonly DailyTarget[];
  journalStatuses: readonly DailyJournalStatus[];
}

export function buildHistoryDays(source: HistorySourceData): HistoryDaySummary[] {
  const dates = new Set<LocalDate>();
  [source.activities, source.weights, source.steps, source.foodEntries, source.dailyTargets, source.journalStatuses]
    .flat()
    .forEach((entity) => dates.add(entity.date));

  const entriesByDate = groupFoodEntriesByDate(source.foodEntries);
  const weightsByDate = new Map(source.weights.map((entry) => [entry.date, entry]));
  const stepsByDate = new Map(source.steps.map((entry) => [entry.date, entry]));
  const targetsByDate = new Map(source.dailyTargets.map((entry) => [entry.date, entry]));
  const statusesByDate = new Map(source.journalStatuses.map((entry) => [entry.date, entry]));

  return [...dates]
    .sort((left, right) => right.localeCompare(left))
    .map((date) => {
      const dayActivities = source.activities.filter((activity) => activity.date === date);
      const dayEntries = entriesByDate.get(date) ?? [];
      const consumed = dayEntries.length > 0 ? calculateDailyNutrition(dayEntries) : undefined;
      const target = targetsByDate.get(date);
      const weight = weightsByDate.get(date);
      const step = stepsByDate.get(date);
      return {
        date,
        ...(weight === undefined ? {} : { weightKg: weight.weightKg }),
        ...(step === undefined ? {} : { totalSteps: step.totalSteps }),
        activityCount: dayActivities.length,
        sportMinutes: round(dayActivities.reduce((total, activity) => total + activity.durationMinutes, 0), 1),
        estimatedActivityCaloriesKcal: round(dayActivities.reduce((total, activity) => total + getEffectiveActivityCalories(activity), 0), 0),
        ...(consumed === undefined ? {} : {
          consumedCaloriesKcal: round(consumed.caloriesKcal, 0),
          consumedProteinGrams: round(consumed.proteinGrams, 1),
        }),
        ...(target === undefined ? {} : {
          targetCaloriesKcal: target.targetCaloriesKcal,
          targetProteinGrams: target.macros.proteinGrams,
        }),
        journalComplete: statusesByDate.get(date)?.isComplete ?? false,
      };
    });
}
