import {
  dailyJournalStatusIdForDate,
  dailyStepsIdForDate,
  dailyTargetIdForDate,
  mealIdForDateAndSlot,
  weeklyReviewIdForWeekStart,
  weightEntryIdForDate,
} from '@/domain/sync/deterministicEntityIds';

describe('deterministicEntityIds', () => {
  it('génère des identifiants stables pour les entités uniques par date', () => {
    expect(weightEntryIdForDate('2026-06-23')).toBe('weight:2026-06-23');
    expect(dailyStepsIdForDate('2026-06-23')).toBe('steps:2026-06-23');
    expect(dailyTargetIdForDate('2026-06-23')).toBe(
      'daily-target:2026-06-23',
    );
    expect(dailyJournalStatusIdForDate('2026-06-23')).toBe(
      'journal-status:2026-06-23',
    );
    expect(weeklyReviewIdForWeekStart('2026-06-22')).toBe(
      'weekly-review:2026-06-22',
    );
  });

  it('inclut le créneau dans l’identifiant déterministe du repas', () => {
    expect(mealIdForDateAndSlot('2026-06-23', 'lunch')).toBe(
      'meal:2026-06-23:lunch',
    );
    expect(mealIdForDateAndSlot('2026-06-23', 'dinner')).toBe(
      'meal:2026-06-23:dinner',
    );
  });
});
