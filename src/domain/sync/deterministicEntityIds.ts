import type { EntityId, LocalDate } from '@/domain/models/common';
import type { MealSlot } from '@/domain/models/food';

export function weightEntryIdForDate(date: LocalDate): EntityId {
  return `weight:${date}`;
}

export function dailyStepsIdForDate(date: LocalDate): EntityId {
  return `steps:${date}`;
}

export function mealIdForDateAndSlot(
  date: LocalDate,
  slot: MealSlot,
): EntityId {
  return `meal:${date}:${slot}`;
}

export function dailyTargetIdForDate(date: LocalDate): EntityId {
  return `daily-target:${date}`;
}

export function dailyJournalStatusIdForDate(date: LocalDate): EntityId {
  return `journal-status:${date}`;
}

export function weeklyReviewIdForWeekStart(
  weekStart: LocalDate,
): EntityId {
  return `weekly-review:${weekStart}`;
}
