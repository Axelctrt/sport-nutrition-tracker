import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { ProfileRepository } from '@/infrastructure/repositories/contracts/ProfileRepository';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

interface SettingsTargetRecalculationDependencies {
  readonly profile: Pick<ProfileRepository, 'get'>;
  readonly targets: Pick<TargetRepository, 'listTargetsBetween'>;
  readonly calculateTarget: (
    date: LocalDate,
    profile: UserProfile,
  ) => Promise<unknown>;
}

const defaultDependencies: SettingsTargetRecalculationDependencies = {
  profile: repositories.profile,
  targets: repositories.targets,
  calculateTarget: calculateAndPersistDailyTarget,
};

export async function recalculateExistingTargetsAfterSettingsChange(
  dependencies: SettingsTargetRecalculationDependencies = defaultDependencies,
): Promise<number> {
  const profile = await dependencies.profile.get();
  if (!profile) return 0;

  const targets = await dependencies.targets.listTargetsBetween(
    '1900-01-01',
    '9999-12-31',
  );
  const dates = [...new Set(targets.map((target) => target.date))].sort();

  for (const date of dates) {
    await dependencies.calculateTarget(date, profile);
  }
  return dates.length;
}
