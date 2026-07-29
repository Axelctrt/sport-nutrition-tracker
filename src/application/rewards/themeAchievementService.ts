import {
  addDays,
  format,
  parseISO,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";

import type { Activity } from "@/domain/models/activity";
import type { DailyCheckIn, DailyCheckOut, DailyActivityDecision } from "@/domain/models/dailyCoaching";
import type { FoodEntry } from "@/domain/models/food";
import type { LocalDate } from "@/domain/models/common";
import type { WorkoutSession } from "@/domain/models/strength";
import {
  DEFAULT_VISUAL_THEME_ID,
  readVisualThemeState,
  unlockVisualThemes,
  visualThemeCatalog,
  type SportPilotThemeDefinition,
  type VisualThemeId,
  type VisualThemeState,
} from "@/domain/rewards/visualThemes";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";
import { toLocalDate } from "@/shared/utils/dates";

const NEON_ACTIVITY_TARGET = 20;
const NEON_REGULAR_WEEK_TARGET = 3;
const EMERALD_COMPLETE_DAY_TARGET = 12;
const EMERALD_NUTRITION_DAY_TARGET = 10;
const AURORA_BALANCED_WEEK_TARGET = 4;
const ZENITH_BALANCED_WEEK_TARGET = 8;
const ZENITH_ACTIVITY_TARGET = 50;
const ZENITH_COMPLETE_DAY_TARGET = 40;

export interface ThemeUnlockCriterion {
  id: string;
  label: string;
  current: number;
  target: number;
  met: boolean;
}

export interface ThemeAchievementProgress {
  theme: SportPilotThemeDefinition;
  current: number;
  target: number;
  progressPercent: number;
  unlocked: boolean;
  requirementLabel: string;
  criteria: readonly ThemeUnlockCriterion[];
  unlockedAt?: string;
  revealSeenAt?: string;
  previewAvailable: true;
}

export interface BalancedWeekProgress {
  weekStart: LocalDate;
  trackingDays: number;
  nutritionDays: number;
  completedActivities: number;
  confirmedRestDays: number;
  activityAxisMet: boolean;
  balanced: boolean;
}

export interface ThemeAchievementMetrics {
  completedActivities: number;
  regularActivityWeeks: number;
  completeDaysInThirtyDays: number;
  nutritionDaysInThirtyDays: number;
  balancedWeeks: number;
  balancedWeeksInTwelveWeeks: number;
  completeDaysAllTime: number;
  currentWeek?: BalancedWeekProgress;
}

export interface ThemeAchievementSnapshot {
  metrics: ThemeAchievementMetrics;
  themes: ThemeAchievementProgress[];
  newlyUnlockedThemes: ThemeAchievementProgress[];
  previewableCount: number;
  balancedWeeks: BalancedWeekProgress[];
}

export interface ThemeAchievementData {
  activities: readonly Activity[];
  workoutSessions: readonly WorkoutSession[];
  checkIns: readonly DailyCheckIn[];
  checkOuts: readonly DailyCheckOut[];
  foodEntries: readonly FoodEntry[];
  activityDecisions: readonly DailyActivityDecision[];
}

interface CompletedSportRecord {
  id: string;
  date: LocalDate;
}

function weekStartOf(date: LocalDate): LocalDate {
  return format(
    startOfWeek(parseISO(date), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  ) as LocalDate;
}

function completedSportRecords(
  activities: readonly Activity[],
  workoutSessions: readonly WorkoutSession[],
): CompletedSportRecord[] {
  const completedSessions = workoutSessions.filter(
    ({ status }) => status === "completed",
  );
  const mirroredActivityIds = new Set(
    completedSessions.flatMap(({ completedActivityId }) => (
      completedActivityId ? [completedActivityId] : []
    )),
  );
  const activityRecords = activities
    .filter(({ id }) => !mirroredActivityIds.has(id))
    .map(({ id, date }) => ({ id: `activity:${id}`, date }));
  const strengthRecords = completedSessions.map(({ id, date }) => ({
    id: `strength:${id}`,
    date,
  }));
  return [...activityRecords, ...strengthRecords];
}

function datesInRange(
  dates: ReadonlySet<LocalDate>,
  from: LocalDate,
  to: LocalDate,
): Set<LocalDate> {
  return new Set([...dates].filter((date) => date >= from && date <= to));
}

function buildBalancedWeeks(
  data: ThemeAchievementData,
  sports: readonly CompletedSportRecord[],
): BalancedWeekProgress[] {
  const trackingDates = new Set<LocalDate>([
    ...data.checkIns.map(({ date }) => date),
    ...data.checkOuts.map(({ date }) => date),
  ]);
  const nutritionDates = new Set(data.foodEntries.map(({ date }) => date));
  const confirmedRestDates = new Set(
    data.activityDecisions
      .filter(({ decision, confirmedAt }) => decision === "rest" && Boolean(confirmedAt))
      .map(({ date }) => date),
  );
  const weekStarts = new Set<LocalDate>([
    ...trackingDates,
    ...nutritionDates,
    ...confirmedRestDates,
    ...sports.map(({ date }) => date),
  ].map(weekStartOf));

  return [...weekStarts].sort().map((weekStart) => {
    const weekEnd = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd") as LocalDate;
    const trackingDays = datesInRange(trackingDates, weekStart, weekEnd).size;
    const nutritionDays = datesInRange(nutritionDates, weekStart, weekEnd).size;
    const completedActivities = sports.filter(
      ({ date }) => date >= weekStart && date <= weekEnd,
    ).length;
    const confirmedRestDays = datesInRange(
      confirmedRestDates,
      weekStart,
      weekEnd,
    ).size;
    const activityAxisMet = completedActivities >= 2
      || (completedActivities >= 1 && confirmedRestDays >= 1);
    return {
      weekStart,
      trackingDays,
      nutritionDays,
      completedActivities,
      confirmedRestDays,
      activityAxisMet,
      balanced:
        trackingDays >= 3
        && nutritionDays >= 3
        && activityAxisMet,
    };
  });
}

function criterion(
  id: string,
  label: string,
  current: number,
  target: number,
): ThemeUnlockCriterion {
  return { id, label, current, target, met: current >= target };
}

function progressFromCriteria(criteria: readonly ThemeUnlockCriterion[]): number {
  if (criteria.length === 0) return 100;
  return Math.round(
    criteria.reduce(
      (total, item) => total + Math.min(1, item.current / Math.max(1, item.target)),
      0,
    ) / criteria.length * 100,
  );
}

function requirementLabel(
  themeId: VisualThemeId,
  criteria: readonly ThemeUnlockCriterion[],
): string {
  if (themeId === "core") return "Disponible immédiatement";
  return criteria.map(({ label }) => label).join(" et ");
}

function progressForTheme(
  theme: SportPilotThemeDefinition,
  criteria: readonly ThemeUnlockCriterion[],
  state: VisualThemeState,
): ThemeAchievementProgress {
  const persistedUnlocked = state.unlockedThemeIds.includes(theme.id);
  const conditionsMet = criteria.every(({ met }) => met);
  const metadata = state.unlockMetadata[theme.id];
  return {
    theme,
    current: criteria.filter(({ met }) => met).length,
    target: Math.max(1, criteria.length),
    progressPercent: progressFromCriteria(criteria),
    unlocked:
      theme.id === DEFAULT_VISUAL_THEME_ID
      || persistedUnlocked
      || conditionsMet,
    requirementLabel: requirementLabel(theme.id, criteria),
    criteria,
    ...(metadata?.unlockedAt ? { unlockedAt: metadata.unlockedAt } : {}),
    ...(metadata?.revealSeenAt ? { revealSeenAt: metadata.revealSeenAt } : {}),
    previewAvailable: true,
  };
}

export function buildThemeAchievementSnapshot(
  data: ThemeAchievementData,
  referenceDate: LocalDate,
  state: VisualThemeState = readVisualThemeState(),
): ThemeAchievementSnapshot {
  const sports = completedSportRecords(data.activities, data.workoutSessions);
  const activitiesByWeek = new Map<LocalDate, number>();
  for (const sport of sports) {
    const weekStart = weekStartOf(sport.date);
    activitiesByWeek.set(weekStart, (activitiesByWeek.get(weekStart) ?? 0) + 1);
  }
  const regularActivityWeeks = [...activitiesByWeek.values()]
    .filter((count) => count >= 3).length;

  const completeDates = new Set(
    data.checkIns
      .map(({ date }) => date)
      .filter((date) => data.checkOuts.some((checkOut) => checkOut.date === date)),
  );
  const nutritionDates = new Set(data.foodEntries.map(({ date }) => date));
  const thirtyDayStart = format(
    subDays(parseISO(referenceDate), 29),
    "yyyy-MM-dd",
  ) as LocalDate;
  const completeDaysInThirtyDays = datesInRange(
    completeDates,
    thirtyDayStart,
    referenceDate,
  ).size;
  const nutritionDaysInThirtyDays = datesInRange(
    nutritionDates,
    thirtyDayStart,
    referenceDate,
  ).size;

  const balancedWeeks = buildBalancedWeeks(data, sports);
  const currentWeekStart = weekStartOf(referenceDate);
  const twelveWeekStart = format(
    subWeeks(parseISO(currentWeekStart), 11),
    "yyyy-MM-dd",
  ) as LocalDate;
  const balancedWeeksInTwelveWeeks = balancedWeeks.filter(
    ({ weekStart, balanced }) => (
      balanced
      && weekStart >= twelveWeekStart
      && weekStart <= currentWeekStart
    ),
  ).length;
  const balancedWeekCount = balancedWeeks.filter(({ balanced }) => balanced).length;
  const currentWeek = balancedWeeks.find(
    ({ weekStart }) => weekStart === currentWeekStart,
  );
  const metrics: ThemeAchievementMetrics = {
    completedActivities: sports.length,
    regularActivityWeeks,
    completeDaysInThirtyDays,
    nutritionDaysInThirtyDays,
    balancedWeeks: balancedWeekCount,
    balancedWeeksInTwelveWeeks,
    completeDaysAllTime: completeDates.size,
    ...(currentWeek ? { currentWeek } : {}),
  };

  const criteriaByTheme: Record<VisualThemeId, readonly ThemeUnlockCriterion[]> = {
    core: [],
    "neon-pulse": [
      criterion(
        "completed-activities",
        "20 activités terminées",
        metrics.completedActivities,
        NEON_ACTIVITY_TARGET,
      ),
      criterion(
        "regular-weeks",
        "3 semaines avec au moins 3 activités",
        metrics.regularActivityWeeks,
        NEON_REGULAR_WEEK_TARGET,
      ),
    ],
    "emerald-focus": [
      criterion(
        "complete-days-30",
        "12 journées avec check-in et check-out sur 30 jours",
        metrics.completeDaysInThirtyDays,
        EMERALD_COMPLETE_DAY_TARGET,
      ),
      criterion(
        "nutrition-days-30",
        "10 journées nutritionnelles renseignées sur 30 jours",
        metrics.nutritionDaysInThirtyDays,
        EMERALD_NUTRITION_DAY_TARGET,
      ),
    ],
    aurora: [
      criterion(
        "balanced-weeks",
        "4 semaines équilibrées",
        metrics.balancedWeeks,
        AURORA_BALANCED_WEEK_TARGET,
      ),
    ],
    "zenith-gold": [
      criterion(
        "mastery-weeks",
        "8 semaines équilibrées sur les 12 dernières",
        metrics.balancedWeeksInTwelveWeeks,
        ZENITH_BALANCED_WEEK_TARGET,
      ),
      criterion(
        "completed-activities",
        "50 activités terminées",
        metrics.completedActivities,
        ZENITH_ACTIVITY_TARGET,
      ),
      criterion(
        "complete-days",
        "40 journées avec check-in et check-out",
        metrics.completeDaysAllTime,
        ZENITH_COMPLETE_DAY_TARGET,
      ),
    ],
  };
  const themes = visualThemeCatalog.map((theme) => (
    progressForTheme(theme, criteriaByTheme[theme.id], state)
  ));
  const newlyUnlockedThemes = themes.filter(({ theme, unlocked }) => (
    theme.id !== DEFAULT_VISUAL_THEME_ID
    && unlocked
    && !state.unlockedThemeIds.includes(theme.id)
  ));

  return {
    metrics,
    themes,
    newlyUnlockedThemes,
    previewableCount: themes.length,
    balancedWeeks,
  };
}

async function readThemeAchievementData(
  database: AppDatabase,
): Promise<ThemeAchievementData> {
  const [
    activities,
    workoutSessions,
    checkIns,
    checkOuts,
    foodEntries,
    activityDecisions,
  ] = await Promise.all([
    database.activities.toArray(),
    database.workoutSessions.toArray(),
    database.dailyCheckIns.toArray(),
    database.dailyCheckOuts.toArray(),
    database.foodEntries.toArray(),
    database.dailyActivityDecisions.toArray(),
  ]);
  return {
    activities,
    workoutSessions,
    checkIns,
    checkOuts,
    foodEntries,
    activityDecisions,
  };
}

export async function loadThemeAchievementPreview(
  database: AppDatabase = appDatabase,
  referenceDate: LocalDate = toLocalDate(),
): Promise<ThemeAchievementSnapshot> {
  return buildThemeAchievementSnapshot(
    await readThemeAchievementData(database),
    referenceDate,
  );
}

export async function loadThemeAchievementSnapshot(
  database: AppDatabase = appDatabase,
  referenceDate: LocalDate = toLocalDate(),
): Promise<ThemeAchievementSnapshot> {
  const snapshot = await loadThemeAchievementPreview(database, referenceDate);
  if (snapshot.newlyUnlockedThemes.length > 0) {
    unlockVisualThemes(
      snapshot.newlyUnlockedThemes.map(({ theme }) => theme.id),
    );
  }
  return snapshot;
}
