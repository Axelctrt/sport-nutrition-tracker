import {
  ACHIEVEMENT_STORAGE_KEY,
  readAchievementState,
  unlockAchievements,
} from '@/domain/rewards/achievements';
import {
  activateVisualTheme,
  readVisualThemeState,
  unlockVisualThemes,
  VISUAL_THEME_STORAGE_KEY,
} from '@/domain/rewards/visualThemes';
import {
  readWeeklyMissionHistoryState,
  recordCompletedWeeklyMission,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
} from '@/domain/rewards/weeklyMissionHistory';
import {
  readRewardBackupState,
  restoreRewardBackupState,
} from '@/infrastructure/backup/rewardBackupState';

const rewardStorageKeys = [
  ACHIEVEMENT_STORAGE_KEY,
  VISUAL_THEME_STORAGE_KEY,
  WEEKLY_MISSION_HISTORY_STORAGE_KEY,
] as const;

describe('rewardBackupState', () => {
  beforeEach(() => {
    for (const key of rewardStorageKeys) {
      window.localStorage.removeItem(key);
    }
    document.documentElement.removeAttribute('data-sport-theme');
  });

  it('lit les trois états de récompense', () => {
    unlockAchievements(
      ['first-session'],
      '2026-06-27T18:00:00.000Z',
    );
    unlockVisualThemes(['endurance']);
    activateVisualTheme('endurance');
    recordCompletedWeeklyMission(
      '2026-06-22',
      '2026-06-27T19:00:00.000Z',
      new Date(2026, 5, 27),
    );

    expect(readRewardBackupState()).toEqual({
      achievements: {
        earnedAchievements: [
          {
            id: 'first-session',
            earnedAt: '2026-06-27T18:00:00.000Z',
          },
        ],
      },
      visualThemes: {
        activeThemeId: 'endurance',
        unlockedThemeIds: ['classic', 'endurance'],
      },
      weeklyMissions: {
        completedWeeks: [
          {
            weekStart: '2026-06-22',
            completedAt: '2026-06-27T19:00:00.000Z',
          },
        ],
      },
    });
  });

  it('restaure les récompenses et applique le thème actif', () => {
    restoreRewardBackupState({
      achievements: {
        earnedAchievements: [
          {
            id: 'strength-five',
            earnedAt: '2026-06-20T10:00:00.000Z',
          },
        ],
      },
      visualThemes: {
        activeThemeId: 'power',
        unlockedThemeIds: ['classic', 'power'],
      },
      weeklyMissions: {
        completedWeeks: [
          {
            weekStart: '2026-06-15',
            completedAt: '2026-06-20T10:00:00.000Z',
          },
        ],
      },
    });

    expect(readAchievementState().earnedAchievements).toEqual([
      {
        id: 'strength-five',
        earnedAt: '2026-06-20T10:00:00.000Z',
      },
    ]);
    expect(readVisualThemeState()).toEqual({
      activeThemeId: 'power',
      unlockedThemeIds: ['classic', 'power'],
    });
    expect(readWeeklyMissionHistoryState().completedWeeks).toEqual([
      {
        weekStart: '2026-06-15',
        completedAt: '2026-06-20T10:00:00.000Z',
      },
    ]);
    expect(document.documentElement.dataset.sportTheme).toBe(
      'power',
    );
  });
});
