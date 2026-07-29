const DAILY_COMPLETION_STORAGE_KEY = 'sportpilot:daily-completion-reveals:v1';
const MAX_STORED_DATES = 90;

export interface DailyCompletionCandidate {
  checkInComplete: boolean;
  sportPerformed: boolean;
  nutritionComplete: boolean;
  checkOutAlreadyComplete: boolean;
}

type CompletionStorage = Pick<Storage, 'getItem' | 'setItem'>;

function readSeenDates(storage: CompletionStorage): string[] {
  try {
    const value = storage.getItem(DAILY_COMPLETION_STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((date): date is string => (
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ));
  } catch {
    return [];
  }
}

export function shouldCelebrateDailyCompletion({
  checkInComplete,
  sportPerformed,
  nutritionComplete,
  checkOutAlreadyComplete,
}: DailyCompletionCandidate): boolean {
  return !checkOutAlreadyComplete
    && checkInComplete
    && sportPerformed
    && nutritionComplete;
}

export function dailyCompletionRevealWasSeen(
  date: string,
  storage: CompletionStorage = window.localStorage,
): boolean {
  return readSeenDates(storage).includes(date);
}

export function markDailyCompletionRevealSeen(
  date: string,
  storage: CompletionStorage = window.localStorage,
): void {
  const dates = new Set(readSeenDates(storage));
  dates.add(date);
  const retainedDates = [...dates].sort().slice(-MAX_STORED_DATES);
  try {
    storage.setItem(DAILY_COMPLETION_STORAGE_KEY, JSON.stringify(retainedDates));
  } catch {
    // La célébration reste fonctionnelle même si le stockage privé est indisponible.
  }
}
