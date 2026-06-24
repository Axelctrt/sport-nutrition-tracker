import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export function createProfileInput(
  overrides: Partial<NewEntity<UserProfile>> = {},
): NewEntity<UserProfile> {
  return {
    firstName: 'Axel',
    sexForEnergyEquation: 'male',
    ageInformation: {
      mode: 'birthDate',
      birthDate: '2004-01-01',
    },
    heightCm: 177,
    initialWeightKg: 60,
    goal: 'maintenance',
    targetWeeklyWeightChangePercent: 0,
    occupationalActivity: 'sedentary',
    dailyStepGoal: 10_000,
    proteinGramsPerKg: 1.8,
    fatGramsPerKg: 0.9,
    ...overrides,
  };
}
