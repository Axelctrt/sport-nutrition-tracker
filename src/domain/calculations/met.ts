import {
  assertNonNegativeNumber,
  assertPositiveNumber,
} from '@/domain/calculations/validation';

export function calculateMetCalories(
  durationMinutes: number,
  met: number,
  weightKg: number,
): number {
  assertNonNegativeNumber(durationMinutes, 'durationMinutes');
  assertNonNegativeNumber(met, 'met');
  assertPositiveNumber(weightKg, 'weightKg');

  return (durationMinutes * met * 3.5 * weightKg) / 200;
}
