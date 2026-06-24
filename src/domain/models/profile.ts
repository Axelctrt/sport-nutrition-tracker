import type { EntityMetadata, LocalDate } from '@/domain/models/common';

export type SexForEnergyEquation = 'male' | 'female';

export type AgeInformation =
  | {
      mode: 'birthDate';
      birthDate: LocalDate;
    }
  | {
      mode: 'age';
      ageYears: number;
      recordedOn: LocalDate;
    };

export type WeightGoal = 'loss' | 'maintenance' | 'gain';

export type OccupationalActivity =
  | 'sedentary'
  | 'lightlyActive'
  | 'active'
  | 'veryActive';

export interface UserProfile extends EntityMetadata {
  firstName?: string;
  sexForEnergyEquation: SexForEnergyEquation;
  ageInformation: AgeInformation;
  heightCm: number;
  initialWeightKg: number;
  goal: WeightGoal;
  targetWeeklyWeightChangePercent: number;
  occupationalActivity: OccupationalActivity;
  dailyStepGoal: number;
  proteinGramsPerKg: number;
  fatGramsPerKg: number;
}
