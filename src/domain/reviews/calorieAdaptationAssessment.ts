import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { LocalDate } from '@/domain/models/common';
import type {
  CalorieAdaptationAssessment,
  CalorieAdaptationConfidenceLevel,
  CalorieAdaptationDetectedState,
} from '@/domain/models/weeklyReview';
import type { WeightGoal } from '@/domain/models/profile';

export const CALORIE_ADAPTATION_CALCULATION_VERSION = 1;
export const CALORIE_ADAPTATION_WINDOW_DAYS = 21;
export const CALORIE_ADAPTATION_MINIMUM_TRACKING_DAYS = 14;
export const CALORIE_ADAPTATION_COOLDOWN_DAYS = 14;

const ENERGY_DENSITY_KCAL_PER_KG = 7_700;
const DAYS_PER_WEEK = 7;
const MINIMUM_WEIGH_INS = 6;
const MINIMUM_COMPLETED_FOOD_DAYS = 10;
const MAXIMUM_CALORIE_DEVIATION_PERCENT = 15;

export interface CalorieAdaptationObservation {
  date: LocalDate;
  weightKg?: number;
  waistCm?: number;
  consumedCaloriesKcal?: number;
  targetCaloriesKcal?: number;
  proteinTargetMet?: boolean;
  journalComplete: boolean;
  expectedSteps?: number;
  actualSteps?: number;
  hunger?: 'low' | 'normal' | 'high';
  energy?: 'low' | 'normal' | 'high';
  readiness?: 'low' | 'normal' | 'high';
  sleepQuality?: 'poor' | 'average' | 'good';
  hasTemporaryContext: boolean;
  strengthSessionCount: number;
}

export interface CalculateCalorieAdaptationAssessmentInput {
  analysisStart: LocalDate;
  analysisEnd: LocalDate;
  observations: readonly CalorieAdaptationObservation[];
  goal: WeightGoal;
  targetWeeklyWeightChangeKg: number;
  currentCumulativeAdjustmentKcal: number;
  maximumWeeklyAdjustmentKcal: number;
  maximumCumulativeAdjustmentKcal: number;
  latestAcceptedAdjustmentDate?: LocalDate;
}

interface TrendPoint {
  date: LocalDate;
  value: number;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle];
}

function excludeIsolatedWeightOutliers(points: readonly TrendPoint[]): TrendPoint[] {
  if (points.length < 5) return [...points];
  const center = median(points.map(({ value }) => value))!;
  const medianAbsoluteDeviation = median(
    points.map(({ value }) => Math.abs(value - center)),
  ) ?? 0;
  const maximumDeviation = Math.max(1, medianAbsoluteDeviation * 4);
  return points.filter(({ value }) => Math.abs(value - center) <= maximumDeviation);
}

function trackingSpanDays(observations: readonly CalorieAdaptationObservation[]): number {
  const tracked = observations.filter((observation) => (
    observation.weightKg !== undefined
    || observation.journalComplete
    || observation.actualSteps !== undefined
    || observation.waistCm !== undefined
  ));
  if (tracked.length === 0) return 0;
  const dates = tracked.map(({ date }) => date).sort();
  return differenceInCalendarDays(parseISO(dates.at(-1)!), parseISO(dates[0]!)) + 1;
}

function calculateWeeklyTrend(points: readonly TrendPoint[]): number | undefined {
  if (points.length < 2) return undefined;
  const firstDate = parseISO([...points].sort((left, right) => left.date.localeCompare(right.date))[0]!.date);
  const values = points.map((point) => ({
    x: differenceInCalendarDays(parseISO(point.date), firstDate),
    y: point.value,
  }));
  const meanX = average(values.map(({ x }) => x))!;
  const meanY = average(values.map(({ y }) => y))!;
  const denominator = values.reduce((total, { x }) => total + (x - meanX) ** 2, 0);
  if (denominator === 0) return undefined;
  const slopePerDay = values.reduce(
    (total, { x, y }) => total + (x - meanX) * (y - meanY),
    0,
  ) / denominator;
  return round(slopePerDay * DAYS_PER_WEEK, 2);
}

function confidenceLevel(score: number): CalorieAdaptationConfidenceLevel {
  if (score < 45) return 'insufficient';
  if (score < 65) return 'uncertain';
  if (score < 80) return 'usable';
  return 'reliable';
}

function adjustmentDirection(
  state: CalorieAdaptationDetectedState,
  goal: WeightGoal,
): -1 | 0 | 1 {
  if (state === 'targetTooHigh' || state === 'excessiveGain') return -1;
  if (state === 'targetTooLow' || state === 'excessiveLoss') return 1;
  if (state === 'degradedRecovery' && goal === 'loss') return 1;
  if (state === 'truePlateau') {
    if (goal === 'loss') return -1;
    if (goal === 'gain') return 1;
  }
  return 0;
}

