import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';

export const DEFAULT_PROFILE_FORM_VALUES: ProfileFormValues = {
  firstName: '',
  sexForEnergyEquation: 'male',
  ageMode: 'age',
  birthDate: '',
  ageYears: 30,
  heightCm: 175,
  initialWeightKg: 70,
  goal: 'maintenance',
  targetWeeklyWeightChangePercent: 0,
  occupationalActivity: 'sedentary',
  dailyStepGoal: 8_000,
  proteinGramsPerKg: 1.8,
  fatGramsPerKg: 0.9,
};
