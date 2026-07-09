import { resolveActivityCalculationContext } from '@/application/activities/activityCalculationContext';
import {
  reconcileActivityPlannedLink,
  unlinkDeletedActivity,
  validateActivityPlannedLink,
} from '@/application/planning/activityReconciliationService';
import { calculateAndPersistDailyTarget } from '@/application/daily/dailyTargetCoordinator';
import {
  runSocialActivitySnapshotObserverBestEffort,
  type SocialActivitySnapshotObserver,
} from '@/application/friends/socialActivitySnapshotObserver';
import { estimateActivityCalories } from '@/domain/calculations/activityCalories';
import type {
  Activity,
  CyclingActivity,
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
import { runtimeSocialActivitySnapshotObserver } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotObserver';

export type ActivityDraft =
  | Omit<NewEntity<RunningActivity>, 'calculation' | 'rpe'>
  | Omit<NewEntity<SwimmingActivity>, 'calculation' | 'rpe'>
  | Omit<NewEntity<CyclingActivity>, 'calculation' | 'rpe'>
  | Omit<NewEntity<StrengthTrainingActivity>, 'calculation' | 'rpe'>
  | Omit<NewEntity<OtherActivity>, 'calculation' | 'rpe'>;

export interface ActivityServiceDependencies {
  settings: Pick<SettingsRepository, 'get'>;
  weight: Pick<WeightRepository, 'listBetween'>;
  activities: Pick<ActivityRepository, 'getById' | 'create' | 'save' | 'delete'>;
  recalculateDailyTarget: (
    date: string,
    profile: UserProfile,
  ) => Promise<unknown>;
  plannedActivityLinks?: {
    validate: typeof validateActivityPlannedLink;
    reconcile: typeof reconcileActivityPlannedLink;
    unlinkDeleted: typeof unlinkDeletedActivity;
  };
  socialActivitySnapshots?: Pick<
    SocialActivitySnapshotObserver,
    'onActivitySaved' | 'onActivityDeleted'
  >;
}

const defaultDependencies: ActivityServiceDependencies = {
  settings: repositories.settings,
  weight: repositories.weight,
  activities: repositories.activities,
  recalculateDailyTarget: calculateAndPersistDailyTarget,
  plannedActivityLinks: {
    validate: validateActivityPlannedLink,
    reconcile: reconcileActivityPlannedLink,
    unlinkDeleted: unlinkDeletedActivity,
  },
  ...(import.meta.env.MODE === 'test'
    ? {}
    : { socialActivitySnapshots: runtimeSocialActivitySnapshotObserver }),
};

function toActivityInput(
  draft: ActivityDraft,
  calculationWeightKg: number,
  settings: Awaited<ReturnType<SettingsRepository['get']>>,
): NewEntity<Activity> {
  const calculation = estimateActivityCalories(
    draft,
    calculationWeightKg,
    settings,
  );

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
  const [settings, calculationContext] = await Promise.all([
    dependencies.settings.get(),
    resolveActivityCalculationContext(draft.date, profile, dependencies.weight),
  ]);

  const input = toActivityInput(draft, calculationContext.weight.weightKg, settings);
  const plannedActivityLinks = dependencies.plannedActivityLinks;
  if (input.plannedActivity && plannedActivityLinks) {
    await plannedActivityLinks.validate({
      ...input,
      id: '__new_activity__',
    } as Activity);
  }

  const activity = await dependencies.activities.create(input);
  let affectedDates = [activity.date];
  if (activity.plannedActivity && plannedActivityLinks) {
    try {
      affectedDates = await plannedActivityLinks.reconcile(undefined, activity);
    } catch (error) {
      await dependencies.activities.delete(activity.id);
      throw error;
    }
  }
  await recalculateDates(affectedDates, profile, dependencies);
  const socialActivitySnapshots = dependencies.socialActivitySnapshots;
  await runSocialActivitySnapshotObserverBestEffort(
    socialActivitySnapshots
      ? () => socialActivitySnapshots.onActivitySaved(activity)
      : undefined,
  );
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

  const [settings, calculationContext] = await Promise.all([
    dependencies.settings.get(),
    resolveActivityCalculationContext(draft.date, profile, dependencies.weight),
  ]);
  const input = toActivityInput(
    draft,
    calculationContext.weight.weightKg,
    settings,
  );
  const candidate = {
    ...input,
    ...(existing.rpe === undefined ? {} : { rpe: existing.rpe }),
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  } as Activity;
  const plannedActivityLinks = dependencies.plannedActivityLinks;
  if (candidate.plannedActivity && plannedActivityLinks) {
    await plannedActivityLinks.validate(candidate);
  }

  const saved = await dependencies.activities.save(candidate);
  let linkedDates: readonly string[] = [];
  if (plannedActivityLinks) {
    try {
      linkedDates = await plannedActivityLinks.reconcile(existing, saved);
    } catch (error) {
      await dependencies.activities.save(existing);
      await plannedActivityLinks.reconcile(saved, existing);
      throw error;
    }
  }

  await recalculateDates([existing.date, saved.date, ...linkedDates], profile, dependencies);
  const socialActivitySnapshots = dependencies.socialActivitySnapshots;
  await runSocialActivitySnapshotObserverBestEffort(
    socialActivitySnapshots
      ? () => socialActivitySnapshots.onActivitySaved(saved)
      : undefined,
  );
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

  const plannedActivityLinks = dependencies.plannedActivityLinks;
  let affectedDates: readonly string[] = [existing.date];
  if (plannedActivityLinks) {
    affectedDates = await plannedActivityLinks.unlinkDeleted(existing);
  }

  try {
    await dependencies.activities.delete(activityId);
  } catch (error) {
    if (plannedActivityLinks) {
      await plannedActivityLinks.reconcile(undefined, existing);
    }
    throw error;
  }
  await recalculateDates(affectedDates, profile, dependencies);
  const socialActivitySnapshots = dependencies.socialActivitySnapshots;
  await runSocialActivitySnapshotObserverBestEffort(
    socialActivitySnapshots
      ? () => socialActivitySnapshots.onActivityDeleted(existing)
      : undefined,
  );
}
