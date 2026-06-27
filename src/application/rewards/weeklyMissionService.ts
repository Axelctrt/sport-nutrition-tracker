import { liveQuery } from "dexie";

import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type WeeklyMissionId =
  | "activeDays"
  | "enduranceActivities"
  | "strengthSessions"
  | "nutritionDays"
  | "weighInDays";

export interface WeeklyMissionProgress {
  id: WeeklyMissionId;
  title: string;
  description: string;
  current: number;
  target: number;
  remaining: number;
  percentage: number;
  completed: boolean;
}

export interface WeeklyMissionSnapshot {
  weekStart: string;
  weekEnd: string;
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  missions: WeeklyMissionProgress[];
}

export interface WeeklyMissionInput {
  activityDates: readonly string[];
  enduranceActivityDates: readonly string[];
  completedStrengthSessionDates: readonly string[];
  completedNutritionDates: readonly string[];
  weightDates: readonly string[];
}

export type WeeklyMissionListener = (snapshot: WeeklyMissionSnapshot) => void;

export type WeeklyMissionErrorListener = (error: unknown) => void;

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

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function startOfWeek(value: Date): Date {
  const normalized = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
  const mondayOffset = (normalized.getDay() + 6) % 7;

  return addDays(normalized, -mondayOffset);
}

function uniqueDatesInRange(
  candidates: readonly string[],
  start: string,
  end: string,
): string[] {
  return [
    ...new Set(
      candidates.filter(
        (candidate) =>
          parseDateKey(candidate) !== undefined &&
          candidate >= start &&
          candidate <= end,
      ),
    ),
  ].sort();
}

function createMission(
  id: WeeklyMissionId,
  title: string,
  description: string,
  current: number,
  target: number,
): WeeklyMissionProgress {
  const cappedCurrent = Math.min(current, target);

  return {
    id,
    title,
    description,
    current,
    target,
    remaining: Math.max(target - current, 0),
    percentage: Math.round((cappedCurrent / target) * 100),
    completed: current >= target,
  };
}

export function buildWeeklyMissionSnapshot(
  input: WeeklyMissionInput,
  today: Date = new Date(),
): WeeklyMissionSnapshot {
  const weekStartDate = startOfWeek(today);
  const weekEndDate = addDays(weekStartDate, 6);
  const weekStart = toDateKey(weekStartDate);
  const weekEnd = toDateKey(weekEndDate);

  const activityDays = uniqueDatesInRange(
    [...input.activityDates, ...input.completedStrengthSessionDates],
    weekStart,
    weekEnd,
  );
  const enduranceActivities = input.enduranceActivityDates.filter(
    (date) =>
      parseDateKey(date) !== undefined && date >= weekStart && date <= weekEnd,
  );
  const strengthSessions = input.completedStrengthSessionDates.filter(
    (date) =>
      parseDateKey(date) !== undefined && date >= weekStart && date <= weekEnd,
  );
  const nutritionDays = uniqueDatesInRange(
    input.completedNutritionDates,
    weekStart,
    weekEnd,
  );
  const weighInDays = uniqueDatesInRange(input.weightDates, weekStart, weekEnd);

  const missions = [
    createMission(
      "activeDays",
      "Bouger 3 jours",
      "Enregistre une activité ou termine une séance pendant 3 journées distinctes.",
      activityDays.length,
      3,
    ),
    createMission(
      "enduranceActivities",
      "Faire 2 séances d’endurance",
      "Course, natation ou vélo : chaque activité enregistrée compte.",
      enduranceActivities.length,
      2,
    ),
    createMission(
      "strengthSessions",
      "Terminer 2 séances de musculation",
      "Seules les séances réellement terminées sont prises en compte.",
      strengthSessions.length,
      2,
    ),
    createMission(
      "nutritionDays",
      "Compléter 5 journées nutritionnelles",
      "Marque le journal alimentaire comme terminé pendant 5 jours.",
      nutritionDays.length,
      5,
    ),
    createMission(
      "weighInDays",
      "Enregistrer une pesée",
      "Une seule journée de pesée suffit pour suivre la tendance.",
      weighInDays.length,
      1,
    ),
  ];

  const completedCount = missions.filter((mission) => mission.completed).length;

  return {
    weekStart,
    weekEnd,
    completedCount,
    totalCount: missions.length,
    completionPercentage: Math.round((completedCount / missions.length) * 100),
    missions,
  };
}

export async function loadWeeklyMissionSnapshot(
  database: AppDatabase = appDatabase,
  today: Date = new Date(),
): Promise<WeeklyMissionSnapshot> {
  const [activities, workoutSessions, journalStatuses, weights] =
    await Promise.all([
      database.activities.toArray(),
      database.workoutSessions.toArray(),
      database.dailyJournalStatuses.toArray(),
      database.weights.toArray(),
    ]);

  const completedStrengthSessionDates = workoutSessions
    .filter((session) => session.status === "completed")
    .map((session) => session.date);

  return buildWeeklyMissionSnapshot(
    {
      activityDates: activities.map((activity) => activity.date),
      enduranceActivityDates: activities
        .filter((activity) =>
          ["running", "swimming", "cycling"].includes(activity.type),
        )
        .map((activity) => activity.date),
      completedStrengthSessionDates,
      completedNutritionDates: journalStatuses
        .filter((status) => status.isComplete)
        .map((status) => status.date),
      weightDates: weights.map((weight) => weight.date),
    },
    today,
  );
}

export function observeWeeklyMissions(
  onSnapshot: WeeklyMissionListener,
  onError: WeeklyMissionErrorListener = () => undefined,
): () => void {
  const subscription = liveQuery(() => loadWeeklyMissionSnapshot()).subscribe({
    next: onSnapshot,
    error: onError,
  });

  return () => subscription.unsubscribe();
}
