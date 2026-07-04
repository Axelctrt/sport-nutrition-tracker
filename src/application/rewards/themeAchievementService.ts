import {
  readVisualThemeState,
  unlockVisualThemes,
  visualThemeCatalog,
  type VisualThemeDefinition,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

export const themeAchievementMetricKeys = [
  "totalLoggedSessions",
  "enduranceActivities",
  "runningKm",
  "swimmingActivities",
  "swimmingMeters",
  "completedStrengthSessions",
  "strengthVolumeKg",
  "activeDays",
] as const;

export type ThemeAchievementMetricKey = (typeof themeAchievementMetricKeys)[number];
export type ThemeAchievementMetrics = Partial<Record<ThemeAchievementMetricKey, number>>;

export interface ThemeAchievementProgress {
  theme: VisualThemeDefinition;
  current: number;
  target: number;
  unlocked: boolean;
  requirementLabel: string;
  previewAvailable: boolean;
}

export interface ThemeAchievementSnapshot {
  metrics: ThemeAchievementMetrics;
  themes: ThemeAchievementProgress[];
  newlyUnlockedThemes: ThemeAchievementProgress[];
  previewableCount: number;
}

const requirements: Record<
  Exclude<VisualThemeId, "classic">,
  {
    metric: ThemeAchievementMetricKey;
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
  aurore: {
    metric: "totalLoggedSessions",
    target: 5,
    label: "5 entraînements enregistrés",
  },
  foret: {
    metric: "activeDays",
    target: 10,
    label: "10 journées actives enregistrées",
  },
  ocean: {
    metric: "swimmingActivities",
    target: 10,
    label: "10 séances de natation enregistrées",
  },
  acier: {
    metric: "completedStrengthSessions",
    target: 10,
    label: "10 séances de musculation terminées",
  },
  "nuit-polaire": {
    metric: "totalLoggedSessions",
    target: 25,
    label: "25 entraînements enregistrés",
  },
  abysses: {
    metric: "swimmingMeters",
    target: 100000,
    label: "100 km de natation cumulés",
  },
  volcan: {
    metric: "completedStrengthSessions",
    target: 100,
    label: "100 séances de musculation terminées",
  },
  canopee: {
    metric: "runningKm",
    target: 500,
    label: "500 km de course cumulés",
  },
  cosmos: {
    metric: "totalLoggedSessions",
    target: 250,
    label: "250 entraînements enregistrés",
  },
  forge: {
    metric: "strengthVolumeKg",
    target: 50000,
    label: "50 000 kg de volume de musculation",
  },
  "nexus-vivant": {
    metric: "totalLoggedSessions",
    target: 500,
    label: "500 entraînements enregistrés",
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
        previewAvailable: true,
      };
    }

    const requirement = requirements[theme.id];
    const current = metrics[requirement.metric] ?? 0;
    return {
      theme,
      current,
      target: requirement.target,
      unlocked:
        previouslyUnlockedThemeIds.includes(theme.id) ||
        current >= requirement.target,
      requirementLabel: requirement.label,
      previewAvailable: true,
    };
  });
  const newlyUnlockedThemes = themes.filter(
    (progress) =>
      progress.theme.id !== "classic" &&
      progress.current >= progress.target &&
      !previouslyUnlockedThemeIds.includes(progress.theme.id),
  );

  return {
    metrics,
    themes,
    newlyUnlockedThemes,
    previewableCount: themes.length,
  };
}

export async function loadThemeAchievementSnapshot(
  database: AppDatabase = appDatabase,
): Promise<ThemeAchievementSnapshot> {
  const snapshot = await loadThemeAchievementPreview(database);
  const unlockedThemeIds = snapshot.themes
    .filter((progress) => progress.unlocked)
    .map((progress) => progress.theme.id);

  unlockVisualThemes(unlockedThemeIds);
  return snapshot;
}

export async function loadThemeAchievementPreview(
  database: AppDatabase = appDatabase,
): Promise<ThemeAchievementSnapshot> {
  const [activities, workoutSessions, strengthSets, weights] = await Promise.all([
    database.activities.toArray(),
    database.workoutSessions.toArray(),
    database.strengthSets.toArray(),
    database.weights.toArray(),
  ]);

  const completedStrengthSessions = workoutSessions.filter(
    (session) => session.status === "completed",
  );
  const enduranceActivities = activities.filter((activity) =>
    ["running", "swimming", "cycling"].includes(activity.type),
  );
  const runningActivities = activities.filter(
    (activity) => activity.type === "running",
  );
  const swimmingActivities = activities.filter(
    (activity) => activity.type === "swimming",
  );
  const activeDates = new Set<string>([
    ...activities.map((activity) => activity.date),
    ...completedStrengthSessions.map((session) => session.date),
    ...weights.map((weight) => weight.date),
  ]);
  const completedSets = strengthSets.filter((set) => set.isCompleted);

  const metrics: ThemeAchievementMetrics = {
    totalLoggedSessions: activities.length + completedStrengthSessions.length,
    enduranceActivities: enduranceActivities.length,
    runningKm: runningActivities.reduce(
      (total, activity) => total + activity.distanceKm,
      0,
    ),
    swimmingActivities: swimmingActivities.length,
    swimmingMeters: swimmingActivities.reduce(
      (total, activity) => total + activity.distanceMeters,
      0,
    ),
    completedStrengthSessions: completedStrengthSessions.length,
    strengthVolumeKg: completedSets.reduce(
      (total, set) => total + set.repetitions * set.weightKg,
      0,
    ),
    activeDays: activeDates.size,
  };
  const storedState = readVisualThemeState();
  const snapshot = buildThemeAchievementSnapshot(
    metrics,
    storedState.unlockedThemeIds,
  );
  return snapshot;
}
