import type { OccupationalActivity } from '@/domain/models/profile';

export const CALCULATION_VERSION = 1;
export const KCAL_PER_KILOGRAM_OF_BODY_WEIGHT = 7_700;

export const OCCUPATIONAL_ACTIVITY_MULTIPLIERS: Readonly<
  Record<OccupationalActivity, number>
> = {
  sedentary: 1.2,
  lightlyActive: 1.25,
  active: 1.35,
  veryActive: 1.45,
};
