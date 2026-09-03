import type {
  CoachNextReview,
  CoachPriority,
  CoachStateResult,
} from '@/domain/coach/coachState';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type { CoachSignalEvidence } from '@/domain/coach/coachSignalEvidence';
import {
  doesCoachSafetyBlockCalorieDecrease,
  type CoachSafetyAssessment,
} from '@/domain/coach/coachSafety';
import type { StrengthPerformanceSnapshot } from '@/domain/coach/strengthPerformance';
import type { LocalDate } from '@/domain/models/common';
import type { CalorieAdaptationAssessment } from '@/domain/models/weeklyReview';
import type { CalorieAdaptationObservation } from '@/domain/reviews/calorieAdaptationAssessment';

export const INTEGRATED_COACH_ACTIONS = [
  'collectMoreData',
  'improveFoodTracking',
  'prioritizeRecovery',
  'reviewActivity',
  'reviewTraining',
  'monitorTrend',
  'maintainPlan',
  'reviewNutritionTarget',
] as const;

export type IntegratedCoachAction = (typeof INTEGRATED_COACH_ACTIONS)[number];

export const INTEGRATED_STRENGTH_CONTEXTS = [
  'insufficient',
  'progressing',
  'stable',
  'stagnating',
  'degrading',
  'mixed',
] as const;

export type IntegratedStrengthContext = (typeof INTEGRATED_STRENGTH_CONTEXTS)[number];

export type IntegratedAdjustmentBlockReason =
  | 'dataQuality'
  | 'recovery'
  | 'foodAdherence'
  | 'activity'
  | 'strengthPerformance'
  | 'safety'
  | 'temporaryContext'
  | 'conflictingSignals';

export interface IntegratedCoachDecision {
  referenceDate: LocalDate;
  primaryAction: IntegratedCoachAction;
  priority: CoachPriority;
  coachState: CoachStateResult['state'];
  strengthContext: IntegratedStrengthContext;
  safetyAssessment: CoachSafetyAssessment;
  reasons: string[];
  blockingFactors: string[];
  proposedNutritionAdjustmentKcal?: number;
  requiresUserAcceptance: boolean;
  blockedAdjustment?: {
    direction: 'increase' | 'decrease';
    reason: IntegratedAdjustmentBlockReason;
  };
  nextReview: CoachNextReview;
}

export interface ResolveIntegratedCoachDecisionInput {
  referenceDate: LocalDate;
  coachStateResult: CoachStateResult;
  strengthPerformance: StrengthPerformanceSnapshot;
  calorieAssessment: CalorieAdaptationAssessment;
  safetyAssessment: CoachSafetyAssessment;
}

function isConfirmedUserReported(
  evidence: CoachSignalEvidence<unknown> | undefined,
): boolean {
  return evidence?.provenance === 'userReported' && evidence.confidence === 'confirmed';
}

function projectConfirmedLevel(
  evidence: CoachSignalEvidence<unknown> | undefined,
): 'low' | 'normal' | 'high' | undefined {
  if (!isConfirmedUserReported(evidence)) return undefined;
  return evidence!.value === 'low'
    || evidence!.value === 'normal'
    || evidence!.value === 'high'
    ? evidence!.value
    : undefined;
}

function projectConfirmedSleepQuality(
  evidence: CoachSignalEvidence<unknown> | undefined,
): 'poor' | 'average' | 'good' | undefined {
  if (!isConfirmedUserReported(evidence)) return undefined;
  return evidence!.value === 'poor'
    || evidence!.value === 'average'
    || evidence!.value === 'good'
    ? evidence!.value
    : undefined;
}

/**
 * Converts provenance-aware C1 observations to the immutable calorie engine input.
 * Missing or fallback evidence stays missing rather than becoming trusted evidence.
 */
