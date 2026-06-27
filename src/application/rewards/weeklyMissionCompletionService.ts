import { liveQuery } from "dexie";

import {
  loadWeeklyMissionSnapshot,
  type WeeklyMissionSnapshot,
} from "@/application/rewards/weeklyMissionService";
import {
  readWeeklyMissionHistorySnapshot,
  recordCompletedWeeklyMission,
  type CompletedWeeklyMission,
  type WeeklyMissionHistorySnapshot,
} from "@/domain/rewards/weeklyMissionHistory";
import type { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { appDatabase } from "@/infrastructure/database/database";

export interface WeeklyMissionCompletionSnapshot {
  missions: WeeklyMissionSnapshot;
  history: WeeklyMissionHistorySnapshot;
  newlyCompletedWeek?: CompletedWeeklyMission;
}

export type WeeklyMissionCompletionListener = (
  snapshot: WeeklyMissionCompletionSnapshot,
) => void;

export type WeeklyMissionCompletionErrorListener = (
  error: unknown,
) => void;

export function isWeeklyMissionSetComplete(
  snapshot: WeeklyMissionSnapshot,
): boolean {
  return (
    snapshot.totalCount > 0 &&
    snapshot.completedCount === snapshot.totalCount
  );
}

export async function loadWeeklyMissionCompletionSnapshot(
  database: AppDatabase = appDatabase,
  today: Date = new Date(),
): Promise<WeeklyMissionCompletionSnapshot> {
  const missions = await loadWeeklyMissionSnapshot(database, today);

  if (!isWeeklyMissionSetComplete(missions)) {
    return {
      missions,
      history: readWeeklyMissionHistorySnapshot(today),
    };
  }

  const recording = recordCompletedWeeklyMission(
    missions.weekStart,
    new Date().toISOString(),
    today,
  );
  const snapshot: WeeklyMissionCompletionSnapshot = {
    missions,
    history: recording.snapshot,
  };

  return recording.newlyRecorded
    ? {
        ...snapshot,
        newlyCompletedWeek: recording.newlyRecorded,
      }
    : snapshot;
}

export function observeWeeklyMissionCompletions(
  onCompletion: WeeklyMissionCompletionListener,
  onError: WeeklyMissionCompletionErrorListener = () => undefined,
): () => void {
  const subscription = liveQuery(() =>
    loadWeeklyMissionCompletionSnapshot(),
  ).subscribe({
    next: (snapshot) => {
      if (snapshot.newlyCompletedWeek) {
        onCompletion(snapshot);
      }
    },
    error: onError,
  });

  return () => subscription.unsubscribe();
}
