import type { LocalTime } from '@/domain/models/common';

export const ROUTINE_REMINDER_TYPES = [
  'training',
  'weeklyPlanning',
  'nutrition',
  'weighIn',
] as const;

export type RoutineReminderType = (typeof ROUTINE_REMINDER_TYPES)[number];
export type RoutineReminderWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type RoutineReminderSnoozeMinutes = 30 | 60 | 120 | 240;
export type RoutineReminderMaximumPerDay = 1 | 2 | 3;

export interface RoutineReminderRule {
  enabled: boolean;
  time: LocalTime;
  days: RoutineReminderWeekday[];
}

export interface RoutineReminderPreferences {
  rules: Record<RoutineReminderType, RoutineReminderRule>;
  quietHours: {
    enabled: boolean;
    start: LocalTime;
    end: LocalTime;
  };
  snoozeMinutes: RoutineReminderSnoozeMinutes;
  maxPerDay: RoutineReminderMaximumPerDay;
}

const ALL_WEEKDAYS: RoutineReminderWeekday[] = [0, 1, 2, 3, 4, 5, 6];
const VALID_SNOOZE_MINUTES = new Set<number>([30, 60, 120, 240]);
const VALID_MAXIMUMS = new Set<number>([1, 2, 3]);
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ROUTINE_REMINDER_LABELS: Record<RoutineReminderType, string> = {
  training: 'Activité sportive',
  weeklyPlanning: 'Préparation de la semaine',
  nutrition: 'Suivi nutritionnel',
  weighIn: 'Pesée',
};

export function createDefaultRoutineReminderPreferences(): RoutineReminderPreferences {
  return {
    rules: {
      training: {
        enabled: false,
        time: '18:00',
        days: [...ALL_WEEKDAYS],
      },
      weeklyPlanning: {
        enabled: false,
        time: '18:00',
        days: [0],
      },
      nutrition: {
        enabled: false,
        time: '20:00',
        days: [...ALL_WEEKDAYS],
      },
      weighIn: {
        enabled: false,
        time: '08:00',
        days: [1, 3, 5],
      },
    },
    quietHours: {
      enabled: true,
      start: '21:30',
      end: '07:00',
    },
    snoozeMinutes: 60,
    maxPerDay: 2,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTime(value: unknown, fallback: LocalTime): LocalTime {
  return typeof value === 'string' && LOCAL_TIME_PATTERN.test(value)
    ? value
    : fallback;
}

function normalizeDays(
  value: unknown,
  fallback: RoutineReminderWeekday[],
): RoutineReminderWeekday[] {
  if (!Array.isArray(value)) return [...fallback];

  const days = [...new Set(
    value.filter(
      (day): day is RoutineReminderWeekday =>
        Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6,
    ),
  )].sort((left, right) => left - right);

  return days.length > 0 ? days : [...fallback];
}

function normalizeRule(
  value: unknown,
  fallback: RoutineReminderRule,
): RoutineReminderRule {
  if (!isRecord(value)) return { ...fallback, days: [...fallback.days] };

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled,
    time: normalizeTime(value.time, fallback.time),
    days: normalizeDays(value.days, fallback.days),
  };
}

export function normalizeRoutineReminderPreferences(
  value: unknown,
): RoutineReminderPreferences {
  const defaults = createDefaultRoutineReminderPreferences();
  if (!isRecord(value)) return defaults;

  const rules = isRecord(value.rules) ? value.rules : {};
  const quietHours = isRecord(value.quietHours) ? value.quietHours : {};
  const snoozeMinutes = Number(value.snoozeMinutes);
  const maxPerDay = Number(value.maxPerDay);

  return {
    rules: {
      training: normalizeRule(rules.training, defaults.rules.training),
      weeklyPlanning: normalizeRule(
        rules.weeklyPlanning,
        defaults.rules.weeklyPlanning,
      ),
      nutrition: normalizeRule(rules.nutrition, defaults.rules.nutrition),
      weighIn: normalizeRule(rules.weighIn, defaults.rules.weighIn),
    },
    quietHours: {
      enabled:
        typeof quietHours.enabled === 'boolean'
          ? quietHours.enabled
          : defaults.quietHours.enabled,
      start: normalizeTime(quietHours.start, defaults.quietHours.start),
      end: normalizeTime(quietHours.end, defaults.quietHours.end),
    },
    snoozeMinutes: VALID_SNOOZE_MINUTES.has(snoozeMinutes)
      ? (snoozeMinutes as RoutineReminderSnoozeMinutes)
      : defaults.snoozeMinutes,
    maxPerDay: VALID_MAXIMUMS.has(maxPerDay)
      ? (maxPerDay as RoutineReminderMaximumPerDay)
      : defaults.maxPerDay,
  };
}

function timeToMinutes(value: LocalTime): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isRoutineReminderRuleDue(
  rule: RoutineReminderRule,
  now: Date,
): boolean {
  if (!rule.enabled || !rule.days.includes(now.getDay() as RoutineReminderWeekday)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= timeToMinutes(rule.time);
}

export function isRoutineReminderQuietTime(
  preferences: RoutineReminderPreferences,
  now: Date,
): boolean {
  if (!preferences.quietHours.enabled) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(preferences.quietHours.start);
  const endMinutes = timeToMinutes(preferences.quietHours.end);

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
