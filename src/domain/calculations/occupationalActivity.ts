import { OCCUPATIONAL_ACTIVITY_MULTIPLIERS } from '@/domain/calculations/constants';
import { assertPositiveNumber } from '@/domain/calculations/validation';
import type { OccupationalActivity } from '@/domain/models/profile';

export function calculateOccupationalBaseCalories(
  bmrKcal: number,
  occupationalActivity: OccupationalActivity,
): number {
  assertPositiveNumber(bmrKcal, 'bmrKcal');
  return bmrKcal * OCCUPATIONAL_ACTIVITY_MULTIPLIERS[occupationalActivity];
}
