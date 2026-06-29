import {
  GOAL_STATE_CHANGED_EVENT,
  readGoalState,
  writeGoalState,
} from '@/domain/goals/goalState';
import type { RewardBackupState } from '@/domain/models/backup';
import {
  ENDURANCE_PLANNING_CHANGED_EVENT,
  readEndurancePlanningState,
  writeEndurancePlanningState,
} from '@/domain/planning/endurancePlanningState';
import {
  readAchievementState,
  writeAchievementState,
} from '@/domain/rewards/achievements';
import {
  applyStoredVisualTheme,
  readVisualThemeState,
  writeVisualThemeState,
} from '@/domain/rewards/visualThemes';
import {
  WEEKLY_MISSION_HISTORY_CHANGED_EVENT,
  readWeeklyMissionHistoryState,
  writeWeeklyMissionHistoryState,
} from '@/domain/rewards/weeklyMissionHistory';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  replaceAchievementUserState,
  replaceEndurancePlanningUserState,
  replaceGoalUserState,
  replaceVisualThemeUserState,
  replaceWeeklyMissionUserState,
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

function dispatchRestoredStateEvents(): void {
  if (typeof window === 'undefined') return;

  applyStoredVisualTheme();
  window.dispatchEvent(
    new Event(WEEKLY_MISSION_HISTORY_CHANGED_EVENT),
  );
  window.dispatchEvent(new Event(GOAL_STATE_CHANGED_EVENT));
  window.dispatchEvent(
    new Event(ENDURANCE_PLANNING_CHANGED_EVENT),
  );
}

async function restoreState(
  state: RewardBackupState,
  database?: AppDatabase,
): Promise<void> {
  if (database) {
    await replaceAchievementUserState(state.achievements, database);
    await replaceVisualThemeUserState(state.visualThemes, database);
    await replaceWeeklyMissionUserState(state.weeklyMissions, database);

    if (state.goals) {
      await replaceGoalUserState(state.goals, database);
    }
    if (state.endurancePlanning) {
      await replaceEndurancePlanningUserState(
        state.endurancePlanning,
        database,
      );
    }
    return;
  }

  writeAchievementState(state.achievements);
  writeVisualThemeState(state.visualThemes);
  writeWeeklyMissionHistoryState(state.weeklyMissions);

  if (state.goals) writeGoalState(state.goals);
  if (state.endurancePlanning) {
    writeEndurancePlanningState(state.endurancePlanning);
  }
}

export async function restoreRewardBackupState(
  state: RewardBackupState,
  database?: AppDatabase,
): Promise<void> {
  const previous: RewardBackupState = readRewardBackupState();

  try {
    await restoreState(state, database);
    dispatchRestoredStateEvents();
  } catch (error) {
    try {
      await restoreState(previous, database);
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
