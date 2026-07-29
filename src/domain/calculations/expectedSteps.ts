import { parseISO, subDays } from 'date-fns';
import type {
  DailySteps,
  ExpectedStepsEstimate,
  ExpectedStepsInput,
} from '@/domain/models/steps';
import { toLocalDate } from '@/shared/utils/dates';

export const EXPECTED_STEPS_OBSERVATION_WINDOW_DAYS = 28;
const MINIMUM_HISTORY_DAYS = 7;
const ESTABLISHED_HISTORY_DAYS = 14;
const MAXIMUM_VALID_STEPS = 100_000;

const profileFallbacks = {
  sedentary: 5_000,
  lightlyActive: 7_000,
  active: 9_000,
  veryActive: 11_000,
} as const;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function roundToHundred(value: number): number {
  return Math.round(value / 100) * 100;
}

function clampSteps(value: number): number {
  return Math.min(MAXIMUM_VALID_STEPS, Math.max(0, roundToHundred(value)));
}

function resolveProfileFallback(input: ExpectedStepsInput): number {
  const profileValue = profileFallbacks[input.occupationalActivity];
  return clampSteps(
    Math.max(input.includedBaseSteps, Math.min(input.stepGoal, profileValue)),
  );
}

function selectHistory(input: ExpectedStepsInput): number[] {
  const latestByDate = new Map<string, DailySteps>();
  const earliestDate = toLocalDate(
    subDays(parseISO(input.date), EXPECTED_STEPS_OBSERVATION_WINDOW_DAYS),
  );

  for (const entry of input.history) {
    if (
      entry.date >= input.date
      || entry.date < earliestDate
      || !Number.isFinite(entry.totalSteps)
      || entry.totalSteps < 0
      || entry.totalSteps > MAXIMUM_VALID_STEPS
    ) {
      continue;
    }

    const current = latestByDate.get(entry.date);
    if (!current || current.updatedAt < entry.updatedAt) {
      latestByDate.set(entry.date, entry);
    }
  }

  return [...latestByDate.values()]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, EXPECTED_STEPS_OBSERVATION_WINDOW_DAYS)
    .map((entry) => entry.totalSteps);
}

function robustHistoryAverage(values: readonly number[]): number {
  const centralValue = median(values);
  const medianAbsoluteDeviation = median(
    values.map((value) => Math.abs(value - centralValue)),
  );
  const maximumDeviation = Math.max(1_500, medianAbsoluteDeviation * 3);
  const filtered = values.filter(
    (value) => Math.abs(value - centralValue) <= maximumDeviation,
  );
  const retained = filtered.length > 0 ? filtered : values;
  return retained.reduce((sum, value) => sum + value, 0) / retained.length;
}

export function estimateExpectedSteps(
  input: ExpectedStepsInput,
): ExpectedStepsEstimate {
  if (
    !Number.isFinite(input.stepGoal)
    || input.stepGoal < 0
    || !Number.isFinite(input.includedBaseSteps)
    || input.includedBaseSteps < 0
  ) {
    throw new Error('Les paramètres de pas attendus sont invalides.');
  }

  const history = selectHistory(input);
  const fallback = resolveProfileFallback(input);
  const base = {
    stepGoal: clampSteps(input.stepGoal),
    observedDayCount: history.length,
    observationWindowDays: EXPECTED_STEPS_OBSERVATION_WINDOW_DAYS,
  };

  if (history.length < MINIMUM_HISTORY_DAYS) {
    return {
      ...base,
      expectedSteps: fallback,
      source: 'profileFallback',
      confidence: 'fallback',
    };
  }

  const historyAverage = robustHistoryAverage(history);
  if (history.length < ESTABLISHED_HISTORY_DAYS) {
    const historyWeight = (history.length - MINIMUM_HISTORY_DAYS + 1)
      / (ESTABLISHED_HISTORY_DAYS - MINIMUM_HISTORY_DAYS + 1);
    return {
      ...base,
      expectedSteps: clampSteps(
        fallback * (1 - historyWeight) + historyAverage * historyWeight,
      ),
      source: 'recentBlend',
      confidence: 'emerging',
    };
  }

  return {
    ...base,
    expectedSteps: clampSteps(historyAverage),
    source: 'recentHistory',
    confidence: 'established',
  };
}
