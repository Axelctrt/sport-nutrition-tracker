import { assertNonNegativeNumber, assertPositiveNumber } from '@/domain/calculations/validation';

export function calculateSwimmingPaceSecondsPer100Meters(
  durationMinutes: number,
  distanceMeters: number,
): number {
  assertNonNegativeNumber(durationMinutes, 'durationMinutes');
  assertPositiveNumber(distanceMeters, 'distanceMeters');

  return (durationMinutes * 60) / (distanceMeters / 100);
}
