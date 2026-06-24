import { addDays, parseISO } from 'date-fns';
import {
  buildHistoryDays,
  buildTwelveWeekAnalytics,
  createTwelveWeekWindow,
} from '@/domain/aggregations/analytics';
import type { HistoryDaySummary, TwelveWeekAnalytics } from '@/domain/models/analytics';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export async function loadTwelveWeekAnalytics(
  referenceDate: LocalDate,
  profile: UserProfile,
): Promise<TwelveWeekAnalytics> {
  const weeks = createTwelveWeekWindow(referenceDate);
  const from = weeks[0]?.weekStart ?? referenceDate;
  const to = weeks.at(-1)?.weekEnd ?? referenceDate;

  const [activities, weights, steps, foodEntries, dailyTargets, journalStatuses] = await Promise.all([
    repositories.activities.listBetween(from, to),
    repositories.weight.listBetween(toLocalDate(addDays(parseISO(from), -6)), to),
    repositories.steps.listBetween(from, to),
    repositories.food.listEntriesBetween(from, to),
    repositories.targets.listTargetsBetween(from, to),
    repositories.food.listJournalStatusesBetween(from, to),
  ]);

  return buildTwelveWeekAnalytics(referenceDate, {
    profile,
    activities,
    weights,
    steps,
    foodEntries,
    dailyTargets,
    journalStatuses,
  });
}

export async function loadHistory(
  from: LocalDate,
  to: LocalDate,
): Promise<HistoryDaySummary[]> {
  const [activities, weights, steps, foodEntries, dailyTargets, journalStatuses] = await Promise.all([
    repositories.activities.listBetween(from, to),
    repositories.weight.listBetween(toLocalDate(addDays(parseISO(from), -6)), to),
    repositories.steps.listBetween(from, to),
    repositories.food.listEntriesBetween(from, to),
    repositories.targets.listTargetsBetween(from, to),
    repositories.food.listJournalStatusesBetween(from, to),
  ]);

  return buildHistoryDays({
    activities,
    weights,
    steps,
    foodEntries,
    dailyTargets,
    journalStatuses,
  });
}
