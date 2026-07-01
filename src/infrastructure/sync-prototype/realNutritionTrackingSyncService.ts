import type { EntityMetadata, LocalDate } from '@/domain/models/common';
import type { DailyTarget } from '@/domain/models/targets';
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import { calculateDailyTarget } from '@/domain/calculations/dailyTarget';
import { resolveAcceptedCalibrationAdjustment } from '@/application/daily/dailyTargetCoordinator';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stripCloudFields,
  type CloudOwned,
} from '@/infrastructure/sync-prototype/cloudSyncValue';

export interface NutritionTrackingAggregate {
  readonly id: string;
  readonly review: WeeklyReview;
  readonly adjustments: readonly AcceptedCalorieAdjustment[];
  readonly updatedAt: string;
}

type CloudNutritionTrackingAggregate = Omit<NutritionTrackingAggregate, 'id'> & {
  readonly id: string;
};

export interface RealNutritionTrackingSyncPreview {
  readonly localReviewCount: number;
  readonly cloudReviewCount: number;
  readonly localAdjustmentCount: number;
  readonly cloudAdjustmentCount: number;
  readonly differingEntityCount: number;
}

export interface RealNutritionTrackingSyncResult extends RealNutritionTrackingSyncPreview {
  readonly uploadedReviews: number;
  readonly downloadedReviews: number;
  readonly uploadedAdjustments: number;
  readonly downloadedAdjustments: number;
  readonly recalculatedDailyTargets: number;
  readonly completedAt: string;
}

interface TrackingState {
  readonly local: NutritionTrackingAggregate[];
  readonly cloud: NutritionTrackingAggregate[];
}

