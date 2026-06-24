import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import { estimateActivityCalories } from '@/domain/calculations/activityCalories';
import type {
  Activity,
  OtherActivity,
  RunningActivity,
  StrengthTrainingActivity,
  SwimmingActivity,
} from '@/domain/models/activity';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { ActivityRepository } from '@/infrastructure/repositories/contracts/ActivityRepository';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import type { WeightRepository } from '@/infrastructure/repositories/contracts/WeightRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

export type ActivityDraft =
  | Omit<NewEntity<RunningActivity>, 'calculation'>
  | Omit<NewEntity<SwimmingActivity>, 'calculation'>
  | Omit<NewEntity<StrengthTrainingActivity>, 'calculation'>
  | Omit<NewEntity<OtherActivity>, 'calculation'>;

export interface ActivityServiceDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'getLatestOnOrBefore'>;
  activities: Pick<ActivityRepository, 'getById' | 'create' | 'save' | 'delete'>;
  recalculateDailyTarget: (
    date: string,
    profile: UserProfile,
  ) => Promise<unknown>;
}

const defaultDependencies: ActivityServiceDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  activities: repositories.activities,
  recalculateDailyTarget: calculateAndPersistDailyTarget,
};

function toActivityInput(
  draft: ActivityDraft,
  profile: UserProfile,
  weightEntryKg: number | undefined,
  settings: Awaited<ReturnType<SettingsRepository['get']>>,
): NewEntity<Activity> {
  const weightKg = weightEntryKg ?? profile.initialWeightKg;
  const calculation = estimateActivityCalories(draft, weightKg, settings);

  return {
    ...draft,
    calculation,
  } as NewEntity<Activity>;
}

async function recalculateDates(
  dates: readonly string[],
  profile: UserProfile,
  dependencies: ActivityServiceDependencies,
): Promise<void> {
  const uniqueDates = [...new Set(dates)];
  await Promise.all(
    uniqueDates.map((date) => dependencies.recalculateDailyTarget(date, profile)),
  );
}

export async function createActivityFromDraft(
  draft: ActivityDraft,
  profile: UserProfile,
  dependencies: ActivityServiceDependencies = defaultDependencies,
): Promise<Activity> {
  const [settings, weightEntry] = await Promise.all([
    dependencies.settings.get(),
    dependencies.weight.getLatestOnOrBefore(draft.date),
  ]);

  const activity = await dependencies.activities.create(
    toActivityInput(draft, profile, weightEntry?.weightKg, settings),
  );
  await recalculateDates([activity.date], profile, dependencies);
  return activity;
}

export async function updateActivityFromDraft(
  activityId: EntityId,
  draft: ActivityDraft,
  profile: UserProfile,
  dependencies: ActivityServiceDependencies = defaultDependencies,
): Promise<Activity> {
  const existing = await dependencies.activities.getById(activityId);
  if (!existing) {
    throw new Error('Cette activité est introuvable ou a déjà été supprimée.');
  }

  const [settings, weightEntry] = await Promise.all([
    dependencies.settings.get(),
    dependencies.weight.getLatestOnOrBefore(draft.date),
  ]);
  const input = toActivityInput(draft, profile, weightEntry?.weightKg, settings);
  const saved = await dependencies.activities.save({
    ...input,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  } as Activity);

  await recalculateDates([existing.date, saved.date], profile, dependencies);
  return saved;
}

export async function deleteActivityAndRecalculate(
  activityId: EntityId,
  profile: UserProfile,
  dependencies: ActivityServiceDependencies = defaultDependencies,
): Promise<void> {
  const existing = await dependencies.activities.getById(activityId);
  if (!existing) {
    return;
  }

  await dependencies.activities.delete(activityId);
  await recalculateDates([existing.date], profile, dependencies);
}
