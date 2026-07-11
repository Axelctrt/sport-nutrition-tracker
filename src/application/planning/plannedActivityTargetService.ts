import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { ProfileRepository } from '@/infrastructure/repositories/contracts/ProfileRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';

export interface PlannedActivityTargetServiceDependencies {
  calculateTarget: (date: LocalDate, profile: UserProfile) => Promise<unknown>;
}

export interface CurrentProfileTargetServiceDependencies
  extends PlannedActivityTargetServiceDependencies {
  profile: Pick<ProfileRepository, 'get'>;
}

const defaultDependencies: CurrentProfileTargetServiceDependencies = {
  calculateTarget: calculateAndPersistDailyTarget,
  profile: repositories.profile,
};

export async function recalculatePlannedActivityTargets(
  dates: readonly LocalDate[],
  profile: UserProfile,
  dependencies: PlannedActivityTargetServiceDependencies = defaultDependencies,
  today: LocalDate = toLocalDate(),
): Promise<void> {
  const eligibleDates = [...new Set(dates)]
    .filter((date) => date >= today)
    .sort((left, right) => left.localeCompare(right));

  await Promise.all(
    eligibleDates.map((date) => dependencies.calculateTarget(date, profile)),
  );
}

export async function recalculatePlannedActivityTargetsForCurrentProfile(
  dates: readonly LocalDate[],
  dependencies: CurrentProfileTargetServiceDependencies = defaultDependencies,
  today: LocalDate = toLocalDate(),
): Promise<void> {
  try {
    const profile = await dependencies.profile.get();
    if (!profile) return;

    await recalculatePlannedActivityTargets(
      dates,
      profile,
      dependencies,
      today,
    );
  } catch {
    // Planning/session writes are already persisted at this point.
    // The dashboard will recalculate the target on the next read, so a
    // transient profile or repository failure must not invalidate the
    // user's primary action.
  }
}