function sortById<T extends { id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

function maxUpdatedAt(values: readonly EntityMetadata[]): string {
  return values.reduce(
    (latest, value) => (value.updatedAt > latest ? value.updatedAt : latest),
    '',
  );
}

function validateAggregate(aggregate: NutritionTrackingAggregate): void {
  if (aggregate.id !== aggregate.review.id) {
    throw new Error(`Le bilan ${aggregate.review.weekStart} possède un identifiant incohérent.`);
  }
  if (aggregate.review.weekStart > aggregate.review.weekEnd) {
    throw new Error(`Le bilan ${aggregate.review.weekStart} possède une période incohérente.`);
  }

  const ids = new Set<string>();
  for (const adjustment of aggregate.adjustments) {
    if (ids.has(adjustment.id)) {
      throw new Error(`Le bilan ${aggregate.review.weekStart} contient un ajustement en double.`);
    }
    ids.add(adjustment.id);
    if (adjustment.weeklyReviewId !== aggregate.review.id) {
      throw new Error(`L’ajustement ${adjustment.id} référence un bilan absent.`);
    }
    if (adjustment.effectiveFrom <= aggregate.review.weekEnd) {
      throw new Error(`L’ajustement ${adjustment.id} possède une date d’effet incohérente.`);
    }
  }

  if (aggregate.adjustments.length > 1) {
    throw new Error(`Le bilan ${aggregate.review.weekStart} possède plusieurs ajustements concurrents.`);
  }
  if (aggregate.adjustments.length > 0 && aggregate.review.decisionStatus !== 'accepted') {
    throw new Error(`Le bilan ${aggregate.review.weekStart} possède un ajustement sans décision acceptée.`);
  }
  if (
    aggregate.review.decisionStatus === 'accepted'
    && aggregate.review.proposedAdjustmentKcal !== 0
    && aggregate.adjustments.length === 0
  ) {
    throw new Error(`Le bilan ${aggregate.review.weekStart} est accepté mais son ajustement est absent.`);
  }

  const expectedUpdatedAt = maxUpdatedAt([
    aggregate.review,
    ...aggregate.adjustments,
  ]);
  if (aggregate.updatedAt !== expectedUpdatedAt) {
    throw new Error(`Le bilan ${aggregate.review.weekStart} possède un horodatage agrégé incohérent.`);
  }
}

function buildAggregates(
  reviews: readonly WeeklyReview[],
  adjustments: readonly AcceptedCalorieAdjustment[],
): NutritionTrackingAggregate[] {
  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  for (const adjustment of adjustments) {
    if (!reviewById.has(adjustment.weeklyReviewId)) {
      throw new Error(`L’ajustement ${adjustment.id} référence un bilan absent.`);
    }
  }

  return sortById(reviews.map((review) => {
    const reviewAdjustments = sortById(
      adjustments.filter((adjustment) => adjustment.weeklyReviewId === review.id),
    );
    const aggregate: NutritionTrackingAggregate = {
      id: review.id,
      review,
      adjustments: reviewAdjustments,
      updatedAt: maxUpdatedAt([review, ...reviewAdjustments]),
    };
    validateAggregate(aggregate);
    return aggregate;
  }));
}

function toCloudAggregate(
  aggregate: NutritionTrackingAggregate,
): CloudNutritionTrackingAggregate {
  return { ...aggregate, id: cloudPrivateId(aggregate.id) };
}

function fromCloudAggregate(
  aggregate: CloudOwned<CloudNutritionTrackingAggregate>,
): NutritionTrackingAggregate | undefined {
  const localId = localIdFromCloud(aggregate.id);
  if (!localId) return undefined;
  const value = {
    ...stripCloudFields(aggregate),
    id: localId,
  } as NutritionTrackingAggregate;
  validateAggregate(value);
  return value;
}

function mapById<T extends { id: string }>(values: readonly T[]): Map<string, T> {
  return new Map(values.map((value) => [value.id, value]));
}

function resolveFinalState(state: TrackingState): NutritionTrackingAggregate[] {
  const localById = mapById(state.local);
  const cloudById = mapById(state.cloud);
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  return sortById(
    [...ids]
      .map((id) => chooseLatest(localById.get(id), cloudById.get(id)))
      .filter((value): value is NutritionTrackingAggregate => value !== undefined),
  );
}

function differenceCount<T extends { id: string }>(
  left: readonly T[],
  right: readonly T[],
): number {
  const leftById = mapById(left);
  const rightById = mapById(right);
  const ids = new Set([...leftById.keys(), ...rightById.keys()]);
  return [...ids].filter((id) => !sameEntity(leftById.get(id), rightById.get(id))).length;
}

function countAdjustments(values: readonly NutritionTrackingAggregate[]): number {
  return values.reduce((sum, value) => sum + value.adjustments.length, 0);
}

function buildPreview(
  state: TrackingState,
  final: readonly NutritionTrackingAggregate[],
): RealNutritionTrackingSyncPreview {
  return {
    localReviewCount: state.local.length,
    cloudReviewCount: state.cloud.length,
    localAdjustmentCount: countAdjustments(state.local),
    cloudAdjustmentCount: countAdjustments(state.cloud),
    differingEntityCount:
      differenceCount(state.local, final)
      + differenceCount(state.cloud, final),
  };
}

async function readState(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<TrackingState> {
  const [reviews, adjustments, cloudRows] = await Promise.all([
    localDatabase.weeklyReviews.toArray(),
    localDatabase.acceptedCalorieAdjustments.toArray(),
    cloudDatabase.realNutritionTracking.toArray(),
  ]);

  return {
    local: buildAggregates(reviews, adjustments),
    cloud: cloudRows
      .filter((row) => belongsToCurrentUser(row, currentUserId))
      .map(fromCloudAggregate)
      .filter((row): row is NutritionTrackingAggregate => row !== undefined),
  };
}

export async function previewRealNutritionTrackingSync(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealNutritionTrackingSyncPreview> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  return buildPreview(state, resolveFinalState(state));
}

function latestWeightOnOrBefore<T extends { date: LocalDate }>(
  values: readonly T[],
  date: LocalDate,
): T | undefined {
  return values
    .filter((value) => value.date <= date)
    .sort((left, right) => right.date.localeCompare(left.date))[0];
}

async function reconcileDailyTargets(
  localDatabase: AppDatabase,
  adjustments: readonly AcceptedCalorieAdjustment[],
  completedAt: string,
): Promise<number> {
  const targets = await localDatabase.dailyTargets.toArray();
  const mismatched = targets.filter((target) => (
    target.acceptedCalibrationAdjustmentKcal
      !== resolveAcceptedCalibrationAdjustment(adjustments, target.date)
  ));
  if (mismatched.length === 0) return 0;

  const profile = await localDatabase.userProfile.toCollection().first();
  if (!profile) return 0;

  const [settings, weights, steps, activities] = await Promise.all([
    new DexieSettingsRepository(localDatabase).get(),
    localDatabase.weights.toArray(),
    localDatabase.dailySteps.toArray(),
    localDatabase.activities.toArray(),
  ]);
  const stepsByDate = new Map(steps.map((value) => [value.date, value]));
  const activitiesByDate = new Map<LocalDate, typeof activities>();
  for (const activity of activities) {
    const current = activitiesByDate.get(activity.date) ?? [];
    current.push(activity);
    activitiesByDate.set(activity.date, current);
  }

  const recalculated: DailyTarget[] = mismatched.map((target) => {
    const weight = latestWeightOnOrBefore(weights, target.date);
    const acceptedCalibrationAdjustmentKcal =
      resolveAcceptedCalibrationAdjustment(adjustments, target.date);
    const calculation = calculateDailyTarget({
      date: target.date,
      profile,
      settings,
      weightKg: weight?.weightKg ?? profile.initialWeightKg,
      totalSteps: stepsByDate.get(target.date)?.totalSteps ?? 0,
      activities: activitiesByDate.get(target.date) ?? [],
      acceptedCalibrationAdjustmentKcal,
    });

    return {
      ...target,
      calculationWeightKg: calculation.calculationWeightKg,
      energy: calculation.energy,
      goalAdjustmentKcal: calculation.goalAdjustmentKcal,
      acceptedCalibrationAdjustmentKcal:
        calculation.acceptedCalibrationAdjustmentKcal,
      calorieFloorKcal: calculation.calorieFloorKcal,
      targetCaloriesKcal: calculation.targetCaloriesKcal,
      macros: calculation.macros,
      calculationVersion: calculation.calculationVersion,
      updatedAt: completedAt,
    };
  });

  await localDatabase.dailyTargets.bulkPut(recalculated);
  return recalculated.length;
}

export async function synchronizeRealNutritionTracking(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
): Promise<RealNutritionTrackingSyncResult> {
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const final = resolveFinalState(state);
  const preview = buildPreview(state, final);
  const completedAt = new Date().toISOString();

  const localById = mapById(state.local);
  const cloudById = mapById(state.cloud);
  const uploaded = final.filter((value) => !sameEntity(cloudById.get(value.id), value));
  const downloaded = final.filter((value) => !sameEntity(localById.get(value.id), value));

  await localDatabase.transaction(
    'rw',
    localDatabase.weeklyReviews,
    localDatabase.acceptedCalorieAdjustments,
    async () => {
      for (const aggregate of final) {
        validateAggregate(aggregate);
        await localDatabase.weeklyReviews.put(aggregate.review);
        await localDatabase.acceptedCalorieAdjustments
          .filter((adjustment) => adjustment.weeklyReviewId === aggregate.review.id)
          .delete();
        if (aggregate.adjustments.length > 0) {
          await localDatabase.acceptedCalorieAdjustments.bulkPut(
            [...aggregate.adjustments],
          );
        }
      }
    },
  );

  if (uploaded.length > 0) {
    await cloudDatabase.realNutritionTracking.bulkPut(uploaded.map(toCloudAggregate));
  }

  const allAdjustments = final.flatMap((value) => [...value.adjustments]);
  const recalculatedDailyTargets = await reconcileDailyTargets(
    localDatabase,
    allAdjustments,
    completedAt,
  );

  return {
    ...preview,
    uploadedReviews: uploaded.length,
    downloadedReviews: downloaded.length,
    uploadedAdjustments: uploaded.reduce((sum, value) => sum + value.adjustments.length, 0),
    downloadedAdjustments: downloaded.reduce((sum, value) => sum + value.adjustments.length, 0),
    recalculatedDailyTargets,
    completedAt,
  };
}
