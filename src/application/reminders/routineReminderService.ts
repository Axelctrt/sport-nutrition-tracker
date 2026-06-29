import { foodJournalPath, routePaths, weightPath } from '@/app/routePaths';
import type { Activity, ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import {
  isRoutineReminderCompleted,
  recordRoutineReminderCompletion,
  ROUTINE_REMINDER_DEVICE_STORAGE_KEY,
} from '@/domain/reminders/routineReminderCompletionState';
import type { WorkoutSession } from '@/domain/models/strength';
import {
  isRoutineReminderQuietTime,
  isRoutineReminderRuleDue,
  normalizeRoutineReminderPreferences,
  ROUTINE_REMINDER_TYPES,
  type RoutineReminderPreferences,
  type RoutineReminderType,
} from '@/domain/reminders/routineReminder';
import {
  readEndurancePlanningState,
  type EndurancePlanningState,
  type PlannedEnduranceActivityType,
} from '@/domain/planning/endurancePlanningState';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { FoodRepository } from '@/infrastructure/repositories/contracts/FoodRepository';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export const ROUTINE_REMINDER_STORAGE_KEY =
  ROUTINE_REMINDER_DEVICE_STORAGE_KEY;
export const ROUTINE_REMINDER_CHANGED_EVENT = 'sportpilot:routine-reminders-changed';

export interface RoutineReminderCandidate {
  type: RoutineReminderType;
  title: string;
  message: string;
  actionLabel: string;
  actionPath: string;
}

interface RoutineReminderDayState {
  lastShownAt?: Partial<Record<RoutineReminderType, string>>;
  snoozedUntil?: Partial<Record<RoutineReminderType, string>>;
}

interface RoutineReminderLedger {
  version: 1;
  days: Record<LocalDate, RoutineReminderDayState>;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RoutineReminderCompletionGateway {
  isCompleted(date: LocalDate, type: RoutineReminderType): boolean;
  complete(
    date: LocalDate,
    type: RoutineReminderType,
    completedAt: string,
  ): void;
}

const defaultCompletionGateway: RoutineReminderCompletionGateway = {
  isCompleted: isRoutineReminderCompleted,
  complete: recordRoutineReminderCompletion,
};

export interface RoutineReminderDependencies {
  settings: Pick<SettingsRepository, 'get' | 'update'>;
  weight: Pick<WeightRepository, 'getByDate'>;
  food: Pick<FoodRepository, 'listEntriesByDate'>;
  activities: Pick<ActivityRepository, 'listByDate'>;
  workoutSessions: Pick<WorkoutSessionRepository, 'listAll'>;
  readEndurancePlanningState: () => EndurancePlanningState;
  storage?: StorageLike;
  completions?: RoutineReminderCompletionGateway;
  now?: () => Date;
}

const defaultDependencies: RoutineReminderDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  food: repositories.food,
  activities: repositories.activities,
  workoutSessions: repositories.workoutSessions,
  readEndurancePlanningState,
};

function getStorage(dependencies: RoutineReminderDependencies): StorageLike | undefined {
  if (dependencies.storage) return dependencies.storage;
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

function toLocalDate(date: Date): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function emptyLedger(): RoutineReminderLedger {
  return { version: 1, days: {} };
}

function readReminderField(
  value: unknown,
): Partial<Record<RoutineReminderType, string>> | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const result: Partial<Record<RoutineReminderType, string>> = {};

  for (const type of ROUTINE_REMINDER_TYPES) {
    const candidate = (value as Record<string, unknown>)[type];
    if (typeof candidate === 'string' && candidate.length > 0) {
      result[type] = candidate;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function readLedger(storage: StorageLike | undefined): RoutineReminderLedger {
  if (!storage) return emptyLedger();

  try {
    const parsed = JSON.parse(storage.getItem(ROUTINE_REMINDER_STORAGE_KEY) ?? 'null') as {
      version?: unknown;
      days?: unknown;
    } | null;

    if (parsed?.version !== 1 || typeof parsed.days !== 'object' || parsed.days === null) {
      return emptyLedger();
    }

    const days: Record<LocalDate, RoutineReminderDayState> = {};

    for (const [date, rawDay] of Object.entries(parsed.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rawDay || typeof rawDay !== 'object') {
        continue;
      }

      const day = rawDay as Record<string, unknown>;
      const lastShownAt = readReminderField(day.lastShownAt);
      const snoozedUntil = readReminderField(day.snoozedUntil);

      if (lastShownAt || snoozedUntil) {
        days[date as LocalDate] = {
          ...(lastShownAt ? { lastShownAt } : {}),
          ...(snoozedUntil ? { snoozedUntil } : {}),
        };
      }
    }

    return { version: 1, days };
  } catch {
    return emptyLedger();
  }
}

function writeLedger(storage: StorageLike | undefined, ledger: RoutineReminderLedger): void {
  storage?.setItem(ROUTINE_REMINDER_STORAGE_KEY, JSON.stringify(ledger));
}

function ensureDay(
  ledger: RoutineReminderLedger,
  date: LocalDate,
): RoutineReminderDayState {
  const day = ledger.days[date] ?? {};
  ledger.days[date] = day;
  return day;
}

function isSamePlannedActivityType(
  plannedType: PlannedEnduranceActivityType,
  actualType: ActivityType,
): boolean {
  return plannedType === actualType;
}

function getStrengthReferenceDate(session: WorkoutSession): LocalDate {
  return session.plannedDate ?? session.date;
}

function hasOutstandingTraining(
  date: LocalDate,
  activities: Activity[],
  workoutSessions: WorkoutSession[],
  planning: EndurancePlanningState,
): boolean {
  const hasStrength = workoutSessions.some(
    (session) =>
      getStrengthReferenceDate(session) === date
      && (session.status === 'planned' || session.status === 'inProgress'),
  );

  if (hasStrength) return true;

  return planning.sessions.some((planned) => {
    if (planned.date !== date || planned.status !== 'planned') return false;
    return !activities.some(
      (activity) =>
        activity.date === date
        && isSamePlannedActivityType(planned.activityType, activity.type),
    );
  });
}

function hasUpcomingPlan(
  now: Date,
  workoutSessions: WorkoutSession[],
  planning: EndurancePlanningState,
): boolean {
  const from = toLocalDate(addDays(now, 1));
  const to = toLocalDate(addDays(now, 7));
  const isWithinWindow = (date: LocalDate) => date >= from && date <= to;

  return (
    workoutSessions.some(
      (session) =>
        isWithinWindow(getStrengthReferenceDate(session))
        && (session.status === 'planned' || session.status === 'inProgress'),
    )
    || planning.sessions.some(
      (session) =>
        isWithinWindow(session.date) && session.status === 'planned',
    )
  );
}

async function buildCandidate(
  type: RoutineReminderType,
  date: LocalDate,
  now: Date,
  dependencies: RoutineReminderDependencies,
): Promise<RoutineReminderCandidate | null> {
  if (type === 'training') {
    const [activities, workoutSessions] = await Promise.all([
      dependencies.activities.listByDate(date),
      dependencies.workoutSessions.listAll(),
    ]);
    const planning = dependencies.readEndurancePlanningState();

    if (!hasOutstandingTraining(date, activities, workoutSessions, planning)) {
      return null;
    }

    return {
      type,
      title: 'Une séance est prévue aujourd’hui',
      message: 'Ton planning contient encore une activité à réaliser ou à mettre à jour.',
      actionLabel: 'Ouvrir le planning',
      actionPath: routePaths.weeklyPlanning,
    };
  }

  if (type === 'weeklyPlanning') {
    const workoutSessions = await dependencies.workoutSessions.listAll();
    const planning = dependencies.readEndurancePlanningState();

    if (hasUpcomingPlan(now, workoutSessions, planning)) return null;

    return {
      type,
      title: 'Préparer la semaine à venir',
      message: 'Aucune séance n’est encore planifiée pour les sept prochains jours.',
      actionLabel: 'Préparer le planning',
      actionPath: routePaths.weeklyPlanning,
    };
  }

  if (type === 'nutrition') {
    const entries = await dependencies.food.listEntriesByDate(date);
    if (entries.length > 0) return null;

    return {
      type,
      title: 'Suivi nutritionnel du jour',
      message: 'Aucun aliment n’est encore enregistré pour aujourd’hui.',
      actionLabel: 'Ouvrir le journal',
      actionPath: foodJournalPath(date),
    };
  }

  const weight = await dependencies.weight.getByDate(date);
  if (weight) return null;

  return {
    type,
    title: 'Pesée prévue',
    message: 'Aucune pesée n’est enregistrée aujourd’hui.',
    actionLabel: 'Enregistrer une pesée',
    actionPath: weightPath(date),
  };
}

function canShowType(
  type: RoutineReminderType,
  day: RoutineReminderDayState,
  now: Date,
  isCompleted: boolean,
): boolean {
  if (isCompleted) return false;

  const snoozedUntil = day.snoozedUntil?.[type];
  if (snoozedUntil) {
    return new Date(snoozedUntil).getTime() <= now.getTime();
  }

  return !day.lastShownAt?.[type];
}

export async function evaluateRoutineReminder(
  dependencies: RoutineReminderDependencies = defaultDependencies,
): Promise<RoutineReminderCandidate | null> {
  const now = dependencies.now?.() ?? new Date();
  const settings = await dependencies.settings.get();
  const preferences = normalizeRoutineReminderPreferences(
    settings.routineReminderPreferences,
  );

  if (isRoutineReminderQuietTime(preferences, now)) return null;

  const date = toLocalDate(now);
  const storage = getStorage(dependencies);
  const ledger = readLedger(storage);
  const day = ensureDay(ledger, date);
  const completions = dependencies.completions ?? defaultCompletionGateway;
  const shownTypes = new Set(Object.keys(day.lastShownAt ?? {}));

  for (const type of ROUTINE_REMINDER_TYPES) {
    const rule = preferences.rules[type];
    if (
      !isRoutineReminderRuleDue(rule, now) ||
      !canShowType(
        type,
        day,
        now,
        completions.isCompleted(date, type),
      )
    ) {
      continue;
    }
    if (!shownTypes.has(type) && shownTypes.size >= preferences.maxPerDay) {
      continue;
    }

    const candidate = await buildCandidate(type, date, now, dependencies);
    if (!candidate) continue;

    day.lastShownAt = {
      ...day.lastShownAt,
      [type]: now.toISOString(),
    };
    if (day.snoozedUntil?.[type]) {
      day.snoozedUntil = { ...day.snoozedUntil };
      delete day.snoozedUntil[type];
    }
    writeLedger(storage, ledger);
    return candidate;
  }

  return null;
}

function updateDayState(
  dependencies: RoutineReminderDependencies,
  update: (day: RoutineReminderDayState, now: Date) => void,
): void {
  const now = dependencies.now?.() ?? new Date();
  const storage = getStorage(dependencies);
  const ledger = readLedger(storage);
  const day = ensureDay(ledger, toLocalDate(now));
  update(day, now);
  writeLedger(storage, ledger);
  notifyRoutineReminderChanged();
}

export function snoozeRoutineReminder(
  type: RoutineReminderType,
  minutes: number,
  dependencies: RoutineReminderDependencies = defaultDependencies,
): void {
  updateDayState(dependencies, (day, now) => {
    const until = new Date(now.getTime() + minutes * 60_000).toISOString();
    day.snoozedUntil = { ...day.snoozedUntil, [type]: until };
  });
}

export function completeRoutineReminder(
  type: RoutineReminderType,
  dependencies: RoutineReminderDependencies = defaultDependencies,
): void {
  const now = dependencies.now?.() ?? new Date();
  const date = toLocalDate(now);
  const completions = dependencies.completions ?? defaultCompletionGateway;
  completions.complete(date, type, now.toISOString());

  updateDayState(dependencies, (day) => {
    if (day.snoozedUntil?.[type]) {
      day.snoozedUntil = { ...day.snoozedUntil };
      delete day.snoozedUntil[type];
    }
  });
}

export async function disableRoutineReminder(
  type: RoutineReminderType,
  dependencies: RoutineReminderDependencies = defaultDependencies,
): Promise<void> {
  const settings = await dependencies.settings.get();
  const preferences = normalizeRoutineReminderPreferences(
    settings.routineReminderPreferences,
  );
  const nextPreferences: RoutineReminderPreferences = {
    ...preferences,
    rules: {
      ...preferences.rules,
      [type]: {
        ...preferences.rules[type],
        enabled: false,
      },
    },
  };

  await dependencies.settings.update({
    routineReminderPreferences: nextPreferences,
  });
  notifyRoutineReminderChanged();
}

export function notifyRoutineReminderChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ROUTINE_REMINDER_CHANGED_EVENT));
  }
}
