import { addDays, addWeeks, parseISO, startOfWeek } from 'date-fns';
import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import type { LocalDate } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { DailyTarget } from '@/domain/models/targets';
import type { TargetRepository } from '@/infrastructure/repositories/contracts/TargetRepository';
import { repositories } from '@/infrastructure/repositories/repositories';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export interface AffectedTargetWeek {
  start: LocalDate;
  end: LocalDate;
}

export interface ReferenceWeightRecalculationDependencies {
  targets: Pick<TargetRepository, 'listTargetsBetween'>;
  calculateTarget: (
    date: LocalDate,
    profile: UserProfile,
  ) => Promise<unknown>;
  today: () => LocalDate;
}

const defaultDependencies: ReferenceWeightRecalculationDependencies = {
  targets: repositories.targets,
  calculateTarget: calculateAndPersistDailyTarget,
  today: toLocalDate,
};

export function getAffectedTargetWeek(weightDate: LocalDate): AffectedTargetWeek {
  if (!isValidLocalDate(weightDate)) {
    throw new Error(`Date de pesée invalide : ${weightDate}`);
  }

  const weightWeekStart = startOfWeek(parseISO(weightDate), WEEK_OPTIONS);
  const affectedWeekStart = addWeeks(weightWeekStart, 1);

  return {
    start: toLocalDate(affectedWeekStart),
    end: toLocalDate(addDays(affectedWeekStart, 6)),
  };
}

export function selectTargetDatesToRecalculate(
  affectedWeek: AffectedTargetWeek,
  today: LocalDate,
  existingTargets: readonly DailyTarget[],
): LocalDate[] {
  if (affectedWeek.end < today) {
    return [];
  }

  const dates = new Set<LocalDate>();
  for (const target of existingTargets) {
    if (
      target.date >= affectedWeek.start
      && target.date <= affectedWeek.end
      && target.date >= today
    ) {
      dates.add(target.date);
    }
  }

  if (today >= affectedWeek.start && today <= affectedWeek.end) {
    dates.add(today);
  }

  return [...dates].sort((left, right) => left.localeCompare(right));
}

export async function recalculateTargetsAfterWeightChange(
  weightDate: LocalDate,
  profile: UserProfile,
  dependencies: ReferenceWeightRecalculationDependencies = defaultDependencies,
): Promise<LocalDate[]> {
  const affectedWeek = getAffectedTargetWeek(weightDate);
  const today = dependencies.today();
  const existingTargets = await dependencies.targets.listTargetsBetween(
    affectedWeek.start,
    affectedWeek.end,
  );
  const dates = selectTargetDatesToRecalculate(
    affectedWeek,
    today,
    existingTargets,
  );

  await Promise.all(
    dates.map((date) => dependencies.calculateTarget(date, profile)),
  );

  return dates;
}
