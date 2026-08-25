import type { LocalDate, NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { WeightEntry } from '@/domain/models/weight';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { toLocalDate } from '@/shared/utils/dates';

interface CompleteProfileOnboardingDependencies {
  saveProfile: (profile: NewEntity<UserProfile>) => Promise<UserProfile>;
  weightRepository: Pick<WeightRepository, 'listAll' | 'upsert'>;
  today?: () => LocalDate;
}

export interface CompleteProfileOnboardingResult {
  profile: UserProfile;
  initialWeightCreated: boolean;
}

export async function completeProfileOnboarding(
  profileInput: NewEntity<UserProfile>,
  dependencies: CompleteProfileOnboardingDependencies,
): Promise<CompleteProfileOnboardingResult> {
  const existingWeights = await dependencies.weightRepository.listAll();
  let initialWeightCreated = false;

  if (existingWeights.length === 0) {
    const initialWeight: NewEntity<WeightEntry> = {
      date: (dependencies.today ?? toLocalDate)(),
      weightKg: profileInput.initialWeightKg,
      provenance: 'profileInitialization',
    };
    await dependencies.weightRepository.upsert(initialWeight);
    initialWeightCreated = true;
  }

  const profile = await dependencies.saveProfile(profileInput);
  return { profile, initialWeightCreated };
}