function describeState(
  state: CalorieAdaptationDetectedState,
  weightTrendKgPerWeek: number | undefined,
  targetWeightChangeKg: number,
): string {
  const trend = weightTrendKgPerWeek === undefined
    ? undefined
    : `${weightTrendKgPerWeek > 0 ? '+' : ''}${weightTrendKgPerWeek.toLocaleString('fr-FR')} kg/semaine`;
  const target = `${targetWeightChangeKg > 0 ? '+' : ''}${targetWeightChangeKg.toLocaleString('fr-FR')} kg/semaine`;
  const labels: Record<CalorieAdaptationDetectedState, string> = {
    insufficientData: 'La durée ou la densité de suivi ne permet pas encore une correction fiable.',
    insufficientFoodTracking: 'Le journal alimentaire est encore trop incomplet pour attribuer la tendance à la cible.',
    onTrack: `La tendance${trend ? ` (${trend})` : ''} reste cohérente avec l’objectif (${target}).`,
    temporaryWaterVariation: 'Des circonstances temporaires peuvent expliquer une partie de la variation observée.',
    possibleRecomposition: 'Le poids est stable tandis que le tour de taille et la régularité sportive évoluent favorablement.',
    conflictingSignals: 'Le poids et le tour de taille évoluent dans des directions contradictoires.',
    truePlateau: `La tendance${trend ? ` (${trend})` : ''} reste éloignée de l’objectif malgré un suivi exploitable.`,
    targetTooHigh: 'La tendance suggère que la cible actuelle est probablement trop élevée.',
    targetTooLow: 'La tendance suggère que la cible actuelle est probablement trop faible.',
    excessiveLoss: 'La perte observée est plus rapide que le rythme prévu.',
    excessiveGain: 'La prise observée est plus rapide que le rythme prévu.',
    activityBelowExpected: 'L’activité réelle est nettement inférieure à l’activité attendue.',
    degradedRecovery: 'La faim, l’énergie, le sommeil ou l’état général signalent une récupération dégradée.',
  };
  return labels[state];
}

