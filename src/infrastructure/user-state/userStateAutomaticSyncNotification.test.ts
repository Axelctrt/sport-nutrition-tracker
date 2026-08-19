import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
  type SyncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import {
  flushRoutineReminderCompletionPersistence,
  recordRoutineReminderCompletion,
} from '@/domain/reminders/routineReminderCompletionState';
import {
  flushAchievementStatePersistence,
  unlockAchievements,
} from '@/domain/rewards/achievements';
import {
  activateVisualTheme,
  flushVisualThemeStatePersistence,
  unlockVisualThemes,
} from '@/domain/rewards/visualThemes';
import {
  flushWeeklyMissionHistoryPersistence,
  recordCompletedWeeklyMission,
} from '@/domain/rewards/weeklyMissionHistory';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { reloadUserStateRuntime } from '@/infrastructure/user-state/userStateRuntime';

describe('notifications automatiques Rewards/Routines', () => {
  let database: AppDatabase;
  let received: SyncLocalDataChangedDetail[];
  let listener: (event: Event) => void;

  beforeEach(() => {
    window.localStorage.clear();
    database = new AppDatabase(
      `sportpilot-rewards-sync-notification-${crypto.randomUUID()}`,
    );
    received = [];
    listener = (event) => {
      const detail = syncLocalDataChangedDetail(event);
      if (detail) received.push(detail);
    };
    window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
  });

  afterEach(async () => {
    window.removeEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
    database.close();
    await database.delete();
  });

  it('notifie rewards-routines seulement après les persistances utilisateur réelles', async () => {
    await initializeDatabase(database);

    unlockAchievements(
      ['first-session'],
      '2026-08-19T10:00:00.000Z',
    );
    await flushAchievementStatePersistence();

    unlockVisualThemes(
      ['emerald-focus'],
      '2026-08-19T10:01:00.000Z',
    );
    activateVisualTheme('emerald-focus');
    await flushVisualThemeStatePersistence();

    recordCompletedWeeklyMission(
      '2026-08-17',
      '2026-08-19T10:02:00.000Z',
      new Date(2026, 7, 19),
    );
    await flushWeeklyMissionHistoryPersistence();

    recordRoutineReminderCompletion(
      '2026-08-19',
      'weighIn',
      '2026-08-19T10:03:00.000Z',
    );
    await flushRoutineReminderCompletionPersistence();

    expect(received.length).toBeGreaterThanOrEqual(4);
    expect(received.every(({ domainIds }) =>
      domainIds.length === 1 && domainIds[0] === 'rewards-routines',
    )).toBe(true);

    const reasons = received.map(({ reason }) => reason);
    expect(reasons).toContain('achievement-state-write');
    expect(reasons).toContain('visual-theme-state-write');
    expect(reasons).toContain('weekly-mission-state-write');
    expect(reasons).toContain('routine-reminder-completion-write');
  });

  it('ne transforme pas un reload cloud en nouvelle mutation locale', async () => {
    await initializeDatabase(database);
    received = [];

    await database.earnedAchievements.put({
      id: 'first-session',
      earnedAt: '2026-08-19T11:00:00.000Z',
      updatedAt: '2026-08-19T11:00:00.000Z',
    });

    await reloadUserStateRuntime(database);

    expect(received).toEqual([]);
  });
});
