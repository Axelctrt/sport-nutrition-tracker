import {
  calculateDailyExpenditure,
  type DailyExpenditureInput,
} from '@/domain/calculations/expenditure';
import type { OccupationalActivity } from '@/domain/models/profile';

export const ENERGY_ARCHITECTURE_SHADOW_VERSION = 1;
export const SEDENTARY_BASE_MULTIPLIER = 1.2;

export const OCCUPATIONAL_REFERENCE_STEPS: Readonly<
  Record<OccupationalActivity, number>
> = {
  sedentary: 5_000,
  lightlyActive: 7_000,
  active: 9_000,
  veryActive: 11_000,
};

export const OCCUPATIONAL_MINIMUM_NON_STEP_SHARE: Readonly<
  Record<OccupationalActivity, number>
> = {
  sedentary: 0,
  lightlyActive: 0.25,
  active: 0.4,
  veryActive: 0.5,
};

export type EnergyArchitectureOverlapRisk =
  | 'unassessable'
  | 'negligible'
  | 'possible'
  | 'material';

export interface EnergyArchitectureShadowComparison {
  version: number;
  currentTotalKcal: number;
  candidateTotalKcal: number;
  differenceKcal: number;
  differencePercent: number;
  sedentaryBaseKcal: number;
  currentOccupationalBaseKcal: number;
  fullOccupationalUpliftKcal: number;
  candidateOccupationalResidualKcal: number;
  candidateBaseKcal: number;
  occupationalReferenceSteps: number;
  measuredNonRunningSteps: number;
  measuredAdditionalSteps: number;
  stepCapturedOccupationalShare: number;
  minimumNonStepShare: number;
  possibleOverlapKcal: number;
  overlapRisk: EnergyArchitectureOverlapRisk;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function classifyOverlapRisk(
  totalSteps: number,
  occupationalActivity: OccupationalActivity,
  possibleOverlapKcal: number,
): EnergyArchitectureOverlapRisk {
  if (totalSteps === 0 && occupationalActivity !== 'sedentary') {
    return 'unassessable';
  }
  if (possibleOverlapKcal < 50) return 'negligible';
  if (possibleOverlapKcal < 150) return 'possible';
  return 'material';
}

export function compareEnergyArchitectures(
  input: DailyExpenditureInput,
): EnergyArchitectureShadowComparison {
  const current = calculateDailyExpenditure(input);
  const occupationalActivity = input.profile.occupationalActivity;
  const sedentaryBaseKcal = current.energy.bmrKcal * SEDENTARY_BASE_MULTIPLIER;
  const fullOccupationalUpliftKcal = Math.max(
    0,
    current.energy.occupationalBaseKcal - sedentaryBaseKcal,
  );
  const occupationalReferenceSteps = OCCUPATIONAL_REFERENCE_STEPS[occupationalActivity];
  const referenceAdditionalSteps = Math.max(
    0,
    occupationalReferenceSteps - input.settings.includedBaseSteps,
  );
  const stepCapturedOccupationalShare = fullOccupationalUpliftKcal === 0
    || referenceAdditionalSteps === 0
    ? 0
    : clamp(current.steps.additionalSteps / referenceAdditionalSteps, 0, 1);
  const minimumNonStepShare = OCCUPATIONAL_MINIMUM_NON_STEP_SHARE[occupationalActivity];
  const residualShare = 1 - stepCapturedOccupationalShare * (1 - minimumNonStepShare);
  const candidateOccupationalResidualKcal = fullOccupationalUpliftKcal * residualShare;
  const candidateBaseKcal = sedentaryBaseKcal + candidateOccupationalResidualKcal;
  const nonBaseEnergyKcal = current.energy.walkingKcal
    + current.energy.runningKcal
    + current.energy.swimmingKcal
    + current.energy.strengthTrainingKcal
    + current.energy.otherActivitiesKcal
    + (current.energy.plannedActivitiesKcal ?? 0);
  const candidateTotalKcal = candidateBaseKcal + nonBaseEnergyKcal;
  const differenceKcal = candidateTotalKcal
    - current.energy.totalEstimatedExpenditureKcal;
  const possibleOverlapKcal = Math.max(0, -differenceKcal);
  const differencePercent = current.energy.totalEstimatedExpenditureKcal === 0
    ? 0
    : differenceKcal / current.energy.totalEstimatedExpenditureKcal * 100;

  return {
    version: ENERGY_ARCHITECTURE_SHADOW_VERSION,
    currentTotalKcal: round(current.energy.totalEstimatedExpenditureKcal),
    candidateTotalKcal: round(candidateTotalKcal),
    differenceKcal: round(differenceKcal),
    differencePercent: round(differencePercent, 1),
    sedentaryBaseKcal: round(sedentaryBaseKcal),
    currentOccupationalBaseKcal: round(current.energy.occupationalBaseKcal),
    fullOccupationalUpliftKcal: round(fullOccupationalUpliftKcal),
    candidateOccupationalResidualKcal: round(candidateOccupationalResidualKcal),
    candidateBaseKcal: round(candidateBaseKcal),
    occupationalReferenceSteps,
    measuredNonRunningSteps: current.steps.nonRunningSteps,
    measuredAdditionalSteps: current.steps.additionalSteps,
    stepCapturedOccupationalShare: round(stepCapturedOccupationalShare, 3),
    minimumNonStepShare,
    possibleOverlapKcal: round(possibleOverlapKcal),
    overlapRisk: classifyOverlapRisk(
      input.totalSteps,
      occupationalActivity,
      possibleOverlapKcal,
    ),
  };
}
