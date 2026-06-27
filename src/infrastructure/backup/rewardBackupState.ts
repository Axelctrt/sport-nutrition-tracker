import type { RewardBackupState } from '@/domain/models/backup';
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
  };
}

function restoreStoredValue(key: string, value: string | null): void {
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
}

export function restoreRewardBackupState(
  state: RewardBackupState,
): void {
  if (typeof window === 'undefined') return;

  const serializedEntries: readonly [string, string][] = [
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
  const previousValues = new Map<string, string | null>();

  try {
    for (const [key] of serializedEntries) {
      previousValues.set(key, window.localStorage.getItem(key));
    }

    for (const [key, value] of serializedEntries) {
      window.localStorage.setItem(key, value);
    }

    applyStoredVisualTheme();
    window.dispatchEvent(
      new Event(WEEKLY_MISSION_HISTORY_CHANGED_EVENT),
    );
  } catch (error) {
    for (const [key, value] of previousValues) {
      try {
        restoreStoredValue(key, value);
      } catch {
        // Le premier état reste prioritaire si le navigateur refuse aussi le rollback.
      }
    }

    applyStoredVisualTheme();
    window.dispatchEvent(
      new Event(WEEKLY_MISSION_HISTORY_CHANGED_EVENT),
    );

    throw new Error(
      'La progression des récompenses n’a pas pu être restaurée.',
      { cause: error },
    );
  }
}
