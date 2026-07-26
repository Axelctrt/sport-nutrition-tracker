import type { EntityId, EntityMetadata, IsoDateTime, LocalDate } from '@/domain/models/common';

export type AdherenceLevel = 'excellent' | 'good' | 'needsStrengthening' | 'insufficient';
export type WeeklyCalibrationDecision = 'keep' | 'increase' | 'decrease';
export type WeeklyReviewDecisionStatus = 'pending' | 'accepted' | 'rejected' | 'notEligible';
export type CalorieAdaptationConfidenceLevel =
  | 'insufficient'
  | 'uncertain'
  | 'usable'
  | 'reliable';
export type CalorieAdaptationDetectedState =
  | 'insufficientData'
  | 'insufficientFoodTracking'
  | 'onTrack'
  | 'temporaryWaterVariation'
  | 'possibleRecomposition'
  | 'conflictingSignals'
  | 'truePlateau'
  | 'targetTooHigh'
  | 'targetTooLow'
  | 'excessiveLoss'
  | 'excessiveGain'
  | 'activityBelowExpected'
  | 'degradedRecovery';

export interface CalorieAdaptationConfidence {
  weight: number;
  food: number;
  activity: number;
  recovery: number;
  overall: number;
  level: CalorieAdaptationConfidenceLevel;
}

export interface CalorieAdaptationAssessment {
  calculationVersion: number;
  analysisStart: LocalDate;
  analysisEnd: LocalDate;
  trackingSpanDays: number;
  weightTrendKgPerWeek?: number;
  waistTrendCmPerWeek?: number;
  averageCalorieDeviationPercent?: number;
  proteinAdherencePercent?: number;
  actualToExpectedStepsPercent?: number;
  weighInCount: number;
  completedFoodDays: number;
  comparableFoodDays: number;
  recordedStepDays: number;
  recoverySignalDays: number;
  recoveryConcernDays: number;
  contextDayCount: number;
  strengthSessionCount: number;
  confidence: CalorieAdaptationConfidence;
  detectedState: CalorieAdaptationDetectedState;
  reasons: string[];
  blockingFactors: string[];
  rawWeightBasedAdjustmentKcal: number;
  proposedAdjustmentKcal: number;
}

export interface WeeklyReview extends EntityMetadata {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  previousWeekStart: LocalDate;
  previousWeekEnd: LocalDate;

  weighInCount: number;
  previousWeighInCount: number;
  trackedFoodDays: number;
  completedFoodDays: number;
  calorieComparableDays: number;

  averageWeightKg?: number;
  previousAverageWeightKg?: number;
  actualWeightChangeKg?: number;
  targetWeightChangeKg: number;

  averageConsumedCaloriesKcal?: number;
  averageTargetCaloriesKcal?: number;
  calorieDeviationPercent?: number;
  calorieAdherencePercent?: number;

  proteinTargetDays: number;
  stepGoalDays: number;
  recordedStepDays: number;

  isCalibrationEligible: boolean;
  ineligibilityReasons: string[];
  rawProposedAdjustmentKcal: number;
  proposedDecision: WeeklyCalibrationDecision;
  proposedAdjustmentKcal: number;
  currentCumulativeAdjustmentKcal: number;
  resultingCumulativeAdjustmentKcal: number;

  adherenceScore: number;
  adherenceLevel: AdherenceLevel;

  adaptation?: CalorieAdaptationAssessment;
  decisionStatus: WeeklyReviewDecisionStatus;
  decidedAt?: IsoDateTime;
}

export interface AcceptedCalorieAdjustment extends EntityMetadata {
  weeklyReviewId: EntityId;
  effectiveFrom: LocalDate;
  adjustmentKcalPerDay: number;
  resultingCumulativeAdjustmentKcal: number;
  status: 'active' | 'reverted';
  revertedAt?: IsoDateTime;
}
