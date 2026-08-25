import { differenceInCalendarDays, parseISO } from 'date-fns';
import type {
  CoachState,
  CoachStateAnalysis,
  CoachStateConfidenceLevel,
} from '@/domain/coach/coachState';
import type { CoachSignalEvidence } from '@/domain/coach/coachSignalEvidence';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type { WeightGoal } from '@/domain/models/profile';
import {
  CALORIE_ADAPTATION_MINIMUM_TRACKING_DAYS,
  CALORIE_ADAPTATION_WINDOW_DAYS,
} from '@/domain/reviews/calorieAdaptationAssessment';

const DAYS_PER_WEEK = 7;
const MINIMUM_WEIGH_INS = 6;
const MINIMUM_COMPLETED_FOOD_DAYS = 10;
const MAXIMUM_CALORIE_DEVIATION_PERCENT = 15;
const MINIMUM_RECOVERY_CONFIDENCE = 45;

interface TrendPoint {
  date: string;
  value: number;
}

export interface ResolveCoachStateInput {
  observations: readonly CoachStateObservation[];
  goal: WeightGoal;
  targetWeeklyWeightChangeKg: number;
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

function calculateWeeklyTrend(points: readonly TrendPoint[]): number | undefined {
  if (points.length < 2) return undefined;
  const ordered = [...points].sort((left, right) => left.date.localeCompare(right.date));
  const firstDate = parseISO(ordered[0]!.date);
  const values = ordered.map((point) => ({
    x: differenceInCalendarDays(parseISO(point.date), firstDate),
    y: point.value,
  }));
  const averageX = average(values.map(({ x }) => x))!;
  const averageY = average(values.map(({ y }) => y))!;
  const denominator = values.reduce((total, { x }) => total + (x - averageX) ** 2, 0);
  if (denominator === 0) return undefined;
  const slopePerDay = values.reduce(
    (total, { x, y }) => total + (x - averageX) * (y - averageY),
    0,
  ) / denominator;
  return round(slopePerDay * DAYS_PER_WEEK, 2);
}

function confidenceLevel(score: number): CoachStateConfidenceLevel {
  if (score < 45) return 'insufficient';
  if (score < 65) return 'uncertain';
  if (score < 80) return 'usable';
  return 'reliable';
}

function isConfirmedEvidence(evidence: CoachSignalEvidence<unknown> | undefined): boolean {
  return evidence?.provenance === 'userReported' && evidence.confidence === 'confirmed';
}

function isRecoveryConcern(observation: CoachStateObservation): boolean {
  return (
    (isConfirmedEvidence(observation.hunger) && observation.hunger?.value === 'high')
    || (isConfirmedEvidence(observation.energy) && observation.energy?.value === 'low')
    || (isConfirmedEvidence(observation.readiness) && observation.readiness?.value === 'low')
    || (isConfirmedEvidence(observation.sleepQuality) && observation.sleepQuality?.value === 'poor')
  );
}

function hasConfirmedRecoverySignal(observation: CoachStateObservation): boolean {
  return [
    observation.hunger,
    observation.energy,
    observation.readiness,
    observation.sleepQuality,
  ].some(isConfirmedEvidence);
}

function describeState(
  state: CoachState,
  weightTrendKgPerWeek: number | undefined,
  targetWeightChangeKg: number,
): string {
  const trend = weightTrendKgPerWeek === undefined
    ? undefined
    : `${weightTrendKgPerWeek > 0 ? '+' : ''}${weightTrendKgPerWeek.toLocaleString('fr-FR')} kg/semaine`;
  const target = `${targetWeightChangeKg > 0 ? '+' : ''}${targetWeightChangeKg.toLocaleString('fr-FR')} kg/semaine`;
  const labels: Record<CoachState, string> = {
    insufficientData: 'La durée ou la densité des signaux confirmés ne permet pas encore une analyse fiable.',
    insufficientFoodTracking: 'Le journal alimentaire est encore trop incomplet pour interpréter la cible.',
    onTrack: `La tendance${trend ? ` (${trend})` : ''} reste cohérente avec l’objectif (${target}).`,
    temporaryWaterVariation: 'Des circonstances temporaires peuvent expliquer la variation observée.',
    possibleRecomposition: 'Le poids est stable tandis que le tour de taille et les signaux sportifs évoluent favorablement.',
    conflictingSignals: 'Le poids et le tour de taille évoluent dans des directions contradictoires.',
    truePlateau: `La tendance${trend ? ` (${trend})` : ''} reste éloignée de l’objectif malgré un suivi exploitable.`,
    targetTooHigh: 'La tendance suggère que la cible actuelle est probablement trop élevée.',
    targetTooLow: 'La tendance suggère que la cible actuelle est probablement trop faible.',
    excessiveLoss: 'La perte observée est plus rapide que le rythme prévu.',
    excessiveGain: 'La prise observée est plus rapide que le rythme prévu.',
    activityBelowExpected: 'L’activité réelle est nettement inférieure à une baseline exploitable.',
    degradedRecovery: 'Les signaux confirmés indiquent une récupération dégradée.',
  };
  return labels[state];
}

export function resolveCoachState(input: ResolveCoachStateInput): CoachStateAnalysis {
  const observations = [...input.observations]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-CALORIE_ADAPTATION_WINDOW_DAYS);
  const confirmedWeightPoints = excludeIsolatedWeightOutliers(
    observations.flatMap(({ date, weight }) => (
      weight?.provenance === 'userMeasured' && weight.confidence === 'confirmed'
        ? [{ date, value: weight.value }]
        : []
    )),
  );
  const waistPoints = observations.flatMap(({ date, waistCm }) => (
    waistCm === undefined ? [] : [{ date, value: waistCm }]
  ));
  const trackedDates = observations.filter((observation) => (
    (observation.weight?.provenance === 'userMeasured'
      && observation.weight.confidence === 'confirmed')
    || observation.journalComplete
    || observation.actualSteps !== undefined
    || observation.waistCm !== undefined
  )).map(({ date }) => date);
  const spanDays = trackedDates.length === 0
    ? 0
    : differenceInCalendarDays(
        parseISO(trackedDates.at(-1)!),
        parseISO(trackedDates[0]!),
      ) + 1;
  const completeFood = observations.filter(({ journalComplete }) => journalComplete);
  const comparableFood = completeFood.filter(({ consumedCaloriesKcal, targetCaloriesKcal }) => (
    consumedCaloriesKcal !== undefined
    && targetCaloriesKcal !== undefined
    && targetCaloriesKcal > 0
  ));
  const recordedSteps = observations.filter(({ actualSteps }) => actualSteps !== undefined);
  const comparableSteps = observations.filter(({ actualSteps, expectedSteps }) => (
    actualSteps !== undefined
    && expectedSteps.confidence !== 'fallback'
    && expectedSteps.value > 0
  ));
  const recoverySignals = observations.filter(hasConfirmedRecoverySignal);
  const recoveryConcerns = recoverySignals.filter(isRecoveryConcern);
  const contextDayCount = observations.filter(({ hasTemporaryContext }) => hasTemporaryContext).length;
  const strengthSessionCount = observations.reduce(
    (total, observation) => total + observation.strengthSessionCount,
    0,
  );

