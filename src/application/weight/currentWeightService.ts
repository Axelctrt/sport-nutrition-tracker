import type { UserProfile } from '@/domain/models/profile';
import type { WeightEntry } from '@/domain/models/weight';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { isValidLocalDate } from '@/shared/validation/localDate';

export type CurrentWeightResolution =
  | {
      source: 'entry';
      weightKg: number;
      measuredAt: string;
      entry: WeightEntry;
    }
  | {
      source: 'profile';
      weightKg: number;
    };

function isUsableWeightEntry(entry: WeightEntry): boolean {
  return isValidLocalDate(entry.date)
    && Number.isFinite(entry.weightKg)
    && entry.weightKg > 0;
}

function isMoreRecentEntry(candidate: WeightEntry, current: WeightEntry): boolean {
  const dateComparison = candidate.date.localeCompare(current.date);
  if (dateComparison !== 0) return dateComparison > 0;

  const updatedAtComparison = candidate.updatedAt.localeCompare(current.updatedAt);
  if (updatedAtComparison !== 0) return updatedAtComparison > 0;

  const createdAtComparison = candidate.createdAt.localeCompare(current.createdAt);
  if (createdAtComparison !== 0) return createdAtComparison > 0;

  return candidate.id.localeCompare(current.id) > 0;
}

export function resolveCurrentWeight(
  initialWeightKg: number,
  entries: readonly WeightEntry[],
): CurrentWeightResolution {
  if (!Number.isFinite(initialWeightKg) || initialWeightKg <= 0) {
    throw new Error('Le poids initial du profil doit être un nombre strictement positif.');
  }

  let latestEntry: WeightEntry | undefined;

  for (const entry of entries) {
    if (!isUsableWeightEntry(entry)) continue;
    if (!latestEntry || isMoreRecentEntry(entry, latestEntry)) {
      latestEntry = entry;
    }
  }

  if (!latestEntry) {
    return {
      source: 'profile',
      weightKg: initialWeightKg,
    };
  }

  return {
    source: 'entry',
    weightKg: latestEntry.weightKg,
    measuredAt: latestEntry.date,
    entry: latestEntry,
  };
}

export async function loadCurrentWeight(
  profile: Pick<UserProfile, 'initialWeightKg'>,
  weightRepository: Pick<WeightRepository, 'listAll'> = repositories.weight,
): Promise<CurrentWeightResolution> {
  const entries = await weightRepository.listAll();
  return resolveCurrentWeight(profile.initialWeightKg, entries);
}
