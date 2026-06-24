import {
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';

export function calculateRunningSteps(
  durationMinutes: number,
  averageCadenceSpm: number,
): number {
  assertNonNegativeNumber(durationMinutes, 'durationMinutes');
  assertNonNegativeNumber(averageCadenceSpm, 'averageCadenceSpm');
  return Math.round(durationMinutes * averageCadenceSpm);
}

export function calculateRunningCalories(
  weightKg: number,
  distanceKm: number,
  kcalPerKgPerKm: number,
): number {
  assertPositiveNumber(weightKg, 'weightKg');
  assertNonNegativeNumber(distanceKm, 'distanceKm');
  assertNonNegativeNumber(kcalPerKgPerKm, 'kcalPerKgPerKm');
  return weightKg * distanceKm * kcalPerKgPerKm;
}

export function calculateRunningPaceSecondsPerKm(
  durationMinutes: number,
  distanceKm: number,
): number {
  assertNonNegativeNumber(durationMinutes, 'durationMinutes');
  assertPositiveNumber(distanceKm, 'distanceKm');
  return (durationMinutes * 60) / distanceKm;
}

export function formatPace(secondsPerUnit: number): string {
  assertNonNegativeNumber(secondsPerUnit, 'secondsPerUnit');

  const roundedSeconds = Math.round(secondsPerUnit);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
