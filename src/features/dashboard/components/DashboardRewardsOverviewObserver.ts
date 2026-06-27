import { liveQuery } from "dexie";

import {
  loadAchievementPreview,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";

export type AchievementSnapshotListener = (
  snapshot: AchievementSnapshot,
) => void;

export type AchievementSnapshotObserver = (
  onSnapshot: AchievementSnapshotListener,
  onError: (error: unknown) => void,
) => () => void;

export function observeAchievementPreview(
  onSnapshot: AchievementSnapshotListener,
  onError: (error: unknown) => void,
): () => void {
  const subscription = liveQuery(() => loadAchievementPreview()).subscribe({
    next: onSnapshot,
    error: onError,
  });

  return () => subscription.unsubscribe();
}
