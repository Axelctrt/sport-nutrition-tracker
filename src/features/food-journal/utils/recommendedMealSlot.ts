import type { MealSlot } from '@/domain/models/food';

export type MealEntryCounts = Readonly<Partial<Record<MealSlot, number>>>;

function principalOrderForHour(hour: number): readonly MealSlot[] {
  if (hour < 11) return ['breakfast', 'lunch', 'dinner'];
  if (hour < 15) return ['lunch', 'dinner', 'breakfast'];
  return ['dinner', 'lunch', 'breakfast'];
}

export function recommendedMealSlot(
  hour: number,
  entryCounts: MealEntryCounts,
): MealSlot {
  const normalizedHour = Number.isFinite(hour)
    ? Math.min(23, Math.max(0, Math.floor(hour)))
    : 12;
  return principalOrderForHour(normalizedHour).find(
    (slot) => (entryCounts[slot] ?? 0) === 0,
  ) ?? 'snacks';
}
