import type { LocalDate } from '@/domain/models/common';
import type { RoutineReminderType } from '@/domain/reminders/routineReminder';
import type {
  AchievementId,
  EarnedAchievement,
} from '@/domain/rewards/achievements';
import type {
  VisualThemeId,
} from '@/domain/rewards/visualThemes';
import type {
  CompletedWeeklyMission,
} from '@/domain/rewards/weeklyMissionHistory';

export const VISUAL_THEME_PREFERENCE_ID = 'visual-theme-preference';

export interface EarnedAchievementRecord extends EarnedAchievement {
  id: AchievementId;
  updatedAt: string;
}

export interface UnlockedVisualThemeRecord {
  id: VisualThemeId;
  unlockedAt: string;
  updatedAt: string;
}

export interface VisualThemePreferenceRecord {
  id: typeof VISUAL_THEME_PREFERENCE_ID;
  activeThemeId: VisualThemeId;
  updatedAt: string;
}

export interface CompletedWeeklyMissionRecord
  extends CompletedWeeklyMission {
  id: string;
  updatedAt: string;
}

export interface RoutineReminderCompletionRecord {
  id: string;
  date: LocalDate;
  type: RoutineReminderType;
  completedAt: string;
  updatedAt: string;
}

export function weeklyMissionCompletionId(weekStart: string): string {
  return `weekly-mission:${weekStart}`;
}

export function routineReminderCompletionId(
  date: LocalDate,
  type: RoutineReminderType,
): string {
  return `routine-reminder:${date}:${type}`;
}
