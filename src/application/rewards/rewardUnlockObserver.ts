import { liveQuery } from "dexie";

import {
  loadAchievementPreview,
  type AchievementProgress,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";
import {
  loadThemeAchievementPreview,
  type ThemeAchievementProgress,
  type ThemeAchievementSnapshot,
} from "@/application/rewards/themeAchievementService";
import {
  unlockAchievements,
  type AchievementId,
} from "@/domain/rewards/achievements";
import {
  unlockVisualThemes,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

export interface RewardUnlockBatch {
  achievements: AchievementProgress[];
  themes: ThemeAchievementProgress[];
}

export type RewardUnlockListener = (batch: RewardUnlockBatch) => void;
export type RewardUnlockErrorListener = (error: unknown) => void;

interface RewardUnlockEvaluation {
  batch: RewardUnlockBatch;
  earnedAt: string;
}

export function buildRewardUnlockBatch(
  achievementSnapshot: AchievementSnapshot,
  themeSnapshot: ThemeAchievementSnapshot,
): RewardUnlockBatch {
  return {
    achievements: achievementSnapshot.newlyEarnedAchievements,
    themes: themeSnapshot.newlyUnlockedThemes,
  };
}

export function persistRewardUnlockBatch(
  batch: RewardUnlockBatch,
  earnedAt: string,
): void {
  unlockAchievements(
    batch.achievements.map(
      (progress) => progress.achievement.id as AchievementId,
    ),
    earnedAt,
  );
  unlockVisualThemes(
    batch.themes.map((progress) => progress.theme.id as VisualThemeId),
  );
}

export function observeRewardUnlocks(
  onUnlocks: RewardUnlockListener,
  onError: RewardUnlockErrorListener = () => undefined,
  database: AppDatabase = appDatabase,
): () => void {
  const subscription = liveQuery(async () => {
    const earnedAt = new Date().toISOString();
    const [achievementSnapshot, themeSnapshot] = await Promise.all([
      loadAchievementPreview(database, earnedAt),
      loadThemeAchievementPreview(database),
    ]);

    return {
      batch: buildRewardUnlockBatch(achievementSnapshot, themeSnapshot),
      earnedAt,
    } satisfies RewardUnlockEvaluation;
  }).subscribe({
    next: ({ batch, earnedAt }) => {
      if (batch.achievements.length > 0 || batch.themes.length > 0) {
        persistRewardUnlockBatch(batch, earnedAt);
        onUnlocks(batch);
      }
    },
    error: onError,
  });

  return () => subscription.unsubscribe();
}
