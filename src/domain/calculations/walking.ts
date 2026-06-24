import {
  assertNonNegativeInteger,
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';

export interface AdditionalWalkingInput {
  totalSteps: number;
  runningSteps: number;
  includedBaseSteps: number;
  heightCm: number;
  weightKg: number;
  kcalPerKgPerKm: number;
}

export interface AdditionalWalkingResult {
  totalSteps: number;
  runningSteps: number;
  nonRunningSteps: number;
  additionalSteps: number;
  stepLengthMeters: number;
  additionalDistanceKm: number;
  caloriesKcal: number;
}

export function calculateStepLengthMeters(heightCm: number): number {
  assertPositiveNumber(heightCm, 'heightCm');
  return (heightCm * 0.413) / 100;
}

export function calculateAdditionalWalking({
  totalSteps,
  runningSteps,
  includedBaseSteps,
  heightCm,
  weightKg,
  kcalPerKgPerKm,
}: AdditionalWalkingInput): AdditionalWalkingResult {
  assertNonNegativeInteger(totalSteps, 'totalSteps');
  assertNonNegativeInteger(runningSteps, 'runningSteps');
  assertNonNegativeInteger(includedBaseSteps, 'includedBaseSteps');
  assertPositiveNumber(weightKg, 'weightKg');
  assertNonNegativeNumber(kcalPerKgPerKm, 'kcalPerKgPerKm');

  const nonRunningSteps = Math.max(0, totalSteps - runningSteps);
  const additionalSteps = Math.max(0, nonRunningSteps - includedBaseSteps);
  const stepLengthMeters = calculateStepLengthMeters(heightCm);
  const additionalDistanceKm = (additionalSteps * stepLengthMeters) / 1_000;
  const caloriesKcal = additionalDistanceKm * weightKg * kcalPerKgPerKm;

  return {
    totalSteps,
    runningSteps,
    nonRunningSteps,
    additionalSteps,
    stepLengthMeters,
    additionalDistanceKm,
    caloriesKcal,
  };
}
