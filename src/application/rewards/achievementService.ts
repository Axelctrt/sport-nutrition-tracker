import {
  achievementCatalog,
  readAchievementState,
  unlockAchievements,
  type AchievementDefinition,
  type AchievementId,
  type AchievementMetricKey,
  type EarnedAchievement,
} from "@/domain/rewards/achievements";
import type { Activity } from "@/domain/models/activity";
import type { StrengthSet, WorkoutSessionExercise } from "@/domain/models/strength";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

export type AchievementMetrics = Partial<Record<AchievementMetricKey, number>>;

export interface AchievementProgress {
  achievement: AchievementDefinition;
  current: number;
  target: number;
  percentage: number;
  remaining: number;
  earned: boolean;
  earnedAt?: string;
}

export interface AchievementSnapshot {
  metrics: AchievementMetrics;
  achievements: AchievementProgress[];
  newlyEarnedAchievements: AchievementProgress[];
  earnedCount: number;
  totalCount: number;
}

function metricValue(
  metrics: AchievementMetrics,
  metric: AchievementMetricKey,
): number {
  return metrics[metric] ?? 0;
}

function roundDisplayValue(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function buildAchievementSnapshot(
  metrics: AchievementMetrics,
  previouslyEarned: readonly EarnedAchievement[] = [],
  newlyEarnedAt: string = new Date().toISOString(),
): AchievementSnapshot {
  const earnedById = new Map(
    previouslyEarned.map((achievement) => [achievement.id, achievement]),
  );

  const achievements = achievementCatalog.map<AchievementProgress>(
    (achievement) => {
      const current = metricValue(metrics, achievement.metric);
      const storedAchievement = earnedById.get(achievement.id);
      const qualifiesNow = current >= achievement.target;
      const earned = storedAchievement !== undefined || qualifiesNow;
      const percentage = Math.min(
        100,
        Math.round((current / achievement.target) * 100),
      );

      return {
        achievement,
        current,
        target: achievement.target,
        percentage,
        remaining: roundDisplayValue(Math.max(0, achievement.target - current)),
        earned,
        ...(storedAchievement
          ? { earnedAt: storedAchievement.earnedAt }
          : qualifiesNow
            ? { earnedAt: newlyEarnedAt }
            : {}),
      };
    },
  );
  const newlyEarnedAchievements = achievements.filter(
    (progress) =>
      progress.current >= progress.target &&
      !earnedById.has(progress.achievement.id as AchievementId),
  );

  return {
    metrics,
    achievements,
    newlyEarnedAchievements,
    earnedCount: achievements.filter((progress) => progress.earned).length,
    totalCount: achievements.length,
  };
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isBenchPressExercise(name: string): boolean {
  const normalized = normalizeLabel(name);
  return (
    normalized.includes("developpe couche") ||
    normalized.includes("bench press") ||
    normalized.includes("barbell-bench-press")
  );
}

function isSquatExercise(name: string): boolean {
  const normalized = normalizeLabel(name);
  return normalized.includes("squat");
}

function isDeadliftExercise(name: string): boolean {
  const normalized = normalizeLabel(name);
  return (
    normalized.includes("souleve de terre") ||
    normalized.includes("deadlift")
  );
}

function weekKey(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return date;

  const day = parsedDate.getUTCDay() || 7;
  parsedDate.setUTCDate(parsedDate.getUTCDate() - day + 1);
  return parsedDate.toISOString().slice(0, 10);
}

function runningPaceMinutesPerKm(activity: Activity): number | undefined {
  if (activity.type !== "running" || activity.distanceKm <= 0) {
    return undefined;
  }

  return activity.durationMinutes / activity.distanceKm;
}

function maxStrengthLoadFor(
  completedSets: readonly StrengthSet[],
  exercisesById: ReadonlyMap<string, WorkoutSessionExercise>,
  predicate: (name: string) => boolean,
): number {
  return completedSets.reduce((maximum, set) => {
    const exercise = exercisesById.get(set.sessionExerciseId);
    if (!exercise || !predicate(exercise.exerciseNameSnapshot)) return maximum;

    return Math.max(maximum, set.weightKg);
  }, 0);
}

export async function loadAchievementMetrics(
  database: AppDatabase = appDatabase,
): Promise<AchievementMetrics> {
  const [
    activities,
    workoutSessions,
    workoutSessionExercises,
    strengthSets,
    weights,
    dailySteps,
    dailyJournalStatuses,
  ] = await Promise.all([
    database.activities.toArray(),
    database.workoutSessions.toArray(),
    database.workoutSessionExercises.toArray(),
    database.strengthSets.toArray(),
    database.weights.toArray(),
    database.dailySteps.toArray(),
    database.dailyJournalStatuses.toArray(),
  ]);

  const completedStrengthSessions = workoutSessions.filter(
    (session) => session.status === "completed",
  );
  const runningActivities = activities.filter(
    (activity) => activity.type === "running",
  );
  const swimmingActivities = activities.filter(
    (activity) => activity.type === "swimming",
  );
  const completedSets = strengthSets.filter((set) => set.isCompleted);
  const exercisesById = new Map(
    workoutSessionExercises.map((exercise) => [exercise.id, exercise]),
  );
  const activeDates = new Set<string>([
    ...activities.map((activity) => activity.date),
    ...completedStrengthSessions.map((session) => session.date),
    ...weights.map((weight) => weight.date),
  ]);
  const disciplines = new Set<string>(
    activities.map((activity) => activity.type),
  );
  const sessionsByWeek = new Map<string, number>();
  const disciplinesByWeek = new Map<string, Set<string>>();

  const addWeekSession = (date: string, discipline: string) => {
    const key = weekKey(date);
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
    const weekDisciplines = disciplinesByWeek.get(key) ?? new Set<string>();
    weekDisciplines.add(discipline);
    disciplinesByWeek.set(key, weekDisciplines);
  };

  for (const activity of activities) {
    addWeekSession(activity.date, activity.type);
  }
  for (const session of completedStrengthSessions) {
    addWeekSession(session.date, "strength");
  }

  if (completedStrengthSessions.length > 0) disciplines.add("strength");

  const runningTotalKm = runningActivities.reduce(
    (total, activity) => total + activity.distanceKm,
    0,
  );
  const runningLongestKm = runningActivities.reduce(
    (maximum, activity) => Math.max(maximum, activity.distanceKm),
    0,
  );
  const swimmingTotalMeters = swimmingActivities.reduce(
    (total, activity) => total + activity.distanceMeters,
    0,
  );
  const swimmingLongestMeters = swimmingActivities.reduce(
    (maximum, activity) => Math.max(maximum, activity.distanceMeters),
    0,
  );
  const runningFiveKmUnder30 = runningActivities.filter((activity) => {
    const pace = runningPaceMinutesPerKm(activity);
    return activity.distanceKm >= 5 && pace !== undefined && pace <= 6;
  }).length;
  const runningFiveKmUnder25 = runningActivities.filter((activity) => {
    const pace = runningPaceMinutesPerKm(activity);
    return activity.distanceKm >= 5 && pace !== undefined && pace <= 5;
  }).length;
  const runningSubFivePaceRuns = runningActivities.filter((activity) => {
    const pace = runningPaceMinutesPerKm(activity);
    return pace !== undefined && pace < 5;
  }).length;
  const strengthVolumeKg = completedSets.reduce(
    (total, set) => total + set.repetitions * set.weightKg,
    0,
  );

  return {
    totalLoggedSessions: activities.length + completedStrengthSessions.length,
    enduranceActivities: activities.filter((activity) =>
      ["running", "swimming", "cycling"].includes(activity.type),
    ).length,
    runningActivities: runningActivities.length,
    runningTotalKm,
    runningLongestKm,
    runningFiveKmUnder30,
    runningFiveKmUnder25,
    runningSubFivePaceRuns,
    runningElevationMetersTotal: runningActivities.reduce(
      (total, activity) => total + (activity.elevationGainMeters ?? 0),
      0,
    ),
    swimmingActivities: swimmingActivities.length,
    swimmingTotalMeters,
    swimmingLongestMeters,
    completedStrengthSessions: completedStrengthSessions.length,
    strengthCompletedSets: completedSets.length,
    strengthVolumeKg,
    benchPressMaxKg: maxStrengthLoadFor(
      completedSets,
      exercisesById,
      isBenchPressExercise,
    ),
    squatMaxKg: maxStrengthLoadFor(completedSets, exercisesById, isSquatExercise),
    deadliftMaxKg: maxStrengthLoadFor(
      completedSets,
      exercisesById,
      isDeadliftExercise,
    ),
    maxDailySteps: dailySteps.reduce(
      (maximum, entry) => Math.max(maximum, entry.totalSteps),
      0,
    ),
    totalSteps: dailySteps.reduce((total, entry) => total + entry.totalSteps, 0),
    activeDays: activeDates.size,
    activeWeeksWithThreeSessions: [...sessionsByWeek.values()].filter(
      (count) => count >= 3,
    ).length,
    disciplineCount: disciplines.size,
    tripleDisciplineWeeks: [...disciplinesByWeek.values()].filter(
      (weekDisciplines) =>
        weekDisciplines.has("running") &&
        weekDisciplines.has("swimming") &&
        weekDisciplines.has("strength"),
    ).length,
    completedNutritionDays: dailyJournalStatuses.filter(
      (status) => status.isComplete,
    ).length,
  };
}

export async function loadAchievementPreview(
  database: AppDatabase = appDatabase,
  earnedAt: string = new Date().toISOString(),
): Promise<AchievementSnapshot> {
  const metrics = await loadAchievementMetrics(database);
  const currentState = readAchievementState();

  return buildAchievementSnapshot(
    metrics,
    currentState.earnedAchievements,
    earnedAt,
  );
}

export async function loadAchievementSnapshot(
  database: AppDatabase = appDatabase,
  earnedAt: string = new Date().toISOString(),
): Promise<AchievementSnapshot> {
  const metrics = await loadAchievementMetrics(database);
  const currentState = readAchievementState();
  const provisionalSnapshot = buildAchievementSnapshot(
    metrics,
    currentState.earnedAchievements,
    earnedAt,
  );
  const newlyEarnedIds = provisionalSnapshot.newlyEarnedAchievements.map(
    (progress) => progress.achievement.id as AchievementId,
  );
  const nextState = unlockAchievements(newlyEarnedIds, earnedAt);
  const persistedSnapshot = buildAchievementSnapshot(
    metrics,
    nextState.earnedAchievements,
    earnedAt,
  );

  return {
    ...persistedSnapshot,
    newlyEarnedAchievements: provisionalSnapshot.newlyEarnedAchievements,
  };
}