  const weightTrendKgPerWeek = calculateWeeklyTrend(confirmedWeightPoints);
  const waistTrendCmPerWeek = calculateWeeklyTrend(waistPoints);
  const averageCalorieDeviationPercent = average(comparableFood.map((observation) => (
    (observation.consumedCaloriesKcal! - observation.targetCaloriesKcal!)
    / observation.targetCaloriesKcal! * 100
  )));
  const proteinAdherencePercent = completeFood.length === 0
    ? undefined
    : completeFood.filter(({ proteinTargetMet }) => proteinTargetMet).length
      / completeFood.length * 100;
  const actualToExpectedStepsPercent = comparableSteps.length === 0
    ? undefined
    : average(comparableSteps.map(({ actualSteps, expectedSteps }) => (
        actualSteps!.value / expectedSteps.value * 100
      )));

  const weightConfidence = round(100 * (
    clamp(confirmedWeightPoints.length / 8, 0, 1) * 0.7
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
  if (confirmedWeightPoints.length < MINIMUM_WEIGH_INS || weightTrendKgPerWeek === undefined) {
    blockingFactors.push(`Au moins ${MINIMUM_WEIGH_INS} pesées confirmées réparties dans la période sont nécessaires.`);
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

  let state: CoachState = 'onTrack';
  if (
    spanDays < CALORIE_ADAPTATION_MINIMUM_TRACKING_DAYS
    || confirmedWeightPoints.length < MINIMUM_WEIGH_INS
    || weightTrendKgPerWeek === undefined
  ) {
    state = 'insufficientData';
  } else if (
    completeFood.length < MINIMUM_COMPLETED_FOOD_DAYS
    || comparableFood.length < MINIMUM_COMPLETED_FOOD_DAYS
  ) {
    state = 'insufficientFoodTracking';
  } else if (hasContradictoryBodySignals) {
    state = 'conflictingSignals';
  } else if (possibleRecomposition) {
    state = 'possibleRecomposition';
  } else if (
    contextDayCount >= 2
    && targetDelta !== undefined
    && Math.abs(targetDelta) > tolerance
  ) {
    state = 'temporaryWaterVariation';
  } else if (
    recoveryConfidence >= MINIMUM_RECOVERY_CONFIDENCE
    && recoveryConcernRate >= 0.4
  ) {
    state = 'degradedRecovery';
  } else if ((actualToExpectedStepsPercent ?? 100) < 80) {
    state = 'activityBelowExpected';
  } else if (targetDelta !== undefined && Math.abs(targetDelta) > tolerance) {
    if (input.goal === 'loss') {
      state = weightTrendKgPerWeek < input.targetWeeklyWeightChangeKg - tolerance
        ? 'excessiveLoss'
        : weightTrendKgPerWeek > 0.1
          ? 'targetTooHigh'
          : 'truePlateau';
    } else if (input.goal === 'gain') {
      state = weightTrendKgPerWeek > input.targetWeeklyWeightChangeKg + tolerance
        ? 'excessiveGain'
        : weightTrendKgPerWeek < -0.1
          ? 'targetTooLow'
          : 'truePlateau';
    } else {
      state = weightTrendKgPerWeek < -tolerance
        ? 'excessiveLoss'
        : 'excessiveGain';
    }
  }

  const reasons = [
    describeState(state, weightTrendKgPerWeek, input.targetWeeklyWeightChangeKg),
  ];
  if (actualToExpectedStepsPercent !== undefined) {
    reasons.push(`Les pas réels représentent ${round(actualToExpectedStepsPercent)} % des pas attendus.`);
  }
  if (recoverySignals.length > 0) {
    reasons.push(`${recoveryConcerns.length} jour(s) sur ${recoverySignals.length} présentent un signal confirmé de récupération dégradée.`);
  }
  if (contextDayCount > 0) {
    reasons.push(`${contextDayCount} jour(s) comportent un contexte temporaire à interpréter avec prudence.`);
  }

  return {
    state,
    confidence: {
      weight: weightConfidence,
      food: foodConfidence,
      activity: activityConfidence,
      recovery: recoveryConfidence,
      overall: overallConfidence,
      level,
    },
    reasons,
    blockingFactors,
  };
}
