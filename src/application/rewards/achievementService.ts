import {
  achievementCatalog,
  readAchievementState,
  unlockAchievements,
  type AchievementDefinition,
  type AchievementId,
  type EarnedAchievement,
} from "@/domain/rewards/achievements";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

export interface AchievementMetrics {
  totalLoggedSessions: number;
  enduranceActivities: number;
  completedStrengthSessions: number;
  activeDays: number;
  disciplineCount: number;
}

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
  earnedCount: number;
  totalCount: number;
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
      const current = metrics[achievement.metric];
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
        remaining: Math.max(0, achievement.target - current),
        earned,
        ...(storedAchievement
          ? { earnedAt: storedAchievement.earnedAt }
          : qualifiesNow
            ? { earnedAt: newlyEarnedAt }
            : {}),
      };
    },
  );

  return {
    metrics,
    achievements,
    earnedCount: achievements.filter((progress) => progress.earned).length,
    totalCount: achievements.length,
  };
}

export async function loadAchievementSnapshot(
  database: AppDatabase = appDatabase,
  earnedAt: string = new Date().toISOString(),
): Promise<AchievementSnapshot> {
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
  const disciplines = new Set<string>(
    activities.map((activity) => activity.type),
  );

  if (completedStrengthSessions.length > 0) disciplines.add("strength");

  const metrics: AchievementMetrics = {
    totalLoggedSessions: activities.length + completedStrengthSessions.length,
    enduranceActivities: enduranceActivities.length,
    completedStrengthSessions: completedStrengthSessions.length,
    activeDays: activeDates.size,
    disciplineCount: disciplines.size,
  };
  const currentState = readAchievementState();
  const provisionalSnapshot = buildAchievementSnapshot(
    metrics,
    currentState.earnedAchievements,
    earnedAt,
  );
  const newlyEarnedIds = provisionalSnapshot.achievements
    .filter(
      (progress) =>
        progress.earned &&
        !currentState.earnedAchievements.some(
          (earned) => earned.id === progress.achievement.id,
        ),
    )
    .map((progress) => progress.achievement.id as AchievementId);
  const nextState = unlockAchievements(newlyEarnedIds, earnedAt);

  return buildAchievementSnapshot(metrics, nextState.earnedAchievements, earnedAt);
}
