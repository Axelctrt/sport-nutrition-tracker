import {
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';

export function calculateGrossMetCalories(
  durationMinutes: number,
  met: number,
  weightKg: number,
): number {
  assertNonNegativeNumber(durationMinutes, 'durationMinutes');
  assertNonNegativeNumber(met, 'met');
  assertPositiveNumber(weightKg, 'weightKg');

  return (durationMinutes * met * 3.5 * weightKg) / 200;
}

export function calculateNetMetCalories(
  durationMinutes: number,
  met: number,
  weightKg: number,
): number {
  assertNonNegativeNumber(durationMinutes, 'durationMinutes');
  assertNonNegativeNumber(met, 'met');
  assertPositiveNumber(weightKg, 'weightKg');

  const netMet = Math.max(0, met - 1);
  return (durationMinutes * netMet * 3.5 * weightKg) / 200;
}

/**
 * @deprecated Utiliser calculateNetMetCalories pour les nouvelles estimations.
 * Cette fonction reste exportée pour documenter et tester les anciens snapshots v1.
 */
export const calculateMetCalories = calculateGrossMetCalories;
