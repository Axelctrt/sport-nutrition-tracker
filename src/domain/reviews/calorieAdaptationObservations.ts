import { addDays, parseISO } from 'date-fns';
import { calculateDailyNutrition } from '@/domain/calculations/nutrition';
import type { Activity } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import type { DailyCheckIn, DailyCheckOut } from '@/domain/models/dailyCoaching';
import type { DailyJournalStatus, FoodEntry } from '@/domain/models/food';
import type { WorkoutSession } from '@/domain/models/strength';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeightEntry } from '@/domain/models/weight';
import type { CalorieAdaptationObservation } from '@/domain/reviews/calorieAdaptationAssessment';
import { toLocalDate } from '@/shared/utils/dates';

export interface BuildCalorieAdaptationObservationsInput {
  analysisStart: LocalDate;
  analysisEnd: LocalDate;
  fallbackExpectedSteps: number;
  weights: readonly WeightEntry[];
  foodEntries: readonly FoodEntry[];
  dailyTargets: readonly DailyTarget[];
  journalStatuses: readonly DailyJournalStatus[];
  dailySteps: readonly DailySteps[];
  checkIns: readonly DailyCheckIn[];
  checkOuts: readonly DailyCheckOut[];
  activities: readonly Activity[];
  workoutSessions: readonly WorkoutSession[];
}

function indexByDate<T extends { date: LocalDate }>(entries: readonly T[]): Map<LocalDate, T> {
  return new Map(entries.map((entry) => [entry.date, entry]));
}

function entriesByDate<T extends { date: LocalDate }>(
  entries: readonly T[],
): Map<LocalDate, T[]> {
  const grouped = new Map<LocalDate, T[]>();
  for (const entry of entries) {
    grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
  }
  return grouped;
}

function datesBetween(from: LocalDate, to: LocalDate): LocalDate[] {
  const dates: LocalDate[] = [];
  for (
    let current = parseISO(from);
    current <= parseISO(to);
    current = addDays(current, 1)
  ) {
    dates.push(toLocalDate(current));
  }
  return dates;
}

export function buildCalorieAdaptationObservations(
  input: BuildCalorieAdaptationObservationsInput,
): CalorieAdaptationObservation[] {
  const weights = indexByDate(input.weights);
  const foodEntries = entriesByDate(input.foodEntries);
  const targets = indexByDate(input.dailyTargets);
  const statuses = indexByDate(input.journalStatuses);
  const steps = indexByDate(input.dailySteps);
  const checkIns = indexByDate(input.checkIns);
  const checkOuts = indexByDate(input.checkOuts);
  const completedStrengthSessions = entriesByDate(
    input.workoutSessions.filter(({ status }) => status === 'completed'),
  );
  const standaloneStrengthActivities = entriesByDate(
    input.activities.filter(({ type }) => type === 'strengthTraining'),
  );

  return datesBetween(input.analysisStart, input.analysisEnd).map((date) => {
    const checkIn = checkIns.get(date);
    const checkOut = checkOuts.get(date);
    const target = targets.get(date);
    const dayEntries = foodEntries.get(date) ?? [];
    const consumed = dayEntries.length > 0
      ? calculateDailyNutrition(dayEntries)
      : undefined;
    const journalComplete = statuses.get(date)?.isComplete
      ?? checkOut?.foodJournalComplete
      ?? false;
    const completedSessionCount = completedStrengthSessions.get(date)?.length ?? 0;
    const completedSessionActivityIds = new Set(
      (completedStrengthSessions.get(date) ?? [])
        .map(({ completedActivityId }) => completedActivityId)
        .filter((id): id is string => Boolean(id)),
    );
    const standaloneStrengthCount = (standaloneStrengthActivities.get(date) ?? [])
      .filter(({ id }) => !completedSessionActivityIds.has(id))
      .length;

    return {
      date,
      ...(weights.get(date) ? { weightKg: weights.get(date)!.weightKg } : {}),
      ...(checkIn?.waistCm === undefined ? {} : { waistCm: checkIn.waistCm }),
      ...(consumed ? { consumedCaloriesKcal: consumed.caloriesKcal } : {}),
      ...(target ? { targetCaloriesKcal: target.targetCaloriesKcal } : {}),
      ...(consumed && target
        ? { proteinTargetMet: consumed.proteinGrams >= target.macros.proteinGrams }
        : {}),
      journalComplete,
      expectedSteps: target?.stepBasis?.steps ?? input.fallbackExpectedSteps,
      ...(steps.get(date) ? { actualSteps: steps.get(date)!.totalSteps } : {}),
      ...(checkOut?.hunger ? { hunger: checkOut.hunger } : {}),
      ...(checkOut?.energy ? { energy: checkOut.energy } : {}),
      ...(checkIn?.readiness ? { readiness: checkIn.readiness } : {}),
      ...(checkIn?.sleepQuality ? { sleepQuality: checkIn.sleepQuality } : {}),
      hasTemporaryContext:
        (checkIn?.contextFlags.length ?? 0) > 0
        || (checkOut?.contextFlags.length ?? 0) > 0,
      strengthSessionCount: completedSessionCount + standaloneStrengthCount,
    };
  });
}
