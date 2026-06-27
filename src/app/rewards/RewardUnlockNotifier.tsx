import { useEffect } from "react";

import {
  observeRewardUnlocks,
  type RewardUnlockBatch,
  type RewardUnlockListener,
} from "@/application/rewards/rewardUnlockObserver";
import { useToast } from "@/shared/toast/useToast";

export type RewardUnlockObserver = (
  onUnlocks: RewardUnlockListener,
  onError?: (error: unknown) => void,
) => () => void;

interface RewardUnlockNotifierProps {
  observeUnlocks?: RewardUnlockObserver;
}

function joinNames(names: readonly string[]): string {
  return names.join(", ");
}

export function RewardUnlockNotifier({
  observeUnlocks = observeRewardUnlocks,
}: RewardUnlockNotifierProps) {
  const { showToast } = useToast();

  useEffect(() => {
    const handleUnlocks = (batch: RewardUnlockBatch) => {
      if (batch.achievements.length > 0) {
        const names = batch.achievements.map(
          (progress) => progress.achievement.name,
        );
        const firstAchievement = batch.achievements[0];

        showToast({
          tone: "success",
          title:
            names.length === 1
              ? `Nouveau badge : ${names[0]}`
              : `${names.length} nouveaux badges gagnés`,
          description:
            names.length === 1 && firstAchievement
              ? firstAchievement.achievement.description
              : joinNames(names),
          durationMs: 8_000,
          dedupeKey: `reward-achievements:${batch.achievements
            .map((progress) => progress.achievement.id)
            .join(",")}`,
        });
      }

      if (batch.themes.length > 0) {
        const names = batch.themes.map((progress) => progress.theme.name);
        showToast({
          tone: "success",
          title:
            names.length === 1
              ? `Nouveau thème : ${names[0]}`
              : `${names.length} nouveaux thèmes débloqués`,
          description:
            names.length === 1
              ? "Tu peux l’activer depuis les paramètres avancés."
              : `${joinNames(names)} — disponibles dans les paramètres avancés.`,
          durationMs: 8_000,
          dedupeKey: `reward-themes:${batch.themes
            .map((progress) => progress.theme.id)
            .join(",")}`,
        });
      }
    };

    return observeUnlocks(handleUnlocks, () => undefined);
  }, [observeUnlocks, showToast]);

  return null;
}
