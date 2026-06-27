import { liveQuery } from "dexie";

import {
  loadAchievementSnapshot,
  type AchievementProgress,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";
import {
  loadThemeAchievementSnapshot,
  type ThemeAchievementProgress,
  type ThemeAchievementSnapshot,
} from "@/application/rewards/themeAchievementService";

export interface RewardUnlockBatch {
  achievements: AchievementProgress[];
  themes: ThemeAchievementProgress[];
}

export type RewardUnlockListener = (batch: RewardUnlockBatch) => void;
export type RewardUnlockErrorListener = (error: unknown) => void;

export function buildRewardUnlockBatch(
  achievementSnapshot: AchievementSnapshot,
  themeSnapshot: ThemeAchievementSnapshot,
): RewardUnlockBatch {
  return {
    achievements: achievementSnapshot.newlyEarnedAchievements,
    themes: themeSnapshot.newlyUnlockedThemes,
  };
}

export function observeRewardUnlocks(
  onUnlocks: RewardUnlockListener,
  onError: RewardUnlockErrorListener = () => undefined,
): () => void {
  const subscription = liveQuery(async () => {
    const [achievementSnapshot, themeSnapshot] = await Promise.all([
      loadAchievementSnapshot(),
      loadThemeAchievementSnapshot(),
    ]);

    return buildRewardUnlockBatch(achievementSnapshot, themeSnapshot);
  }).subscribe({
    next: (batch) => {
      if (batch.achievements.length > 0 || batch.themes.length > 0) {
        onUnlocks(batch);
      }
    },
    error: onError,
  });

  return () => subscription.unsubscribe();
}
