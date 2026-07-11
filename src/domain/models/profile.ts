import type { EntityMetadata, IsoDateTime, LocalDate } from '@/domain/models/common';
import type { DailyMacroTargets } from '@/domain/models/targets';

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


export type ProfileImpactField =
  | 'sexForEnergyEquation'
  | 'ageInformation'
  | 'heightCm'
  | 'initialWeightKg'
  | 'goal'
  | 'targetWeeklyWeightChangePercent'
  | 'occupationalActivity'
  | 'dailyStepGoal'
  | 'proteinGramsPerKg'
  | 'fatGramsPerKg';

export interface ProfileImpactHistoryEntry {
  id: string;
  changedAt: IsoDateTime;
  effectiveDate: LocalDate;
  changedFields: ProfileImpactField[];
  summary: string;
  beforeTargetCaloriesKcal: number;
  afterTargetCaloriesKcal: number;
  beforeMacros: DailyMacroTargets;
  afterMacros: DailyMacroTargets;
}

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
  profileImpactHistory?: ProfileImpactHistoryEntry[];
}
