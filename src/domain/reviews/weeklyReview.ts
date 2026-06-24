import { addDays, endOfWeek, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { calculateDailyNutrition } from '@/domain/calculations/nutrition';
import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { DailyJournalStatus, FoodEntry } from '@/domain/models/food';
import type { UserProfile } from '@/domain/models/profile';
import type { AppSettings } from '@/domain/models/settings';
import type { DailySteps } from '@/domain/models/steps';
import type { DailyTarget } from '@/domain/models/targets';
import type {
  AdherenceLevel,
  WeeklyCalibrationDecision,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import type { WeightEntry } from '@/domain/models/weight';
import { toLocalDate } from '@/shared/utils/dates';

const WEEK_OPTIONS = { weekStartsOn: 1 as const };
const ENERGY_DENSITY_KCAL_PER_KG = 7_700;
const DAYS_PER_WEEK = 7;
const MINIMUM_WEIGH_INS = 3;
const MINIMUM_COMPLETED_FOOD_DAYS = 4;
const MAXIMUM_CALORIE_DEVIATION_PERCENT = 10;

export interface WeeklyReviewPeriod {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  previousWeekStart: LocalDate;
  previousWeekEnd: LocalDate;
}

export interface WeeklyReviewCalculationInput extends WeeklyReviewPeriod {
  profile: UserProfile;
  settings: AppSettings;
  currentWeights: readonly WeightEntry[];
  previousWeights: readonly WeightEntry[];
  foodEntries: readonly FoodEntry[];
  dailyTargets: readonly DailyTarget[];
  journalStatuses: readonly DailyJournalStatus[];
  dailySteps: readonly DailySteps[];
  currentCumulativeAdjustmentKcal: number;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10;
}

export function resolveWeeklyReviewPeriod(referenceDate: LocalDate): WeeklyReviewPeriod {
  const weekStartDate = startOfWeek(parseISO(referenceDate), WEEK_OPTIONS);
  const previousWeekStartDate = subWeeks(weekStartDate, 1);
  return {
    weekStart: toLocalDate(weekStartDate),
    weekEnd: toLocalDate(endOfWeek(weekStartDate, WEEK_OPTIONS)),
    previousWeekStart: toLocalDate(previousWeekStartDate),
    previousWeekEnd: toLocalDate(endOfWeek(previousWeekStartDate, WEEK_OPTIONS)),
  };
}

export function getDefaultWeeklyReviewReferenceDate(today: LocalDate): LocalDate {
  return toLocalDate(subWeeks(startOfWeek(parseISO(today), WEEK_OPTIONS), 1));
}

function entriesByDate(entries: readonly FoodEntry[]): Map<LocalDate, FoodEntry[]> {
  const grouped = new Map<LocalDate, FoodEntry[]>();
  for (const entry of entries) {
    const current = grouped.get(entry.date) ?? [];
    current.push(entry);
    grouped.set(entry.date, current);
  }
  return grouped;
}

export function calculateAdherenceScore(input: {
  completedFoodDays: number;
  proteinTargetDays: number;
  stepGoalDays: number;
  weighInCount: number;
}): { score: number; level: AdherenceLevel } {
  const foodScore = clamp(input.completedFoodDays / DAYS_PER_WEEK, 0, 1) * 35;
  const proteinDenominator = Math.max(1, input.completedFoodDays);
  const proteinScore = clamp(input.proteinTargetDays / proteinDenominator, 0, 1) * 25;
  const stepsScore = clamp(input.stepGoalDays / DAYS_PER_WEEK, 0, 1) * 25;
  const weighInScore = clamp(input.weighInCount / MINIMUM_WEIGH_INS, 0, 1) * 15;
  const score = Math.round(foodScore + proteinScore + stepsScore + weighInScore);

  let level: AdherenceLevel = 'insufficient';
  if (score >= 85) level = 'excellent';
  else if (score >= 70) level = 'good';
  else if (score >= 50) level = 'needsStrengthening';

  return { score, level };
}

export function calculateCalibrationProposal(input: {
  actualWeightChangeKg: number;
  targetWeightChangeKg: number;
  currentCumulativeAdjustmentKcal: number;
  maximumWeeklyAdjustmentKcal: number;
  maximumCumulativeAdjustmentKcal: number;
}): {
  rawAdjustmentKcal: number;
  proposedAdjustmentKcal: number;
  resultingCumulativeAdjustmentKcal: number;
  decision: WeeklyCalibrationDecision;
} {
  const rawAdjustmentKcal = -(
    input.actualWeightChangeKg - input.targetWeightChangeKg
  ) * ENERGY_DENSITY_KCAL_PER_KG / DAYS_PER_WEEK;
  const weeklyLimited = clamp(
    roundToNearestTen(rawAdjustmentKcal),
    -input.maximumWeeklyAdjustmentKcal,
    input.maximumWeeklyAdjustmentKcal,
  );
  const resultingCumulativeAdjustmentKcal = clamp(
    input.currentCumulativeAdjustmentKcal + weeklyLimited,
    -input.maximumCumulativeAdjustmentKcal,
    input.maximumCumulativeAdjustmentKcal,
  );
  const proposedAdjustmentKcal = roundToNearestTen(
    resultingCumulativeAdjustmentKcal - input.currentCumulativeAdjustmentKcal,
  );

  const decision: WeeklyCalibrationDecision = proposedAdjustmentKcal > 0
    ? 'increase'
    : proposedAdjustmentKcal < 0
      ? 'decrease'
      : 'keep';

  return {
    rawAdjustmentKcal: round(rawAdjustmentKcal, 0),
    proposedAdjustmentKcal,
    resultingCumulativeAdjustmentKcal,
    decision,
  };
}

export function calculateWeeklyReview(
  input: WeeklyReviewCalculationInput,
): NewEntity<WeeklyReview> {
  const averageWeightKg = average(input.currentWeights.map((entry) => entry.weightKg));
  const previousAverageWeightKg = average(input.previousWeights.map((entry) => entry.weightKg));
  const actualWeightChangeKg = averageWeightKg === undefined || previousAverageWeightKg === undefined
    ? undefined
    : averageWeightKg - previousAverageWeightKg;
  const targetReferenceWeight = previousAverageWeightKg ?? averageWeightKg ?? input.profile.initialWeightKg;
  const targetWeightChangeKg = targetReferenceWeight
    * (input.profile.targetWeeklyWeightChangePercent / 100);

  const groupedEntries = entriesByDate(input.foodEntries);
  const targetsByDate = new Map(input.dailyTargets.map((target) => [target.date, target]));
  const completedDates = input.journalStatuses
    .filter((status) => status.isComplete)
    .map((status) => status.date);
  const trackedFoodDays = new Set(input.foodEntries.map((entry) => entry.date)).size;

  const comparableRows = completedDates.flatMap((date) => {
    const target = targetsByDate.get(date);
    const entries = groupedEntries.get(date);
    if (!target || !entries || entries.length === 0) return [];
    return [{ date, consumed: calculateDailyNutrition(entries), target }];
  });

  const averageConsumedCaloriesKcal = average(
    comparableRows.map((row) => row.consumed.caloriesKcal),
  );
  const averageTargetCaloriesKcal = average(
    comparableRows.map((row) => row.target.targetCaloriesKcal),
  );
  const calorieDeviationPercent = averageConsumedCaloriesKcal === undefined
    || averageTargetCaloriesKcal === undefined
    || averageTargetCaloriesKcal <= 0
    ? undefined
    : Math.abs(averageConsumedCaloriesKcal - averageTargetCaloriesKcal)
      / averageTargetCaloriesKcal * 100;
  const calorieAdherencePercent = calorieDeviationPercent === undefined
    ? undefined
    : clamp(100 - calorieDeviationPercent, 0, 100);
  const proteinTargetDays = comparableRows.filter((row) => (
    row.consumed.proteinGrams >= row.target.macros.proteinGrams
  )).length;
  const stepGoalDays = input.dailySteps.filter((entry) => (
    entry.totalSteps >= input.profile.dailyStepGoal
  )).length;

  const ineligibilityReasons: string[] = [];
  if (input.currentWeights.length < MINIMUM_WEIGH_INS) {
    ineligibilityReasons.push(`Au moins ${MINIMUM_WEIGH_INS} pesées sont nécessaires sur la semaine.`);
  }
  if (previousAverageWeightKg === undefined) {
    ineligibilityReasons.push('Une moyenne de poids de la semaine précédente est nécessaire.');
  }
  if (completedDates.length < MINIMUM_COMPLETED_FOOD_DAYS) {
    ineligibilityReasons.push(`Au moins ${MINIMUM_COMPLETED_FOOD_DAYS} journées alimentaires terminées sont nécessaires.`);
  }
  if (comparableRows.length < MINIMUM_COMPLETED_FOOD_DAYS) {
    ineligibilityReasons.push(`Au moins ${MINIMUM_COMPLETED_FOOD_DAYS} journées terminées doivent contenir des aliments et une cible calculée.`);
  }
  if (
    calorieDeviationPercent === undefined
    || calorieDeviationPercent > MAXIMUM_CALORIE_DEVIATION_PERCENT
  ) {
    ineligibilityReasons.push('L’écart entre les calories moyennes consommées et ciblées doit être inférieur ou égal à 10 %.');
  }
  if (actualWeightChangeKg === undefined) {
    ineligibilityReasons.push('L’évolution réelle du poids ne peut pas encore être calculée.');
  }

  const isCalibrationEligible = ineligibilityReasons.length === 0;
  const proposal = isCalibrationEligible && actualWeightChangeKg !== undefined
    ? calculateCalibrationProposal({
        actualWeightChangeKg,
        targetWeightChangeKg,
        currentCumulativeAdjustmentKcal: input.currentCumulativeAdjustmentKcal,
        maximumWeeklyAdjustmentKcal: input.settings.maximumWeeklyAdjustmentKcal,
        maximumCumulativeAdjustmentKcal: input.settings.maximumCumulativeAdjustmentKcal,
      })
    : {
        rawAdjustmentKcal: 0,
        proposedAdjustmentKcal: 0,
        resultingCumulativeAdjustmentKcal: input.currentCumulativeAdjustmentKcal,
        decision: 'keep' as const,
      };
  const adherence = calculateAdherenceScore({
    completedFoodDays: completedDates.length,
    proteinTargetDays,
    stepGoalDays,
    weighInCount: input.currentWeights.length,
  });

  return {
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    previousWeekStart: input.previousWeekStart,
    previousWeekEnd: input.previousWeekEnd,
    weighInCount: input.currentWeights.length,
    previousWeighInCount: input.previousWeights.length,
    trackedFoodDays,
    completedFoodDays: completedDates.length,
    calorieComparableDays: comparableRows.length,
    ...(averageWeightKg === undefined ? {} : { averageWeightKg: round(averageWeightKg, 2) }),
    ...(previousAverageWeightKg === undefined ? {} : { previousAverageWeightKg: round(previousAverageWeightKg, 2) }),
    ...(actualWeightChangeKg === undefined ? {} : { actualWeightChangeKg: round(actualWeightChangeKg, 2) }),
    targetWeightChangeKg: round(targetWeightChangeKg, 2),
    ...(averageConsumedCaloriesKcal === undefined ? {} : { averageConsumedCaloriesKcal: round(averageConsumedCaloriesKcal, 0) }),
    ...(averageTargetCaloriesKcal === undefined ? {} : { averageTargetCaloriesKcal: round(averageTargetCaloriesKcal, 0) }),
    ...(calorieDeviationPercent === undefined ? {} : { calorieDeviationPercent: round(calorieDeviationPercent, 1) }),
    ...(calorieAdherencePercent === undefined ? {} : { calorieAdherencePercent: round(calorieAdherencePercent, 1) }),
    proteinTargetDays,
    stepGoalDays,
    recordedStepDays: input.dailySteps.length,
    isCalibrationEligible,
    ineligibilityReasons,
    rawProposedAdjustmentKcal: proposal.rawAdjustmentKcal,
    proposedDecision: proposal.decision,
    proposedAdjustmentKcal: proposal.proposedAdjustmentKcal,
    currentCumulativeAdjustmentKcal: input.currentCumulativeAdjustmentKcal,
    resultingCumulativeAdjustmentKcal: proposal.resultingCumulativeAdjustmentKcal,
    adherenceScore: adherence.score,
    adherenceLevel: adherence.level,
    decisionStatus: isCalibrationEligible ? 'pending' : 'notEligible',
  };
}

export function getAdjustmentEffectiveDate(review: Pick<WeeklyReview, 'weekEnd'>): LocalDate {
  return toLocalDate(addDays(parseISO(review.weekEnd), 1));
}
