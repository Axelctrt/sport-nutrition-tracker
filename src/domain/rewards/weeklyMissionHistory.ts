const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKLY_MISSION_HISTORY_STORAGE_KEY =
  "sport-pilot.weekly-mission-history";

export const WEEKLY_MISSION_HISTORY_CHANGED_EVENT =
  "sport-pilot:weekly-mission-history-changed";

export interface CompletedWeeklyMission {
  weekStart: string;
  completedAt: string;
}

export interface WeeklyMissionHistoryState {
  completedWeeks: CompletedWeeklyMission[];
}

export interface WeeklyMissionHistorySnapshot {
  completedWeekCount: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
  latestCompletedWeekStart?: string;
}

export interface RecordCompletedWeeklyMissionResult {
  state: WeeklyMissionHistoryState;
  snapshot: WeeklyMissionHistorySnapshot;
  newlyRecorded?: CompletedWeeklyMission;
}

function createDefaultState(): WeeklyMissionHistoryState {
  return { completedWeeks: [] };
}

function parseDateKey(value: string): Date | undefined {
  if (!DATE_KEY_PATTERN.test(value)) return undefined;

  const [yearText, monthText, dayText] = value.split("-");
  if (!yearText || !monthText || !dayText) return undefined;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(value: Date, amount: number): Date {
  const result = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(value: Date): Date {
  const normalized = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
  const mondayOffset = (normalized.getDay() + 6) % 7;

  return addDays(normalized, -mondayOffset);
}

function differenceInCalendarDays(left: Date, right: Date): number {
  const leftUtc = Date.UTC(
    left.getFullYear(),
    left.getMonth(),
    left.getDate(),
  );
  const rightUtc = Date.UTC(
    right.getFullYear(),
    right.getMonth(),
    right.getDate(),
  );

  return Math.round((leftUtc - rightUtc) / 86_400_000);
}

function isCompletedWeeklyMission(
  value: unknown,
): value is CompletedWeeklyMission {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<CompletedWeeklyMission>;

  return (
    typeof candidate.weekStart === "string" &&
    parseDateKey(candidate.weekStart) !== undefined &&
    typeof candidate.completedAt === "string" &&
    candidate.completedAt.length > 0
  );
}

export function readWeeklyMissionHistoryState(): WeeklyMissionHistoryState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const rawValue = window.localStorage.getItem(
      WEEKLY_MISSION_HISTORY_STORAGE_KEY,
    );
    if (!rawValue) return createDefaultState();

    const parsed = JSON.parse(rawValue) as Partial<WeeklyMissionHistoryState>;
    if (!Array.isArray(parsed.completedWeeks)) return createDefaultState();

    const completedByWeekStart = new Map<string, CompletedWeeklyMission>();

    for (const candidate of parsed.completedWeeks) {
      if (
        isCompletedWeeklyMission(candidate) &&
        !completedByWeekStart.has(candidate.weekStart)
      ) {
        completedByWeekStart.set(candidate.weekStart, candidate);
      }
    }

    return {
      completedWeeks: [...completedByWeekStart.values()].sort((left, right) =>
        left.weekStart.localeCompare(right.weekStart),
      ),
    };
  } catch {
    return createDefaultState();
  }
}

function persistWeeklyMissionHistoryState(
  state: WeeklyMissionHistoryState,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      WEEKLY_MISSION_HISTORY_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // L'historique reste calculable pendant la session si le stockage est refusé.
  }
}

function dispatchHistoryChanged(): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new Event(WEEKLY_MISSION_HISTORY_CHANGED_EVENT),
  );
}

export function buildWeeklyMissionHistorySnapshot(
  state: WeeklyMissionHistoryState,
  referenceDate: Date = new Date(),
): WeeklyMissionHistorySnapshot {
  const completedWeekStarts = [
    ...new Set(
      state.completedWeeks
        .map((entry) => entry.weekStart)
        .filter((weekStart) => parseDateKey(weekStart) !== undefined),
    ),
  ].sort();

  let bestWeeklyStreak = 0;
  let runningStreak = 0;
  let previousWeekStart: Date | undefined;

  for (const weekStart of completedWeekStarts) {
    const currentWeekStart = parseDateKey(weekStart);
    if (!currentWeekStart) continue;

    runningStreak =
      previousWeekStart &&
      differenceInCalendarDays(
        currentWeekStart,
        previousWeekStart,
      ) === 7
        ? runningStreak + 1
        : 1;

    bestWeeklyStreak = Math.max(
      bestWeeklyStreak,
      runningStreak,
    );
    previousWeekStart = currentWeekStart;
  }

  const referenceWeekStart = startOfWeek(referenceDate);
  const referenceWeekStartKey = toDateKey(referenceWeekStart);
  const previousReferenceWeekStartKey = toDateKey(
    addDays(referenceWeekStart, -7),
  );
  const latestCompletedWeekStart = completedWeekStarts.at(-1);
  const completedWeekSet = new Set(completedWeekStarts);

  let currentWeeklyStreak = 0;

  if (
    latestCompletedWeekStart === referenceWeekStartKey ||
    latestCompletedWeekStart === previousReferenceWeekStartKey
  ) {
    let cursor = parseDateKey(latestCompletedWeekStart);

    while (cursor && completedWeekSet.has(toDateKey(cursor))) {
      currentWeeklyStreak += 1;
      cursor = addDays(cursor, -7);
    }
  }

  const snapshot: WeeklyMissionHistorySnapshot = {
    completedWeekCount: completedWeekStarts.length,
    currentWeeklyStreak,
    bestWeeklyStreak,
  };

  return latestCompletedWeekStart
    ? { ...snapshot, latestCompletedWeekStart }
    : snapshot;
}

export function readWeeklyMissionHistorySnapshot(
  referenceDate: Date = new Date(),
): WeeklyMissionHistorySnapshot {
  return buildWeeklyMissionHistorySnapshot(
    readWeeklyMissionHistoryState(),
    referenceDate,
  );
}

export function recordCompletedWeeklyMission(
  weekStart: string,
  completedAt: string = new Date().toISOString(),
  referenceDate: Date = new Date(),
): RecordCompletedWeeklyMissionResult {
  const state = readWeeklyMissionHistoryState();

  if (
    parseDateKey(weekStart) === undefined ||
    state.completedWeeks.some(
      (entry) => entry.weekStart === weekStart,
    )
  ) {
    return {
      state,
      snapshot: buildWeeklyMissionHistorySnapshot(
        state,
        referenceDate,
      ),
    };
  }

  const newlyRecorded: CompletedWeeklyMission = {
    weekStart,
    completedAt,
  };
  const nextState: WeeklyMissionHistoryState = {
    completedWeeks: [...state.completedWeeks, newlyRecorded].sort(
      (left, right) =>
        left.weekStart.localeCompare(right.weekStart),
    ),
  };

  persistWeeklyMissionHistoryState(nextState);
  dispatchHistoryChanged();

  return {
    state: nextState,
    snapshot: buildWeeklyMissionHistorySnapshot(
      nextState,
      referenceDate,
    ),
    newlyRecorded,
  };
}
