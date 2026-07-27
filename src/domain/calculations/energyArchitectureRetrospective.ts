import {
  addDays,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns';
import type { LocalDate } from '@/domain/models/common';
import type { WeightEntry } from '@/domain/models/weight';
import { toLocalDate } from '@/shared/utils/dates';

export const ENERGY_ARCHITECTURE_RETROSPECTIVE_VERSION = 1;
export const ENERGY_ARCHITECTURE_RETROSPECTIVE_WINDOW_DAYS = 14;
export const ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS = 28;
export const ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_WEIGH_INS = 6;

const ENERGY_DENSITY_KCAL_PER_KG = 7_700;
const MINIMUM_WEIGHT_SPAN_DAYS = 7;

export type EnergyArchitectureExclusionReason =
  | 'missingCheckOut'
  | 'incompleteFoodJournal'
  | 'missingFoodData'
  | 'missingLinkedSteps'
  | 'missingDailyTarget'
  | 'missingHistoricalInputs';

export type EnergyArchitectureRetrospectiveStatus =
  | 'insufficientData'
  | 'candidateSupported'
  | 'currentSupported'
  | 'inconclusive'
  | 'reviewRequired';

export interface EnergyArchitectureRetrospectiveDay {
  date: LocalDate;
  checkOutCompleted: boolean;
  journalComplete: boolean;
  linkedStepsAvailable: boolean;
  dailyTargetAvailable: boolean;
  historicalInputsAvailable: boolean;
  consumedCaloriesKcal?: number;
  currentExpenditureKcal?: number;
  candidateExpenditureKcal?: number;
  hasTemporaryContext: boolean;
}

export interface EnergyArchitectureExcludedDay {
  date: LocalDate;
  reasons: EnergyArchitectureExclusionReason[];
}

export interface EnergyArchitectureRetrospectiveWindow {
  start: LocalDate;
  end: LocalDate;
  eligibleDayCount: number;
  weighInCount: number;
  weightSpanDays: number;
  contextDayCount: number;
  weightTrendKgPerWeek: number;
  inferredExpenditureKcal: number;
  averageCurrentExpenditureKcal: number;
  averageCandidateExpenditureKcal: number;
  currentResidualKcal: number;
  candidateResidualKcal: number;
  currentAbsoluteErrorKcal: number;
  candidateAbsoluteErrorKcal: number;
  candidateImprovementKcal: number;
  candidateImprovementPercent?: number;
}

export interface EnergyArchitectureRetrospectiveSummary {
  medianCurrentAbsoluteErrorKcal: number;
  medianCandidateAbsoluteErrorKcal: number;
  p90CurrentAbsoluteErrorKcal: number;
  p90CandidateAbsoluteErrorKcal: number;
  candidateMedianImprovementPercent: number;
  maximumDailyDifferenceKcal: number;
  candidateMeetsAccuracyThresholds: boolean;
}

export interface EnergyArchitectureRetrospectiveReport {
  version: number;
  analysisStart: LocalDate;
  analysisEnd: LocalDate;
  totalDayCount: number;
  eligibleDayCount: number;
  excludedDayCount: number;
  weighInCount: number;
  validWindowCount: number;
  exclusionCounts: Record<EnergyArchitectureExclusionReason, number>;
  excludedDays: EnergyArchitectureExcludedDay[];
  windows: EnergyArchitectureRetrospectiveWindow[];
  status: EnergyArchitectureRetrospectiveStatus;
  blockingFactors: string[];
  summary?: EnergyArchitectureRetrospectiveSummary;
}

export interface BuildEnergyArchitectureRetrospectiveInput {
  analysisStart: LocalDate;
  analysisEnd: LocalDate;
  days: readonly EnergyArchitectureRetrospectiveDay[];
  weights: readonly WeightEntry[];
}

interface TrendPoint {
  date: LocalDate;
  value: number;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function percentile(values: readonly number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.ceil(percentileValue * sorted.length) - 1,
  );
  return sorted[index]!;
}

function datesBetween(from: LocalDate, to: LocalDate): LocalDate[] {
  const dates: LocalDate[] = [];
  for (
    let current = parseISO(from);
    current <= parseISO(to);
    current = addDays(current, 1)
  ) {
    dates.push(toLocalDate(current));
  }
  return dates;
}

function exclusionReasons(
  day: EnergyArchitectureRetrospectiveDay | undefined,
): EnergyArchitectureExclusionReason[] {
  const reasons: EnergyArchitectureExclusionReason[] = [];
  if (!day?.checkOutCompleted) reasons.push('missingCheckOut');
  if (!day?.journalComplete) reasons.push('incompleteFoodJournal');
  if (
    day?.consumedCaloriesKcal === undefined
    || day.consumedCaloriesKcal <= 0
  ) {
    reasons.push('missingFoodData');
  }
  if (!day?.linkedStepsAvailable) reasons.push('missingLinkedSteps');
  if (!day?.dailyTargetAvailable) {
    reasons.push('missingDailyTarget');
  } else if (
    !day.historicalInputsAvailable
    || (
      day.linkedStepsAvailable
      && (
        day.currentExpenditureKcal === undefined
        || day.candidateExpenditureKcal === undefined
      )
    )
  ) {
    reasons.push('missingHistoricalInputs');
  }
  return reasons;
}

function excludeIsolatedWeightOutliers(
  points: readonly TrendPoint[],
): TrendPoint[] {
  if (points.length < 5) return [...points];
  const center = median(points.map(({ value }) => value));
  const medianAbsoluteDeviation = median(
    points.map(({ value }) => Math.abs(value - center)),
  );
  const maximumDeviation = Math.max(1, medianAbsoluteDeviation * 4);
  return points.filter(
    ({ value }) => Math.abs(value - center) <= maximumDeviation,
  );
}

function calculateWeeklyWeightTrend(
  points: readonly TrendPoint[],
): number | undefined {
  if (points.length < 2) return undefined;
  const sorted = [...points].sort((left, right) => (
    left.date.localeCompare(right.date)
  ));
  const firstDate = parseISO(sorted[0]!.date);
  const values = sorted.map((point) => ({
    x: differenceInCalendarDays(parseISO(point.date), firstDate),
    y: point.value,
  }));
  const meanX = average(values.map(({ x }) => x));
  const meanY = average(values.map(({ y }) => y));
  const denominator = values.reduce(
    (total, { x }) => total + (x - meanX) ** 2,
    0,
  );
  if (denominator === 0) return undefined;
  const slopePerDay = values.reduce(
    (total, { x, y }) => total + (x - meanX) * (y - meanY),
    0,
  ) / denominator;
  return slopePerDay * 7;
}

function buildWindow(
  start: LocalDate,
  days: readonly EnergyArchitectureRetrospectiveDay[],
  weights: readonly WeightEntry[],
): EnergyArchitectureRetrospectiveWindow | undefined {
  const end = toLocalDate(addDays(
    parseISO(start),
    ENERGY_ARCHITECTURE_RETROSPECTIVE_WINDOW_DAYS - 1,
  ));
  if (days.length !== ENERGY_ARCHITECTURE_RETROSPECTIVE_WINDOW_DAYS) {
    return undefined;
  }

  const windowWeights = excludeIsolatedWeightOutliers(
    weights
      .filter(({ date }) => date >= start && date <= end)
      .map(({ date, weightKg }) => ({ date, value: weightKg })),
  );
  if (
    windowWeights.length
    < ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_WEIGH_INS
  ) {
    return undefined;
  }
  const weightDates = windowWeights.map(({ date }) => date).sort();
  const weightSpanDays = differenceInCalendarDays(
    parseISO(weightDates.at(-1)!),
    parseISO(weightDates[0]!),
  ) + 1;
  if (weightSpanDays < MINIMUM_WEIGHT_SPAN_DAYS) return undefined;

  const weightTrendKgPerWeek = calculateWeeklyWeightTrend(windowWeights);
  if (weightTrendKgPerWeek === undefined) return undefined;

  const averageConsumption = average(
    days.map(({ consumedCaloriesKcal }) => consumedCaloriesKcal!),
  );
  const averageCurrent = average(
    days.map(({ currentExpenditureKcal }) => currentExpenditureKcal!),
  );
  const averageCandidate = average(
    days.map(({ candidateExpenditureKcal }) => candidateExpenditureKcal!),
  );
  const inferredExpenditure = averageConsumption
    - weightTrendKgPerWeek * ENERGY_DENSITY_KCAL_PER_KG / 7;
  const currentResidual = averageCurrent - inferredExpenditure;
  const candidateResidual = averageCandidate - inferredExpenditure;
  const currentAbsoluteError = Math.abs(currentResidual);
  const candidateAbsoluteError = Math.abs(candidateResidual);
  const candidateImprovement = currentAbsoluteError - candidateAbsoluteError;
  const candidateImprovementPercent = currentAbsoluteError < 1
    ? undefined
    : candidateImprovement / currentAbsoluteError * 100;

  return {
    start,
    end,
    eligibleDayCount: days.length,
    weighInCount: windowWeights.length,
    weightSpanDays,
    contextDayCount: days.filter(({ hasTemporaryContext }) => (
      hasTemporaryContext
    )).length,
    weightTrendKgPerWeek: round(weightTrendKgPerWeek, 3),
    inferredExpenditureKcal: round(inferredExpenditure),
    averageCurrentExpenditureKcal: round(averageCurrent),
    averageCandidateExpenditureKcal: round(averageCandidate),
    currentResidualKcal: round(currentResidual),
    candidateResidualKcal: round(candidateResidual),
    currentAbsoluteErrorKcal: round(currentAbsoluteError),
    candidateAbsoluteErrorKcal: round(candidateAbsoluteError),
    candidateImprovementKcal: round(candidateImprovement),
    ...(candidateImprovementPercent === undefined
      ? {}
      : { candidateImprovementPercent: round(candidateImprovementPercent, 1) }),
  };
}

export function buildEnergyArchitectureRetrospective(
  input: BuildEnergyArchitectureRetrospectiveInput,
): EnergyArchitectureRetrospectiveReport {
  const dates = datesBetween(input.analysisStart, input.analysisEnd);
  const indexedDays = new Map(input.days.map((day) => [day.date, day]));
  const exclusionCounts: Record<EnergyArchitectureExclusionReason, number> = {
    missingCheckOut: 0,
    incompleteFoodJournal: 0,
    missingFoodData: 0,
    missingLinkedSteps: 0,
    missingDailyTarget: 0,
    missingHistoricalInputs: 0,
  };
  const excludedDays: EnergyArchitectureExcludedDay[] = [];
  const eligibleDays = new Map<LocalDate, EnergyArchitectureRetrospectiveDay>();

  for (const date of dates) {
    const day = indexedDays.get(date);
    const reasons = exclusionReasons(day);
    if (day && reasons.length === 0) {
      eligibleDays.set(date, day);
      continue;
    }
    for (const reason of reasons) exclusionCounts[reason] += 1;
    excludedDays.push({ date, reasons });
  }

  const windows: EnergyArchitectureRetrospectiveWindow[] = [];
  for (
    let index = 0;
    index <= dates.length - ENERGY_ARCHITECTURE_RETROSPECTIVE_WINDOW_DAYS;
    index += 1
  ) {
    const windowDates = dates.slice(
      index,
      index + ENERGY_ARCHITECTURE_RETROSPECTIVE_WINDOW_DAYS,
    );
    const windowDays = windowDates.flatMap((date) => {
      const day = eligibleDays.get(date);
      return day ? [day] : [];
    });
    const window = buildWindow(windowDates[0]!, windowDays, input.weights);
    if (window) windows.push(window);
  }

  const blockingFactors: string[] = [];
  if (
    eligibleDays.size
    < ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS
  ) {
    blockingFactors.push(
      `At least ${ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS} complete canonical days are required.`,
    );
  }
  if (
    input.weights.length
    < ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_WEIGH_INS
  ) {
    blockingFactors.push(
      `At least ${ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_WEIGH_INS} weigh-ins are required.`,
    );
  }
  if (windows.length === 0) {
    blockingFactors.push(
      'No complete 14-day window has enough distributed weigh-ins.',
    );
  }

  if (windows.length === 0) {
    return {
      version: ENERGY_ARCHITECTURE_RETROSPECTIVE_VERSION,
      analysisStart: input.analysisStart,
      analysisEnd: input.analysisEnd,
      totalDayCount: dates.length,
      eligibleDayCount: eligibleDays.size,
      excludedDayCount: excludedDays.length,
      weighInCount: input.weights.length,
      validWindowCount: 0,
      exclusionCounts,
      excludedDays,
      windows,
      status: 'insufficientData',
      blockingFactors,
    };
  }

  const currentErrors = windows.map(
    ({ currentAbsoluteErrorKcal }) => currentAbsoluteErrorKcal,
  );
  const candidateErrors = windows.map(
    ({ candidateAbsoluteErrorKcal }) => candidateAbsoluteErrorKcal,
  );
  const medianCurrentError = median(currentErrors);
  const medianCandidateError = median(candidateErrors);
  const candidateMedianImprovementPercent = medianCurrentError < 1
    ? medianCandidateError < 1 ? 0 : -100
    : (medianCurrentError - medianCandidateError) / medianCurrentError * 100;
  const p90CurrentError = percentile(currentErrors, 0.9);
  const p90CandidateError = percentile(candidateErrors, 0.9);
  const maximumDailyDifferenceKcal = Math.max(
    ...[...eligibleDays.values()].map((day) => Math.abs(
      day.candidateExpenditureKcal! - day.currentExpenditureKcal!,
    )),
  );
  const hasMinimumEvidence =
    eligibleDays.size
    >= ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS;
  const candidateMeetsAccuracyThresholds =
    hasMinimumEvidence
    && candidateMedianImprovementPercent >= 10
    && p90CandidateError <= p90CurrentError + 50
    && maximumDailyDifferenceKcal <= 250;
  const summary: EnergyArchitectureRetrospectiveSummary = {
    medianCurrentAbsoluteErrorKcal: round(medianCurrentError),
    medianCandidateAbsoluteErrorKcal: round(medianCandidateError),
    p90CurrentAbsoluteErrorKcal: round(p90CurrentError),
    p90CandidateAbsoluteErrorKcal: round(p90CandidateError),
    candidateMedianImprovementPercent: round(
      candidateMedianImprovementPercent,
      1,
    ),
    maximumDailyDifferenceKcal: round(maximumDailyDifferenceKcal),
    candidateMeetsAccuracyThresholds,
  };
  let status: EnergyArchitectureRetrospectiveStatus = 'inconclusive';
  if (!hasMinimumEvidence) {
    status = 'insufficientData';
  } else if (maximumDailyDifferenceKcal > 250) {
    status = 'reviewRequired';
  } else if (candidateMeetsAccuracyThresholds) {
    status = 'candidateSupported';
  } else if (candidateMedianImprovementPercent <= -10) {
    status = 'currentSupported';
  }

  return {
    version: ENERGY_ARCHITECTURE_RETROSPECTIVE_VERSION,
    analysisStart: input.analysisStart,
    analysisEnd: input.analysisEnd,
    totalDayCount: dates.length,
    eligibleDayCount: eligibleDays.size,
    excludedDayCount: excludedDays.length,
    weighInCount: input.weights.length,
    validWindowCount: windows.length,
    exclusionCounts,
    excludedDays,
    windows,
    status,
    blockingFactors,
    summary,
  };
}
