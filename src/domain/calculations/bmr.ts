import type { SexForEnergyEquation } from '@/domain/models/profile';
import {
  assertNonNegativeInteger,
  assertPositiveNumber,
} from '@/domain/calculations/validation';

export interface MifflinStJeorInput {
  sex: SexForEnergyEquation;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}

export function calculateMifflinStJeor({
  sex,
  weightKg,
  heightCm,
  ageYears,
}: MifflinStJeorInput): number {
  assertPositiveNumber(weightKg, 'weightKg');
  assertPositiveNumber(heightCm, 'heightCm');
  assertNonNegativeInteger(ageYears, 'ageYears');

  const sexConstant = sex === 'male' ? 5 : -161;
  return (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) + sexConstant;
}