export function projectQualifiedCalorieObservations(
  observations: readonly CoachStateObservation[],
): CalorieAdaptationObservation[] {
  return observations.map((observation) => {
    const hunger = projectConfirmedLevel(observation.hunger);
    const energy = projectConfirmedLevel(observation.energy);
    const readiness = projectConfirmedLevel(observation.readiness);
    const sleepQuality = projectConfirmedSleepQuality(observation.sleepQuality);
    return {
      date: observation.date,
      ...(observation.weight?.provenance === 'userMeasured'
        && observation.weight.confidence === 'confirmed'
        ? { weightKg: observation.weight.value }
        : {}),
      ...(observation.waistCm === undefined ? {} : { waistCm: observation.waistCm }),
      ...(observation.consumedCaloriesKcal === undefined
        ? {}
        : { consumedCaloriesKcal: observation.consumedCaloriesKcal }),
      ...(observation.targetCaloriesKcal === undefined
        ? {}
        : { targetCaloriesKcal: observation.targetCaloriesKcal }),
      ...(observation.proteinTargetMet === undefined
        ? {}
        : { proteinTargetMet: observation.proteinTargetMet }),
      journalComplete: observation.journalComplete,
      ...(observation.expectedSteps.confidence === 'fallback'
        ? {}
        : { expectedSteps: observation.expectedSteps.value }),
      ...(observation.actualSteps === undefined
        ? {}
        : { actualSteps: observation.actualSteps.value }),
      ...(hunger === undefined ? {} : { hunger }),
      ...(energy === undefined ? {} : { energy }),
      ...(readiness === undefined ? {} : { readiness }),
      ...(sleepQuality === undefined ? {} : { sleepQuality }),
      hasTemporaryContext: observation.hasTemporaryContext,
      strengthSessionCount: observation.strengthSessionCount,
    };
  });
}

export function summarizeIntegratedStrengthContext(
  snapshot: StrengthPerformanceSnapshot,
): IntegratedStrengthContext {
  const trends = snapshot.exercises
    .map(({ trend }) => trend)
    .filter((trend) => trend !== 'insufficientData');
  if (trends.length === 0) return 'insufficient';
  const progressing = trends.includes('progressing');
  const degrading = trends.includes('degrading');
  if (progressing && degrading) return 'mixed';
  if (degrading) return 'degrading';
  if (progressing) return 'progressing';
  if (trends.includes('stagnating')) return 'stagnating';
  return 'stable';
}

function adjustmentDirection(
  adjustment: number,
): 'increase' | 'decrease' | undefined {
  if (adjustment > 0) return 'increase';
  if (adjustment < 0) return 'decrease';
  return undefined;
}

function strengthReasons(
  snapshot: StrengthPerformanceSnapshot,
  strengthContext: IntegratedStrengthContext,
): string[] {
  const reasons = [`strengthContext:${strengthContext}`];
  const { skippedCount, overdueCount, abandonedCount } = snapshot.schedule;
  if (skippedCount > 0) reasons.push(`strengthScheduleSkipped:${skippedCount}`);
  if (overdueCount > 0) reasons.push(`strengthScheduleOverdue:${overdueCount}`);
  if (abandonedCount > 0) reasons.push(`strengthScheduleAbandoned:${abandonedCount}`);
  return reasons;
}

