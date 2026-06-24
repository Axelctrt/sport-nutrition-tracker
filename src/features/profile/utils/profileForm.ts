import { format } from 'date-fns';
import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';

export function profileToFormValues(profile: UserProfile): ProfileFormValues {
  const ageMode = profile.ageInformation.mode;

  return {
    firstName: profile.firstName ?? '',
    sexForEnergyEquation: profile.sexForEnergyEquation,
    ageMode,
    birthDate: ageMode === 'birthDate' ? profile.ageInformation.birthDate : '',
    ageYears: ageMode === 'age' ? profile.ageInformation.ageYears : 30,
    heightCm: profile.heightCm,
    initialWeightKg: profile.initialWeightKg,
    goal: profile.goal,
    targetWeeklyWeightChangePercent: profile.targetWeeklyWeightChangePercent,
    occupationalActivity: profile.occupationalActivity,
    dailyStepGoal: profile.dailyStepGoal,
    proteinGramsPerKg: profile.proteinGramsPerKg,
    fatGramsPerKg: profile.fatGramsPerKg,
  };
}

export function profileFormValuesToEntity(
  values: ProfileFormValues,
): NewEntity<UserProfile> {
  const firstName = values.firstName.trim();
  const ageInformation: UserProfile['ageInformation'] = values.ageMode === 'birthDate'
    ? {
        mode: 'birthDate',
        birthDate: values.birthDate,
      }
    : {
        mode: 'age',
        ageYears: values.ageYears,
        recordedOn: format(new Date(), 'yyyy-MM-dd'),
      };

  const profile: NewEntity<UserProfile> = {
    sexForEnergyEquation: values.sexForEnergyEquation,
    ageInformation,
    heightCm: values.heightCm,
    initialWeightKg: values.initialWeightKg,
    goal: values.goal,
    targetWeeklyWeightChangePercent: values.targetWeeklyWeightChangePercent,
    occupationalActivity: values.occupationalActivity,
    dailyStepGoal: values.dailyStepGoal,
    proteinGramsPerKg: values.proteinGramsPerKg,
    fatGramsPerKg: values.fatGramsPerKg,
  };

  return firstName ? { ...profile, firstName } : profile;
}
