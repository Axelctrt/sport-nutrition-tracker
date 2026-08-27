import type {
  CoachNextReview,
  CoachState,
  CoachStateConfidence,
  CoachStateResult,
} from '@/domain/coach/coachState';
import {
  summarizeIntegratedStrengthContext,
  type IntegratedCoachAction,
  type IntegratedCoachDecision,
  type IntegratedStrengthContext,
} from '@/domain/coach/integratedCoachDecision';
import type {
  StrengthPerformanceSnapshot,
  StrengthSchedulePerformance,
} from '@/domain/coach/strengthPerformance';
import type { LocalDate } from '@/domain/models/common';
import type { CalorieAdaptationAssessment, WeeklyReview } from '@/domain/models/weeklyReview';

export const COACH_REVIEW_ACTION_LABELS: Record<IntegratedCoachAction, string> = {
  collectMoreData: 'Compléter les données',
  improveFoodTracking: 'Renforcer le suivi alimentaire',
  prioritizeRecovery: 'Prioriser la récupération',
  reviewActivity: 'Revoir l’activité',
  reviewTraining: 'Revoir l’entraînement',
  monitorTrend: 'Surveiller la tendance',
  maintainPlan: 'Maintenir le plan',
  reviewNutritionTarget: 'Revoir la cible nutritionnelle',
};

export const COACH_REVIEW_STATE_LABELS: Record<CoachState, string> = {
  insufficientData: 'Données encore insuffisantes',
  insufficientFoodTracking: 'Suivi alimentaire à renforcer',
  onTrack: 'Progression conforme',
  temporaryWaterVariation: 'Variation temporaire probable',
  possibleRecomposition: 'Recomposition possible',
  conflictingSignals: 'Signaux à clarifier',
  truePlateau: 'Plateau probable',
  targetTooHigh: 'Cible nutritionnelle probablement trop haute',
  targetTooLow: 'Cible nutritionnelle probablement trop basse',
  excessiveLoss: 'Perte plus rapide que prévu',
  excessiveGain: 'Prise plus rapide que prévu',
  activityBelowExpected: 'Activité sous le niveau attendu',
  degradedRecovery: 'Récupération à prioriser',
};

export const COACH_REVIEW_CONFIDENCE_LABELS: Record<CoachStateConfidence['level'], string> = {
  insufficient: 'Insuffisante',
  uncertain: 'Incertaine',
  usable: 'Exploitable',
  reliable: 'Fiable',
};

export const COACH_REVIEW_STRENGTH_LABELS: Record<IntegratedStrengthContext, string> = {
  insufficient: 'Données insuffisantes',
  progressing: 'En progression',
  stable: 'Stable',
  stagnating: 'En stagnation',
  degrading: 'En baisse',
  mixed: 'Signaux mixtes',
};

export interface CoachReviewSnapshot {
  referenceDate: LocalDate;
  period: {
    weekStart: LocalDate;
    weekEnd: LocalDate;
  };
  diagnostic: {
    state: CoachState;
    label: string;
  };
  confidence: CoachStateConfidence;
  reasons: string[];
  primaryReasons: string[];
  blockingFactors: string[];
  signals: {
    body: {
      weightTrendKgPerWeek?: number;
      waistTrendCmPerWeek?: number;
      weighInCount: number;
    };
    nutrition: {
      averageCalorieDeviationPercent?: number;
      proteinAdherencePercent?: number;
      completedFoodDays: number;
      comparableFoodDays: number;
    };
    activity: {
      actualToExpectedStepsPercent?: number;
      recordedStepDays: number;
    };
    recovery: {
      signalDays: number;
      concernDays: number;
    };
    strength: {
      context: IntegratedStrengthContext;
      exploitableExerciseCount: number;
      schedule: StrengthSchedulePerformance;
    };
  };
  decision: IntegratedCoachDecision;
  plan: {
    action: IntegratedCoachAction;
    label: string;
    proposedNutritionAdjustmentKcal?: number;
    requiresUserAcceptance: boolean;
  };
  nextReview: CoachNextReview;
  calorieAssessment: CalorieAdaptationAssessment;
}

export interface CoachReviewAnalysis {
  coachStateResult: CoachStateResult;
  strengthPerformance: StrengthPerformanceSnapshot;
  calorieAssessment: CalorieAdaptationAssessment;
  decision: IntegratedCoachDecision;
}

const TECHNICAL_REASON_PREFIXES = [
  'coachState:',
  'strengthContext:',
  'strengthScheduleSkipped:',
  'strengthScheduleOverdue:',
  'strengthScheduleAbandoned:',
] as const;

