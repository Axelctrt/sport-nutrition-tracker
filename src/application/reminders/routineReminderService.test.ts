import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import {
  completeRoutineReminder,
  evaluateRoutineReminder,
  ROUTINE_REMINDER_STORAGE_KEY,
  snoozeRoutineReminder,
  type RoutineReminderDependencies,
} from '@/application/reminders/routineReminderService';
import { createDefaultRoutineReminderPreferences } from '@/domain/reminders/routineReminder';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    read: (key: string) => values.get(key),
  };
}

function createDependencies(): RoutineReminderDependencies & {
  storage: ReturnType<typeof createMemoryStorage>;
} {
  const settings = createDefaultAppSettings();
  const preferences = createDefaultRoutineReminderPreferences();
  preferences.quietHours.enabled = false;
  preferences.rules.weighIn = {
    enabled: true,
    time: '08:00',
    days: [1],
  };
  settings.routineReminderPreferences = preferences;
  const storage = createMemoryStorage();
  const completed = new Set<string>();

  return {
    settings: {
      get: vi.fn().mockResolvedValue(settings),
      update: vi.fn().mockImplementation(async (changes) => ({
        ...settings,
        ...changes,
      })),
    },
    weight: {
      getByDate: vi.fn().mockResolvedValue(undefined),
    },
    food: {
      listEntriesByDate: vi.fn().mockResolvedValue([]),
    },
    activities: {
      listByDate: vi.fn().mockResolvedValue([]),
    },
    workoutSessions: {
      listAll: vi.fn().mockResolvedValue([]),
    },
    readEndurancePlanningState: () => ({ version: 1, sessions: [] }),
    storage,
    completions: {
      isCompleted: (date, type) => completed.has(`${date}:${type}`),
      complete: (date, type) => completed.add(`${date}:${type}`),
    },
    now: () => new Date(2026, 5, 29, 9, 0),
  };
}

describe('routineReminderService', () => {
  it('propose une pesée lorsque la règle est due et aucune pesée n’existe', async () => {
    const dependencies = createDependencies();

    await expect(evaluateRoutineReminder(dependencies)).resolves.toMatchObject({
      type: 'weighIn',
      actionPath: '/weight?date=2026-06-29',
    });
    expect(dependencies.storage.read(ROUTINE_REMINDER_STORAGE_KEY)).toContain('weighIn');
  });

  it('ne propose rien lorsque la pesée du jour existe déjà', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.weight.getByDate).mockResolvedValue({} as never);

    await expect(evaluateRoutineReminder(dependencies)).resolves.toBeNull();
  });

  it('respecte le report puis la validation du rappel', async () => {
    const dependencies = createDependencies();
    const first = await evaluateRoutineReminder(dependencies);
    expect(first?.type).toBe('weighIn');

    snoozeRoutineReminder('weighIn', 60, dependencies);
    dependencies.now = () => new Date(2026, 5, 29, 9, 30);
    await expect(evaluateRoutineReminder(dependencies)).resolves.toBeNull();

    dependencies.now = () => new Date(2026, 5, 29, 10, 1);
    await expect(evaluateRoutineReminder(dependencies)).resolves.toMatchObject({
      type: 'weighIn',
    });

    completeRoutineReminder('weighIn', dependencies);
    await expect(evaluateRoutineReminder(dependencies)).resolves.toBeNull();
  });
});
