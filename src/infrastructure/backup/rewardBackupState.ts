import type { RewardBackupState } from '@/domain/models/backup';
import {
  GOAL_STATE_CHANGED_EVENT,
  GOAL_STATE_STORAGE_KEY,
  readGoalState,
} from '@/domain/goals/goalState';
import {
  ACHIEVEMENT_STORAGE_KEY,
  readAchievementState,
} from '@/domain/rewards/achievements';
import {
  applyStoredVisualTheme,
  readVisualThemeState,
  VISUAL_THEME_STORAGE_KEY,
} from '@/domain/rewards/visualThemes';
import {
  readWeeklyMissionHistoryState,
  WEEKLY_MISSION_HISTORY_CHANGED_EVENT,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
} from '@/domain/rewards/weeklyMissionHistory';

export function readRewardBackupState(): RewardBackupState {
  return {
    achievements: readAchievementState(),
    visualThemes: readVisualThemeState(),
    weeklyMissions: readWeeklyMissionHistoryState(),
    goals: readGoalState(),
  };
}

function restoreStoredValue(
  key: string,
  value: string | null,
): void {
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
}

function dispatchRestoredStateEvents(): void {
  applyStoredVisualTheme();
  window.dispatchEvent(
    new Event(WEEKLY_MISSION_HISTORY_CHANGED_EVENT),
  );
  window.dispatchEvent(new Event(GOAL_STATE_CHANGED_EVENT));
}

export function restoreRewardBackupState(
  state: RewardBackupState,
): void {
  if (typeof window === 'undefined') return;

  const serializedEntries: [string, string][] = [
    [
      ACHIEVEMENT_STORAGE_KEY,
      JSON.stringify(state.achievements),
    ],
    [
      VISUAL_THEME_STORAGE_KEY,
      JSON.stringify(state.visualThemes),
    ],
    [
      WEEKLY_MISSION_HISTORY_STORAGE_KEY,
      JSON.stringify(state.weeklyMissions),
    ],
  ];

  if (state.goals) {
    serializedEntries.push([
      GOAL_STATE_STORAGE_KEY,
      JSON.stringify(state.goals),
    ]);
  }

  const previousValues = new Map<string, string | null>();

  try {
    for (const [key] of serializedEntries) {
      previousValues.set(
        key,
        window.localStorage.getItem(key),
      );
    }

    for (const [key, value] of serializedEntries) {
      window.localStorage.setItem(key, value);
    }

    dispatchRestoredStateEvents();
  } catch (error) {
    for (const [key, value] of previousValues) {
      try {
        restoreStoredValue(key, value);
      } catch {
        // Le premier état reste prioritaire si le navigateur
        // refuse également le rollback.
      }
    }

    dispatchRestoredStateEvents();

    throw new Error(
      'La progression locale n’a pas pu être restaurée.',
      { cause: error },
    );
  }
}
