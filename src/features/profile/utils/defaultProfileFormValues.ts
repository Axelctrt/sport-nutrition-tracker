import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';

function defaultBirthDate(): string {
  const today = new Date();
  const year = today.getFullYear() - 30;
  const month = today.getMonth() + 1;
  const maximumDay = new Date(year, month, 0).getDate();
  const day = Math.min(today.getDate(), maximumDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const DEFAULT_PROFILE_FORM_VALUES: ProfileFormValues = {
  firstName: '',
  sexForEnergyEquation: 'male',
  ageMode: 'birthDate',
  birthDate: defaultBirthDate(),
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
