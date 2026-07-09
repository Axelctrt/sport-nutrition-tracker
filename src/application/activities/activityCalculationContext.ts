import {
  getPreviousCalendarWeekRange,
  resolveReferenceWeight,
  type ReferenceWeightResolution,
} from '@/domain/calculations/referenceWeight';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { formatLocalDate } from '@/shared/utils/dates';

export interface ActivityCalculationContext {
  weight: ReferenceWeightResolution;
  sourceLabel: string;
}

export async function resolveActivityCalculationContext(
  date: LocalDate,
  profile: UserProfile,
  weightRepository: Pick<WeightRepository, 'listBetween'> = repositories.weight,
): Promise<ActivityCalculationContext> {
  const period = getPreviousCalendarWeekRange(date);
  const entries = await weightRepository.listBetween(period.start, period.end);
  const weight = resolveReferenceWeight(date, profile.initialWeightKg, entries);

  return {
    weight,
    sourceLabel: weight.source === 'previousWeekAverage'
      ? `moyenne du ${formatLocalDate(weight.period.start)} au ${formatLocalDate(weight.period.end)} (${weight.dailyWeights.length} jour${weight.dailyWeights.length > 1 ? 's' : ''})`
      : `poids du profil — aucune pesée du ${formatLocalDate(weight.period.start)} au ${formatLocalDate(weight.period.end)}`,
  };
}