export function calculateCalorieAdaptationAssessment(
  input: CalculateCalorieAdaptationAssessmentInput,
): CalorieAdaptationAssessment {
  const observations = [...input.observations]
    .filter(({ date }) => date >= input.analysisStart && date <= input.analysisEnd)
    .sort((left, right) => left.date.localeCompare(right.date));
  const spanDays = trackingSpanDays(observations);
  const weightPoints = excludeIsolatedWeightOutliers(
    observations.flatMap(({ date, weightKg }) => (
      weightKg === undefined ? [] : [{ date, value: weightKg }]
    )),
  );
  const waistPoints = observations.flatMap(({ date, waistCm }) => (
    waistCm === undefined ? [] : [{ date, value: waistCm }]
  ));
  const completeFood = observations.filter(({ journalComplete }) => journalComplete);
  const comparableFood = completeFood.filter(({ consumedCaloriesKcal, targetCaloriesKcal }) => (
    consumedCaloriesKcal !== undefined
    && targetCaloriesKcal !== undefined
    && targetCaloriesKcal > 0
  ));
  const recordedSteps = observations.filter(({ actualSteps }) => actualSteps !== undefined);
  const comparableSteps = observations.filter(({ actualSteps, expectedSteps }) => (
    actualSteps !== undefined && expectedSteps !== undefined && expectedSteps > 0
  ));
  const recoverySignals = observations.filter((observation) => (
    observation.hunger !== undefined
    || observation.energy !== undefined
    || observation.readiness !== undefined
    || observation.sleepQuality !== undefined
  ));
  const recoveryConcerns = recoverySignals.filter((observation) => (
    observation.hunger === 'high'
    || observation.energy === 'low'
    || observation.readiness === 'low'
    || observation.sleepQuality === 'poor'
  ));
  const contextDayCount = observations.filter(({ hasTemporaryContext }) => hasTemporaryContext).length;
  const strengthSessionCount = observations.reduce(
    (total, observation) => total + observation.strengthSessionCount,
    0,
  );

  const weightTrendKgPerWeek = calculateWeeklyTrend(weightPoints);
  const waistTrendCmPerWeek = calculateWeeklyTrend(waistPoints);
  const calorieDeviationValues = comparableFood.map((observation) => (
    (observation.consumedCaloriesKcal! - observation.targetCaloriesKcal!)
    / observation.targetCaloriesKcal! * 100
  ));
  const averageCalorieDeviationPercent = average(calorieDeviationValues);
  const proteinAdherencePercent = completeFood.length === 0
    ? undefined
    : completeFood.filter(({ proteinTargetMet }) => proteinTargetMet).length
      / completeFood.length * 100;
  const actualToExpectedStepsPercent = comparableSteps.length === 0
    ? undefined
    : average(comparableSteps.map(({ actualSteps, expectedSteps }) => (
        actualSteps! / expectedSteps! * 100
      )));

  const weightConfidence = round(100 * (
    clamp(weightPoints.length / 8, 0, 1) * 0.7
    + clamp(spanDays / CALORIE_ADAPTATION_MINIMUM_TRACKING_DAYS, 0, 1) * 0.3
  ));
  const foodConfidence = round(100 * clamp(comparableFood.length / 14, 0, 1));
  const activityConfidence = round(100 * clamp(recordedSteps.length / 14, 0, 1));
  const recoveryConfidence = round(100 * clamp(recoverySignals.length / 10, 0, 1));
  const overallConfidence = round(
    weightConfidence * 0.4
    + foodConfidence * 0.35
    + activityConfidence * 0.15
    + recoveryConfidence * 0.1,
  );
  const level = confidenceLevel(overallConfidence);

  const blockingFactors: string[] = [];
  if (spanDays < CALORIE_ADAPTATION_MINIMUM_TRACKING_DAYS) {
    blockingFactors.push(`Au moins ${CALORIE_ADAPTATION_MINIMUM_TRACKING_DAYS} jours de suivi sont nécessaires.`);
  }
  if (weightPoints.length < MINIMUM_WEIGH_INS || weightTrendKgPerWeek === undefined) {
    blockingFactors.push(`Au moins ${MINIMUM_WEIGH_INS} pesées réparties dans la période sont nécessaires.`);
  }
  if (completeFood.length < MINIMUM_COMPLETED_FOOD_DAYS || comparableFood.length < MINIMUM_COMPLETED_FOOD_DAYS) {
    blockingFactors.push(`Au moins ${MINIMUM_COMPLETED_FOOD_DAYS} journées alimentaires complètes et comparables sont nécessaires.`);
  }
  if (
    averageCalorieDeviationPercent === undefined
    || Math.abs(averageCalorieDeviationPercent) > MAXIMUM_CALORIE_DEVIATION_PERCENT
  ) {
    blockingFactors.push('Les apports suivis doivent rester à moins de 15 % de la cible moyenne.');
  }
  if (level === 'insufficient' || level === 'uncertain') {
    blockingFactors.push('La confiance globale doit atteindre le niveau « tendance exploitable ».');
  }
  if (input.latestAcceptedAdjustmentDate) {
    const daysSinceAdjustment = differenceInCalendarDays(
      parseISO(input.analysisEnd),
      parseISO(input.latestAcceptedAdjustmentDate),
    );
    if (daysSinceAdjustment < CALORIE_ADAPTATION_COOLDOWN_DAYS) {
      blockingFactors.push(`Une correction a déjà été appliquée il y a moins de ${CALORIE_ADAPTATION_COOLDOWN_DAYS} jours.`);
    }
  }

  const targetDelta = weightTrendKgPerWeek === undefined
    ? undefined
    : weightTrendKgPerWeek - input.targetWeeklyWeightChangeKg;
  const tolerance = Math.max(0.1, Math.abs(input.targetWeeklyWeightChangeKg) * 0.35);
  const recoveryConcernRate = recoverySignals.length === 0
    ? 0
    : recoveryConcerns.length / recoverySignals.length;
  const hasContradictoryBodySignals = weightTrendKgPerWeek !== undefined
    && waistTrendCmPerWeek !== undefined
    && (
      (weightTrendKgPerWeek > 0.1 && waistTrendCmPerWeek < -0.1)
      || (weightTrendKgPerWeek < -0.1 && waistTrendCmPerWeek > 0.1)
    );
  const possibleRecomposition = weightTrendKgPerWeek !== undefined
    && Math.abs(weightTrendKgPerWeek) <= 0.1
    && waistTrendCmPerWeek !== undefined
    && waistTrendCmPerWeek < -0.1
    && strengthSessionCount >= 4
    && (proteinAdherencePercent ?? 0) >= 70;

  let detectedState: CalorieAdaptationDetectedState = 'onTrack';
  if (blockingFactors.length > 0 && (weightTrendKgPerWeek === undefined || spanDays < 14)) {
    detectedState = 'insufficientData';
  } else if (completeFood.length < MINIMUM_COMPLETED_FOOD_DAYS) {
    detectedState = 'insufficientFoodTracking';
  } else if (hasContradictoryBodySignals) {
    detectedState = 'conflictingSignals';
  } else if (possibleRecomposition) {
    detectedState = 'possibleRecomposition';
  } else if (
    contextDayCount >= 2
    && targetDelta !== undefined
    && Math.abs(targetDelta) > tolerance
  ) {
    detectedState = 'temporaryWaterVariation';
  } else if (
    recoveryConcernRate >= 0.4
    && targetDelta !== undefined
    && input.goal === 'loss'
    && targetDelta < -tolerance
  ) {
    detectedState = 'degradedRecovery';
  } else if ((actualToExpectedStepsPercent ?? 100) < 80) {
    detectedState = 'activityBelowExpected';
  } else if (targetDelta !== undefined && Math.abs(targetDelta) > tolerance) {
    if (input.goal === 'loss') {
      detectedState = weightTrendKgPerWeek! < input.targetWeeklyWeightChangeKg - tolerance
        ? 'excessiveLoss'
        : weightTrendKgPerWeek! > 0.1
          ? 'targetTooHigh'
          : 'truePlateau';
    } else if (input.goal === 'gain') {
      detectedState = weightTrendKgPerWeek! > input.targetWeeklyWeightChangeKg + tolerance
        ? 'excessiveGain'
        : weightTrendKgPerWeek! < -0.1
          ? 'targetTooLow'
          : 'truePlateau';
    } else {
      detectedState = weightTrendKgPerWeek! < -tolerance
        ? 'excessiveLoss'
        : 'excessiveGain';
    }
  }

  const reasons = [
    describeState(detectedState, weightTrendKgPerWeek, input.targetWeeklyWeightChangeKg),
  ];
  if (actualToExpectedStepsPercent !== undefined) {
    reasons.push(`Les pas réels représentent ${round(actualToExpectedStepsPercent)} % des pas attendus.`);
  }
  if (recoverySignals.length > 0) {
    reasons.push(`${recoveryConcerns.length} jour(s) sur ${recoverySignals.length} présentent un signal de récupération dégradée.`);
  }
  if (contextDayCount > 0) {
    reasons.push(`${contextDayCount} jour(s) comportent un contexte temporaire à interpréter avec prudence.`);
  }

  const canAdjust = blockingFactors.length === 0
    && (level === 'usable' || level === 'reliable')
    && ![
      'insufficientData',
      'insufficientFoodTracking',
      'onTrack',
      'temporaryWaterVariation',
      'possibleRecomposition',
      'conflictingSignals',
      'activityBelowExpected',
    ].includes(detectedState);
  const direction = canAdjust ? adjustmentDirection(detectedState, input.goal) : 0;
  const severity = targetDelta === undefined ? 0 : Math.abs(targetDelta);
  const preferredMagnitude = level === 'reliable' && severity >= 0.25 ? 100 : 50;
  const weeklyMagnitude = Math.min(preferredMagnitude, input.maximumWeeklyAdjustmentKcal);
  const cumulativeTarget = clamp(
    input.currentCumulativeAdjustmentKcal + direction * weeklyMagnitude,
    -input.maximumCumulativeAdjustmentKcal,
    input.maximumCumulativeAdjustmentKcal,
  );
  const proposedAdjustmentKcal = cumulativeTarget - input.currentCumulativeAdjustmentKcal;
  const rawWeightBasedAdjustmentKcal = weightTrendKgPerWeek === undefined
    ? 0
    : round(-(
        weightTrendKgPerWeek - input.targetWeeklyWeightChangeKg
      ) * ENERGY_DENSITY_KCAL_PER_KG / DAYS_PER_WEEK);

  return {
    calculationVersion: CALORIE_ADAPTATION_CALCULATION_VERSION,
    analysisStart: input.analysisStart,
    analysisEnd: input.analysisEnd,
    trackingSpanDays: spanDays,
    ...(weightTrendKgPerWeek === undefined ? {} : { weightTrendKgPerWeek }),
    ...(waistTrendCmPerWeek === undefined ? {} : { waistTrendCmPerWeek }),
    ...(averageCalorieDeviationPercent === undefined
      ? {}
      : { averageCalorieDeviationPercent: round(averageCalorieDeviationPercent, 1) }),
    ...(proteinAdherencePercent === undefined
      ? {}
      : { proteinAdherencePercent: round(proteinAdherencePercent) }),
    ...(actualToExpectedStepsPercent === undefined
      ? {}
      : { actualToExpectedStepsPercent: round(actualToExpectedStepsPercent) }),
    weighInCount: weightPoints.length,
    completedFoodDays: completeFood.length,
    comparableFoodDays: comparableFood.length,
    recordedStepDays: recordedSteps.length,
    recoverySignalDays: recoverySignals.length,
    recoveryConcernDays: recoveryConcerns.length,
    contextDayCount,
    strengthSessionCount,
    confidence: {
      weight: weightConfidence,
      food: foodConfidence,
      activity: activityConfidence,
      recovery: recoveryConfidence,
      overall: overallConfidence,
      level,
    },
    detectedState,
    reasons,
    blockingFactors,
    rawWeightBasedAdjustmentKcal,
    proposedAdjustmentKcal,
  };
}
