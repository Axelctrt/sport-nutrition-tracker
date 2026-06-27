import { liveQuery } from "dexie";

import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface ConsistencyStreakSnapshot {
  activeDates: string[];
  currentStreak: number;
  bestStreak: number;
  activeDaysLast7: number;
  activeDaysLast30: number;
  latestActiveDate?: string;
}

export type ConsistencyStreakListener = (
  snapshot: ConsistencyStreakSnapshot,
) => void;

export type ConsistencyStreakErrorListener = (error: unknown) => void;

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | undefined {
  if (!DATE_KEY_PATTERN.test(value)) return undefined;

  const [yearText, monthText, dayText] = value.split("-");
  if (!yearText || !monthText || !dayText) return undefined;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}

function addDays(value: Date, amount: number): Date {
  const result = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
  result.setDate(result.getDate() + amount);
  return result;
}

function differenceInCalendarDays(left: Date, right: Date): number {
  const leftUtc = Date.UTC(
    left.getFullYear(),
    left.getMonth(),
    left.getDate(),
  );
  const rightUtc = Date.UTC(
    right.getFullYear(),
    right.getMonth(),
    right.getDate(),
  );

  return Math.round((leftUtc - rightUtc) / 86_400_000);
}

export function buildConsistencyStreakSnapshot(
  dateCandidates: readonly string[],
  today: Date = new Date(),
): ConsistencyStreakSnapshot {
  const activeDates = [
    ...new Set(
      dateCandidates.filter((candidate) => parseDateKey(candidate) !== undefined),
    ),
  ].sort();

  let bestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | undefined;

  for (const dateKey of activeDates) {
    const currentDate = parseDateKey(dateKey);
    if (!currentDate) continue;

    runningStreak =
      previousDate &&
      differenceInCalendarDays(currentDate, previousDate) === 1
        ? runningStreak + 1
        : 1;

    bestStreak = Math.max(bestStreak, runningStreak);
    previousDate = currentDate;
  }

  const activeDateSet = new Set(activeDates);
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(addDays(today, -1));
  const latestActiveDate = activeDates.at(-1);

  let currentStreak = 0;

  if (
    latestActiveDate === todayKey ||
    latestActiveDate === yesterdayKey
  ) {
    let cursor = parseDateKey(latestActiveDate);

    while (cursor && activeDateSet.has(toDateKey(cursor))) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const last7Start = toDateKey(addDays(today, -6));
  const last30Start = toDateKey(addDays(today, -29));

  const snapshot: ConsistencyStreakSnapshot = {
    activeDates,
    currentStreak,
    bestStreak,
    activeDaysLast7: activeDates.filter(
      (dateKey) => dateKey >= last7Start && dateKey <= todayKey,
    ).length,
    activeDaysLast30: activeDates.filter(
      (dateKey) => dateKey >= last30Start && dateKey <= todayKey,
    ).length,
  };

  return latestActiveDate
    ? { ...snapshot, latestActiveDate }
    : snapshot;
}

export async function loadConsistencyStreakSnapshot(
  database: AppDatabase = appDatabase,
  today: Date = new Date(),
): Promise<ConsistencyStreakSnapshot> {
  const [activities, workoutSessions, weights] = await Promise.all([
    database.activities.toArray(),
    database.workoutSessions.toArray(),
    database.weights.toArray(),
  ]);

  const completedStrengthSessionDates = workoutSessions
    .filter((session) => session.status === "completed")
    .map((session) => session.date);

  return buildConsistencyStreakSnapshot(
    [
      ...activities.map((activity) => activity.date),
      ...completedStrengthSessionDates,
      ...weights.map((weight) => weight.date),
    ],
    today,
  );
}

export function observeConsistencyStreak(
  onSnapshot: ConsistencyStreakListener,
  onError: ConsistencyStreakErrorListener = () => undefined,
): () => void {
  const subscription = liveQuery(() =>
    loadConsistencyStreakSnapshot(),
  ).subscribe({
    next: onSnapshot,
    error: onError,
  });

  return () => subscription.unsubscribe();
}
