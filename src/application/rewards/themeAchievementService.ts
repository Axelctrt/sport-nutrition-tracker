import {
  readVisualThemeState,
  unlockVisualThemes,
  visualThemeCatalog,
  type VisualThemeDefinition,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

export interface ThemeAchievementMetrics {
  enduranceActivities: number;
  completedStrengthSessions: number;
  activeDays: number;
}

export interface ThemeAchievementProgress {
  theme: VisualThemeDefinition;
  current: number;
  target: number;
  unlocked: boolean;
  requirementLabel: string;
}

export interface ThemeAchievementSnapshot {
  metrics: ThemeAchievementMetrics;
  themes: ThemeAchievementProgress[];
  newlyUnlockedThemes: ThemeAchievementProgress[];
}

const requirements: Record<
  Exclude<VisualThemeId, "classic">,
  {
    metric: keyof ThemeAchievementMetrics;
    target: number;
    label: string;
  }
> = {
  endurance: {
    metric: "enduranceActivities",
    target: 5,
    label: "5 activités de course, natation ou vélo",
  },
  power: {
    metric: "completedStrengthSessions",
    target: 5,
    label: "5 séances de musculation terminées",
  },
  balance: {
    metric: "activeDays",
    target: 14,
    label: "14 journées actives enregistrées",
  },
};

export function buildThemeAchievementSnapshot(
  metrics: ThemeAchievementMetrics,
  previouslyUnlockedThemeIds: readonly VisualThemeId[] = ["classic"],
): ThemeAchievementSnapshot {
  const themes = visualThemeCatalog.map<ThemeAchievementProgress>((theme) => {
    if (theme.id === "classic") {
      return {
        theme,
        current: 1,
        target: 1,
        unlocked: true,
        requirementLabel: "Disponible dès l’installation",
      };
    }

    const requirement = requirements[theme.id];
    const current = metrics[requirement.metric];
    return {
      theme,
      current,
      target: requirement.target,
      unlocked:
        previouslyUnlockedThemeIds.includes(theme.id) ||
        current >= requirement.target,
      requirementLabel: requirement.label,
    };
  });
  const newlyUnlockedThemes = themes.filter(
    (progress) =>
      progress.theme.id !== "classic" &&
      progress.current >= progress.target &&
      !previouslyUnlockedThemeIds.includes(progress.theme.id),
  );

  return { metrics, themes, newlyUnlockedThemes };
}

export async function loadThemeAchievementSnapshot(
  database: AppDatabase = appDatabase,
): Promise<ThemeAchievementSnapshot> {
  const [activities, workoutSessions, weights] = await Promise.all([
    database.activities.toArray(),
    database.workoutSessions.toArray(),
    database.weights.toArray(),
  ]);

  const completedStrengthSessions = workoutSessions.filter(
    (session) => session.status === "completed",
  );
  const enduranceActivities = activities.filter((activity) =>
    ["running", "swimming", "cycling"].includes(activity.type),
  );
  const activeDates = new Set<string>([
    ...activities.map((activity) => activity.date),
    ...completedStrengthSessions.map((session) => session.date),
    ...weights.map((weight) => weight.date),
  ]);

  const metrics: ThemeAchievementMetrics = {
    enduranceActivities: enduranceActivities.length,
    completedStrengthSessions: completedStrengthSessions.length,
    activeDays: activeDates.size,
  };
  const storedState = readVisualThemeState();
  const snapshot = buildThemeAchievementSnapshot(
    metrics,
    storedState.unlockedThemeIds,
  );
  const unlockedThemeIds = snapshot.themes
    .filter((progress) => progress.unlocked)
    .map((progress) => progress.theme.id);

  unlockVisualThemes(unlockedThemeIds);
  return snapshot;
}
