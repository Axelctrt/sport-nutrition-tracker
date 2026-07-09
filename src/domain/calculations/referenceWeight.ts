import { addDays, parseISO, startOfWeek, subWeeks } from 'date-fns';
import type { LocalDate } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export interface CalendarWeekRange {
  start: LocalDate;
  end: LocalDate;
}

export interface DailyReferenceWeight {
  date: LocalDate;
  weightKg: number;
  entry: WeightEntry;
}

export type ReferenceWeightResolution =
  | {
      source: 'previousWeekAverage';
      weightKg: number;
      period: CalendarWeekRange;
      dailyWeights: DailyReferenceWeight[];
    }
  | {
      source: 'profile';
      weightKg: number;
      period: CalendarWeekRange;
      dailyWeights: [];
    };

function requireLocalDate(value: LocalDate): void {
  if (!isValidLocalDate(value)) {
    throw new Error(`Date locale invalide pour le poids de référence : ${value}`);
  }
}

function isUsableWeightEntry(entry: WeightEntry): boolean {
  return isValidLocalDate(entry.date)
    && Number.isFinite(entry.weightKg)
    && entry.weightKg > 0;
}

function isLaterEntry(candidate: WeightEntry, current: WeightEntry): boolean {
  const updatedAtComparison = candidate.updatedAt.localeCompare(current.updatedAt);
  if (updatedAtComparison !== 0) {
    return updatedAtComparison > 0;
  }

  const createdAtComparison = candidate.createdAt.localeCompare(current.createdAt);
  if (createdAtComparison !== 0) {
    return createdAtComparison > 0;
  }

  return candidate.id.localeCompare(current.id) > 0;
}

export function getPreviousCalendarWeekRange(date: LocalDate): CalendarWeekRange {
  requireLocalDate(date);

  const currentWeekStart = startOfWeek(parseISO(date), WEEK_OPTIONS);
  const previousWeekStart = subWeeks(currentWeekStart, 1);

  return {
    start: toLocalDate(previousWeekStart),
    end: toLocalDate(addDays(previousWeekStart, 6)),
  };
}

export function selectDailyReferenceWeights(
  entries: readonly WeightEntry[],
  period: CalendarWeekRange,
): DailyReferenceWeight[] {
  const latestByDate = new Map<LocalDate, WeightEntry>();

  for (const entry of entries) {
    if (
      !isUsableWeightEntry(entry)
      || entry.date < period.start
      || entry.date > period.end
    ) {
      continue;
    }

    const current = latestByDate.get(entry.date);
    if (!current || isLaterEntry(entry, current)) {
      latestByDate.set(entry.date, entry);
    }
  }

  return [...latestByDate.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((entry) => ({
      date: entry.date,
      weightKg: entry.weightKg,
      entry,
    }));
}

export function resolveReferenceWeight(
  date: LocalDate,
  profileWeightKg: number,
  entries: readonly WeightEntry[],
): ReferenceWeightResolution {
  if (!Number.isFinite(profileWeightKg) || profileWeightKg <= 0) {
    throw new Error('Le poids du profil doit être un nombre strictement positif.');
  }

  const period = getPreviousCalendarWeekRange(date);
  const dailyWeights = selectDailyReferenceWeights(entries, period);

  if (dailyWeights.length === 0) {
    return {
      source: 'profile',
      weightKg: profileWeightKg,
      period,
      dailyWeights: [],
    };
  }

  const totalWeightKg = dailyWeights.reduce(
    (total, dailyWeight) => total + dailyWeight.weightKg,
    0,
  );

  return {
    source: 'previousWeekAverage',
    weightKg: totalWeightKg / dailyWeights.length,
    period,
    dailyWeights,
  };
}
