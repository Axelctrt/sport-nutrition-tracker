import type { RewardBackupState } from '@/domain/models/backup';
import {
  GOAL_STATE_CHANGED_EVENT,
  readGoalState,
  writeGoalState,
} from '@/domain/goals/goalState';
import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  readEndurancePlanningState,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
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
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  replaceEndurancePlanningUserState,
  replaceGoalUserState,
} from '@/infrastructure/user-state/userStateRuntime';

export function readRewardBackupState(): RewardBackupState {
  return {
    achievements: readAchievementState(),
    visualThemes: readVisualThemeState(),
    weeklyMissions: readWeeklyMissionHistoryState(),
    goals: readGoalState(),
    endurancePlanning: readEndurancePlanningState(),
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
  window.dispatchEvent(
    new Event(ENDURANCE_PLANNING_CHANGED_EVENT),
  );
}

async function restoreGoalState(
  state: NonNullable<RewardBackupState['goals']>,
  database?: AppDatabase,
): Promise<void> {
  if (database) {
    await replaceGoalUserState(state, database);
    return;
  }

  writeGoalState(state);
}

async function restoreEndurancePlanning(
  state: NonNullable<RewardBackupState['endurancePlanning']>,
  database?: AppDatabase,
): Promise<void> {
  if (database) {
    await replaceEndurancePlanningUserState(state, database);
    return;
  }

  writeEndurancePlanningState(state);
}

export async function restoreRewardBackupState(
  state: RewardBackupState,
  database?: AppDatabase,
): Promise<void> {
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

  const previousValues = new Map<string, string | null>();
  const previousGoals = readGoalState();
  const previousEndurancePlanning =
    readEndurancePlanningState();

  try {
    for (const [key] of serializedEntries) {
      previousValues.set(key, window.localStorage.getItem(key));
    }

    for (const [key, value] of serializedEntries) {
      window.localStorage.setItem(key, value);
    }

    if (state.goals) {
      await restoreGoalState(state.goals, database);
    }

    if (state.endurancePlanning) {
      await restoreEndurancePlanning(
        state.endurancePlanning,
        database,
      );
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

    try {
      if (state.goals) {
        await restoreGoalState(previousGoals, database);
      }
      if (state.endurancePlanning) {
        await restoreEndurancePlanning(
          previousEndurancePlanning,
          database,
        );
      }
    } catch {
      // La sauvegarde JSON reste le point de retour fiable.
    }

    dispatchRestoredStateEvents();

    throw new Error(
      'La progression locale n’a pas pu être restaurée.',
      { cause: error },
    );
  }
}
