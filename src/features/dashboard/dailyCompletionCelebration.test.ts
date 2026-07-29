import {
  dailyCompletionRevealWasSeen,
  markDailyCompletionRevealSeen,
  shouldCelebrateDailyCompletion,
} from '@/features/dashboard/dailyCompletionCelebration';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('dailyCompletionCelebration', () => {
  it('célèbre uniquement le premier check-out d’une journée réellement complète', () => {
    expect(shouldCelebrateDailyCompletion({
      checkInComplete: true,
      sportPerformed: true,
      nutritionComplete: true,
      checkOutAlreadyComplete: false,
    })).toBe(true);

    expect(shouldCelebrateDailyCompletion({
      checkInComplete: true,
      sportPerformed: true,
      nutritionComplete: true,
      checkOutAlreadyComplete: true,
    })).toBe(false);
  });

  it('ne célèbre pas une journée de repos ou une journée incomplète', () => {
    expect(shouldCelebrateDailyCompletion({
      checkInComplete: true,
      sportPerformed: false,
      nutritionComplete: true,
      checkOutAlreadyComplete: false,
    })).toBe(false);

    expect(shouldCelebrateDailyCompletion({
      checkInComplete: true,
      sportPerformed: true,
      nutritionComplete: false,
      checkOutAlreadyComplete: false,
    })).toBe(false);
  });

  it('mémorise la célébration une seule fois par date', () => {
    const storage = createStorage();
    expect(dailyCompletionRevealWasSeen('2026-07-29', storage)).toBe(false);
    markDailyCompletionRevealSeen('2026-07-29', storage);
    expect(dailyCompletionRevealWasSeen('2026-07-29', storage)).toBe(true);
    expect(dailyCompletionRevealWasSeen('2026-07-30', storage)).toBe(false);
  });
});