export function resolveIntegratedCoachDecision({
  referenceDate,
  coachStateResult,
  strengthPerformance,
  calorieAssessment,
  safetyAssessment,
}: ResolveIntegratedCoachDecisionInput): IntegratedCoachDecision {
  const strengthContext = summarizeIntegratedStrengthContext(strengthPerformance);
  const candidate = calorieAssessment.proposedAdjustmentKcal;
  const direction = adjustmentDirection(candidate);
  const reasons = [
    `coachState:${coachStateResult.state}`,
    ...coachStateResult.reasons,
    ...strengthReasons(strengthPerformance, strengthContext),
    ...calorieAssessment.reasons,
    ...safetyAssessment.reasons,
  ];
  const blockingFactors = [
    ...coachStateResult.blockingFactors,
    ...calorieAssessment.blockingFactors,
    ...safetyAssessment.blockingFactors,
  ];
  const base = {
    referenceDate,
    priority: coachStateResult.priority,
    coachState: coachStateResult.state,
    strengthContext,
    safetyAssessment,
    reasons,
    blockingFactors,
    requiresUserAcceptance: false,
    nextReview: coachStateResult.nextReview,
  } satisfies Omit<IntegratedCoachDecision, 'primaryAction'>;
  const blocked = (
    primaryAction: IntegratedCoachAction,
    reason: IntegratedAdjustmentBlockReason,
  ): IntegratedCoachDecision => ({
    ...base,
    primaryAction,
    ...(direction ? { blockedAdjustment: { direction, reason } } : {}),
  });

  if (coachStateResult.state === 'insufficientData') {
    return blocked('collectMoreData', 'dataQuality');
  }
  if (coachStateResult.state === 'insufficientFoodTracking') {
    return blocked('improveFoodTracking', 'foodAdherence');
  }
  if (
    coachStateResult.confidence.level === 'insufficient'
    || coachStateResult.confidence.level === 'uncertain'
  ) {
    return blocked('collectMoreData', 'dataQuality');
  }
  const safetyDomains = safetyAssessment.concerns.map(({ domain }) => domain);
  if (
    candidate < 0
    && doesCoachSafetyBlockCalorieDecrease(safetyAssessment)
  ) {
    return blocked(
      safetyDomains.includes('recovery')
        ? 'prioritizeRecovery'
        : safetyDomains.includes('performance')
          ? 'reviewTraining'
          : 'maintainPlan',
      'safety',
    );
  }
  if (coachStateResult.state === 'degradedRecovery') {
    return candidate > 0
      ? {
          ...base,
          primaryAction: 'prioritizeRecovery',
          proposedNutritionAdjustmentKcal: candidate,
          requiresUserAcceptance: true,
        }
      : blocked('prioritizeRecovery', 'recovery');
  }

  // The existing calorie engine owns the adherence thresholds. C4 consumes its
  // explicit food-tracking result/factor instead of reproducing those limits.
  const foodAdherenceBlocked = calorieAssessment.detectedState === 'insufficientFoodTracking'
    || calorieAssessment.blockingFactors.some((factor) => (
      factor.toLowerCase().includes('apports')
    ));
  if (foodAdherenceBlocked) {
    return blocked(
      calorieAssessment.detectedState === 'insufficientFoodTracking'
        ? 'improveFoodTracking'
        : 'maintainPlan',
      'foodAdherence',
    );
  }
  if (coachStateResult.state === 'activityBelowExpected') {
    return candidate < 0
      ? blocked('reviewActivity', 'activity')
      : { ...base, primaryAction: 'reviewActivity' };
  }
  if (
    candidate < 0
    && (strengthContext === 'degrading' || strengthContext === 'mixed')
  ) {
    return blocked('reviewTraining', 'strengthPerformance');
  }
  if (
    candidate < 0
    && coachStateResult.state === 'truePlateau'
    && strengthContext === 'progressing'
  ) {
    return blocked('maintainPlan', 'strengthPerformance');
  }
  if (
    coachStateResult.state === 'onTrack'
    && (strengthContext === 'degrading' || strengthContext === 'mixed')
  ) {
    return blocked('monitorTrend', 'strengthPerformance');
  }
  if (coachStateResult.state === 'temporaryWaterVariation') {
    return blocked('monitorTrend', 'temporaryContext');
  }
  if (coachStateResult.state === 'conflictingSignals') {
    return blocked('monitorTrend', 'conflictingSignals');
  }
  if (
    coachStateResult.state === 'onTrack'
    || coachStateResult.state === 'possibleRecomposition'
  ) {
    return { ...base, primaryAction: 'maintainPlan' };
  }
  if (candidate === 0) {
    return { ...base, primaryAction: 'monitorTrend' };
  }
  return {
    ...base,
    primaryAction: 'reviewNutritionTarget',
    proposedNutritionAdjustmentKcal: candidate,
    requiresUserAcceptance: true,
  };
}