function isUserReason(reason: string): boolean {
  return !TECHNICAL_REASON_PREFIXES.some((prefix) => reason.startsWith(prefix));
}

function uniqueUserReasons(reasons: readonly string[]): string[] {
  return [...new Set(
    reasons
      .map((reason) => reason.trim())
      .filter((reason) => reason.length > 0)
      .filter(isUserReason),
  )];
}

function strengthReason(context: IntegratedStrengthContext): string {
  switch (context) {
    case 'insufficient': return 'Les données de musculation sont encore insuffisantes.';
    case 'progressing': return 'Les performances de musculation progressent.';
    case 'stable': return 'Les performances de musculation sont stables.';
    case 'stagnating': return 'Les performances de musculation stagnent.';
    case 'degrading': return 'Les performances de musculation sont en baisse.';
    case 'mixed': return 'Les performances de musculation présentent des signaux mixtes.';
  }
}

export function buildCoachReviewSnapshot(
  period: CoachReviewSnapshot['period'],
  analysis: CoachReviewAnalysis,
): CoachReviewSnapshot {
  const { coachStateResult, strengthPerformance, calorieAssessment, decision } = analysis;
  const strengthContext = summarizeIntegratedStrengthContext(strengthPerformance);
  const reasons = uniqueUserReasons([
    ...coachStateResult.reasons,
    ...calorieAssessment.reasons,
    strengthReason(strengthContext),
  ]);
  const blockingFactors = uniqueUserReasons([
    ...coachStateResult.blockingFactors,
    ...calorieAssessment.blockingFactors,
  ]);
  return {
    referenceDate: decision.referenceDate,
    period,
    diagnostic: {
      state: coachStateResult.state,
      label: COACH_REVIEW_STATE_LABELS[coachStateResult.state],
    },
    confidence: coachStateResult.confidence,
    reasons,
    primaryReasons: reasons.slice(0, 3),
    blockingFactors,
    signals: {
      body: {
        ...(calorieAssessment.weightTrendKgPerWeek === undefined
          ? {}
          : { weightTrendKgPerWeek: calorieAssessment.weightTrendKgPerWeek }),
        ...(calorieAssessment.waistTrendCmPerWeek === undefined
          ? {}
          : { waistTrendCmPerWeek: calorieAssessment.waistTrendCmPerWeek }),
        weighInCount: calorieAssessment.weighInCount,
      },
      nutrition: {
        ...(calorieAssessment.averageCalorieDeviationPercent === undefined
          ? {}
          : { averageCalorieDeviationPercent: calorieAssessment.averageCalorieDeviationPercent }),
        ...(calorieAssessment.proteinAdherencePercent === undefined
          ? {}
          : { proteinAdherencePercent: calorieAssessment.proteinAdherencePercent }),
        completedFoodDays: calorieAssessment.completedFoodDays,
        comparableFoodDays: calorieAssessment.comparableFoodDays,
      },
      activity: {
        ...(calorieAssessment.actualToExpectedStepsPercent === undefined
          ? {}
          : { actualToExpectedStepsPercent: calorieAssessment.actualToExpectedStepsPercent }),
        recordedStepDays: calorieAssessment.recordedStepDays,
      },
      recovery: {
        signalDays: calorieAssessment.recoverySignalDays,
        concernDays: calorieAssessment.recoveryConcernDays,
      },
      strength: {
        context: strengthContext,
        exploitableExerciseCount: strengthPerformance.exercises.filter(
          ({ trend }) => trend !== 'insufficientData',
        ).length,
        schedule: strengthPerformance.schedule,
      },
    },
    decision,
    plan: {
      action: decision.primaryAction,
      label: COACH_REVIEW_ACTION_LABELS[decision.primaryAction],
      ...(decision.proposedNutritionAdjustmentKcal === undefined
        ? {}
        : { proposedNutritionAdjustmentKcal: decision.proposedNutritionAdjustmentKcal }),
      requiresUserAcceptance: decision.requiresUserAcceptance,
    },
    nextReview: decision.nextReview,
    calorieAssessment,
  };
}

export function canAcceptCoachWeeklyReview(
  snapshot: CoachReviewSnapshot | undefined,
  review: WeeklyReview,
): boolean {
  const candidate = snapshot?.decision.proposedNutritionAdjustmentKcal;
  return snapshot?.decision.primaryAction === 'reviewNutritionTarget'
    && snapshot.decision.requiresUserAcceptance
    && candidate !== undefined
    && candidate !== 0
    && review.decisionStatus === 'pending'
    && review.proposedAdjustmentKcal === candidate;
}
