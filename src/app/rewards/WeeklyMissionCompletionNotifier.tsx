import { useEffect } from "react";

import {
  observeWeeklyMissionCompletions,
  type WeeklyMissionCompletionErrorListener,
  type WeeklyMissionCompletionListener,
} from "@/application/rewards/weeklyMissionCompletionService";
import { useToast } from "@/shared/toast/useToast";

export type WeeklyMissionCompletionObserver = (
  onCompletion: WeeklyMissionCompletionListener,
  onError?: WeeklyMissionCompletionErrorListener,
) => () => void;

interface WeeklyMissionCompletionNotifierProps {
  observeCompletions?: WeeklyMissionCompletionObserver;
}

export function WeeklyMissionCompletionNotifier({
  observeCompletions = observeWeeklyMissionCompletions,
}: WeeklyMissionCompletionNotifierProps) {
  const { showToast } = useToast();

  useEffect(
    () =>
      observeCompletions(
        (snapshot) => {
          const completedWeek =
            snapshot.newlyCompletedWeek;
          if (!completedWeek) return;

          showToast({
            tone: "success",
            title: "Semaine accomplie !",
            description:
              "Les cinq missions hebdomadaires sont terminées. Cette semaine rejoint ton historique.",
            durationMs: 10_000,
            dedupeKey: `weekly-missions-completed:${completedWeek.weekStart}`,
          });
        },
        () => undefined,
      ),
    [observeCompletions, showToast],
  );

  return null;
}
