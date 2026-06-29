import {
  createDefaultRoutineReminderPreferences,
  isRoutineReminderQuietTime,
  isRoutineReminderRuleDue,
  normalizeRoutineReminderPreferences,
  type RoutineReminderWeekday,
} from '@/domain/reminders/routineReminder';

describe('routineReminder', () => {
  it('désactive tous les rappels par défaut', () => {
    const preferences = createDefaultRoutineReminderPreferences();

    expect(Object.values(preferences.rules).every((rule) => !rule.enabled)).toBe(true);
    expect(preferences.maxPerDay).toBe(2);
  });

  it('normalise les anciennes préférences et les valeurs invalides', () => {
    const preferences = normalizeRoutineReminderPreferences({
      rules: {
        weighIn: {
          enabled: true,
          time: '99:99',
          days: [1, 1, 8],
        },
      },
      quietHours: {
        enabled: false,
        start: '22:15',
        end: '06:30',
      },
      snoozeMinutes: 999,
      maxPerDay: 9,
    });

    expect(preferences.rules.weighIn).toMatchObject({
      enabled: true,
      time: '08:00',
      days: [1],
    });
    expect(preferences.quietHours).toEqual({
      enabled: false,
      start: '22:15',
      end: '06:30',
    });
    expect(preferences.snoozeMinutes).toBe(60);
    expect(preferences.maxPerDay).toBe(2);
  });

  it('gère les heures calmes qui traversent minuit', () => {
    const preferences = createDefaultRoutineReminderPreferences();

    expect(isRoutineReminderQuietTime(preferences, new Date(2026, 5, 29, 22, 0))).toBe(true);
    expect(isRoutineReminderQuietTime(preferences, new Date(2026, 5, 29, 6, 30))).toBe(true);
    expect(isRoutineReminderQuietTime(preferences, new Date(2026, 5, 29, 12, 0))).toBe(false);
  });

  it('rend une règle exigible uniquement après son heure et le bon jour', () => {
    const preferences = createDefaultRoutineReminderPreferences();
    const rule = {
      ...preferences.rules.weighIn,
      enabled: true,
      days: [1] as RoutineReminderWeekday[],
    };

    expect(isRoutineReminderRuleDue(rule, new Date(2026, 5, 29, 7, 59))).toBe(false);
    expect(isRoutineReminderRuleDue(rule, new Date(2026, 5, 29, 8, 0))).toBe(true);
    expect(isRoutineReminderRuleDue(rule, new Date(2026, 5, 30, 9, 0))).toBe(false);
  });
});
