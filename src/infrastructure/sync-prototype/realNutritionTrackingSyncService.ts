import type { EntityMetadata, LocalDate } from '@/domain/models/common';
import type { DailyTarget } from '@/domain/models/targets';
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import { coachDecisionMemoryIdForReview } from '@/domain/coach/coachMemory';
import { calculateDailyTarget } from '@/domain/calculations/dailyTarget';
import {
  buildDailyTargetEnergyInputSnapshot,
  restoreDailyTargetEnergyContext,
} from '@/domain/calculations/dailyTargetInputSnapshot';
import { estimateExpectedSteps } from '@/domain/calculations/expectedSteps';
import { resolveAcceptedCalibrationAdjustment } from '@/application/daily/dailyTargetCoordinator';
import { buildPlannedActivityCalories } from '@/application/planning/plannedActivityCalories';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  putLocalIfUnchanged,
  sameLocalCollection,
} from '@/infrastructure/sync-prototype/localSyncCompareAndSwap';
import {
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stripCloudFields,
  type CloudOwned,
  type CloudSyncExecutionOptions,
} from '@/infrastructure/sync-prototype/cloudSyncValue';
import {
  logicalSyncBaselineId,
  logicalSyncBaselineTable,
  logicalSyncStamp,
  persistLogicalSyncBaseline,
  resolveDatabaseLogicalSyncState,
  resolveSyncActorId,
  stripLogicalSyncFields,
  upsertLogicalCloudValue,
  type DatabaseLogicalSyncResolution,
  type LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';

export interface NutritionTrackingAggregate {
  readonly id: string;
  readonly review: WeeklyReview;
  readonly adjustments: readonly AcceptedCalorieAdjustment[];
  readonly memory?: CoachDecisionMemoryRecord;
  readonly updatedAt: string;
}

type CloudNutritionTrackingAggregate = Omit<NutritionTrackingAggregate, 'id'> & {
  readonly id: string;
} & LogicalSyncFields;

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
  readonly cloudRows: readonly CloudNutritionTrackingAggregate[];
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
  if (aggregate.memory) {
    if (aggregate.memory.weeklyReviewId !== aggregate.review.id) {
      throw new Error(`La mémoire ${aggregate.memory.id} référence un bilan absent.`);
    }
    if (aggregate.memory.id !== coachDecisionMemoryIdForReview(aggregate.review.id)) {
      throw new Error(`La mémoire ${aggregate.memory.id} possède un identifiant incohérent.`);
    }
  }

  const expectedUpdatedAt = maxUpdatedAt([
    aggregate.review,
    ...aggregate.adjustments,
    ...(aggregate.memory ? [aggregate.memory] : []),
  ]);
  if (aggregate.updatedAt !== expectedUpdatedAt) {
    throw new Error(`Le bilan ${aggregate.review.weekStart} possède un horodatage agrégé incohérent.`);
  }
}

function buildAggregates(
  reviews: readonly WeeklyReview[],
  adjustments: readonly AcceptedCalorieAdjustment[],
  memories: readonly CoachDecisionMemoryRecord[],
): NutritionTrackingAggregate[] {
  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  for (const adjustment of adjustments) {
    if (!reviewById.has(adjustment.weeklyReviewId)) {
      throw new Error(`L’ajustement ${adjustment.id} référence un bilan absent.`);
    }
  }
  const memoryByReviewId = new Map<string, CoachDecisionMemoryRecord>();
  for (const memory of memories) {
    if (!reviewById.has(memory.weeklyReviewId)) {
      throw new Error(`La mémoire ${memory.id} référence un bilan absent.`);
    }
    if (memoryByReviewId.has(memory.weeklyReviewId)) {
      throw new Error(`Le bilan ${memory.weeklyReviewId} possède plusieurs mémoires concurrentes.`);
    }
    memoryByReviewId.set(memory.weeklyReviewId, memory);
  }

  return sortById(reviews.map((review) => {
    const reviewAdjustments = sortById(
      adjustments.filter((adjustment) => adjustment.weeklyReviewId === review.id),
    );
    const memory = memoryByReviewId.get(review.id);
    const aggregate: NutritionTrackingAggregate = {
      id: review.id,
      review,
      adjustments: reviewAdjustments,
      ...(memory
        ? { memory }
        : {}),
      updatedAt: maxUpdatedAt([
        review,
        ...reviewAdjustments,
        ...(memory ? [memory] : []),
      ]),
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
    ...stripLogicalSyncFields(stripCloudFields(aggregate)),
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

function resolveLegacyAggregate(
  local: NutritionTrackingAggregate | undefined,
  cloud: NutritionTrackingAggregate | undefined,
): NutritionTrackingAggregate | undefined {
  if (!local || !cloud) return local ?? cloud;

  if (local.memory && !cloud.memory) return local;
  if (cloud.memory && !local.memory) return cloud;
  if (
    local.memory
    && cloud.memory
    && !sameEntity(local.memory, cloud.memory)
  ) {
    throw new Error(
      `Le bilan ${local.id} possède deux décisions Coach concurrentes sans baseline.`,
    );
  }
  return chooseLatest(local, cloud);
}

function hasUnsafeBootstrapDecisionConflict(
  local: NutritionTrackingAggregate | undefined,
  cloud: NutritionTrackingAggregate | undefined,
): boolean {
  if (!local || !cloud) return false;
  if (!local.memory && !cloud.memory) return false;
  if (
    local.memory
    && cloud.memory
    && sameEntity(local.memory, cloud.memory)
  ) {
    return false;
  }
  return !sameEntity(
    { review: local.review, adjustments: local.adjustments },
    { review: cloud.review, adjustments: cloud.adjustments },
  ) || Boolean(local.memory && cloud.memory);
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
  const [reviews, adjustments, memories, cloudRows] = await Promise.all([
    localDatabase.weeklyReviews.toArray(),
    localDatabase.acceptedCalorieAdjustments.toArray(),
    localDatabase.coachDecisionMemories.toArray(),
    cloudDatabase.realNutritionTracking.toArray(),
  ]);

  return {
    local: buildAggregates(reviews, adjustments, memories),
    cloud: cloudRows
      .filter((row) => belongsToCurrentUser(row, currentUserId))
      .map(fromCloudAggregate)
      .filter((row): row is NutritionTrackingAggregate => row !== undefined),
    cloudRows,
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

  const [
    settings,
    steps,
    activities,
    strengthSessions,
    enduranceSessions,
  ] = await Promise.all([
    new DexieSettingsRepository(localDatabase).get(),
    localDatabase.dailySteps.toArray(),
    localDatabase.activities.toArray(),
    localDatabase.workoutSessions.toArray(),
    localDatabase.endurancePlanningSessions.toArray(),
  ]);
  const activitiesByDate = new Map<LocalDate, typeof activities>();
  for (const activity of activities) {
    const current = activitiesByDate.get(activity.date) ?? [];
    current.push(activity);
    activitiesByDate.set(activity.date, current);
  }

  const recalculated: DailyTarget[] = mismatched.map((target) => {
    const calculationContext = target.energyInputSnapshot
      ? restoreDailyTargetEnergyContext(
          target.energyInputSnapshot,
          profile,
          settings,
        )
      : { profile, settings };
    const acceptedCalibrationAdjustmentKcal =
      resolveAcceptedCalibrationAdjustment(adjustments, target.date);
    const dateActivities = activitiesByDate.get(target.date) ?? [];
    const plannedActivities = target.plannedActivities
      ?? buildPlannedActivityCalories({
        date: target.date,
        weightKg: target.calculationWeightKg,
        settings: calculationContext.settings,
        activities: dateActivities,
        strengthSessions,
        enduranceSessions,
      });
    const expectedSteps = estimateExpectedSteps({
      date: target.date,
      occupationalActivity:
        calculationContext.profile.occupationalActivity,
      stepGoal: calculationContext.profile.dailyStepGoal,
      includedBaseSteps:
        calculationContext.settings.includedBaseSteps,
      history: steps,
    });
    const calculation = calculateDailyTarget({
      date: target.date,
      profile: calculationContext.profile,
      settings: calculationContext.settings,
      weightKg: target.calculationWeightKg,
      totalSteps: target.stepBasis?.steps ?? expectedSteps.expectedSteps,
      activities: dateActivities,
      plannedActivities,
      acceptedCalibrationAdjustmentKcal,
    });

    return {
      ...target,
      calculationWeightKg: calculation.calculationWeightKg,
      energyInputSnapshot:
        target.energyInputSnapshot
        ?? buildDailyTargetEnergyInputSnapshot(profile, settings),
      energy: calculation.energy,
      targetWeeklyWeightChangePercentUsed:
        calculation.targetWeeklyWeightChangePercentUsed,
      goalAdjustmentKcal: calculation.goalAdjustmentKcal,
      acceptedCalibrationAdjustmentKcal:
        calculation.acceptedCalibrationAdjustmentKcal,
      calorieFloorKcal: calculation.calorieFloorKcal,
      targetCaloriesKcal: calculation.targetCaloriesKcal,
      macros: calculation.macros,
      plannedActivities: calculation.plannedActivities,
      stepBasis: target.stepBasis ?? {
        mode: 'expected',
        steps: expectedSteps.expectedSteps,
        stepGoal: expectedSteps.stepGoal,
        source: expectedSteps.source,
        confidence: expectedSteps.confidence,
        observedDayCount: expectedSteps.observedDayCount,
        observationWindowDays: expectedSteps.observationWindowDays,
      },
      calculationVersion: calculation.calculationVersion,
      updatedAt: completedAt,
    };
  });

  let applied = 0;
  for (const [index, target] of recalculated.entries()) {
    const updated = await putLocalIfUnchanged(
      localDatabase,
      localDatabase.dailyTargets,
      target.id,
      mismatched[index],
      target,
    );
    if (updated) applied += 1;
  }
  return applied;
}

export async function synchronizeRealNutritionTracking(
  localDatabase: AppDatabase,
  cloudDatabase: SyncPrototypeDatabase,
  currentUserId: string,
  options: CloudSyncExecutionOptions = {},
): Promise<RealNutritionTrackingSyncResult> {
  const writeCloud = options.writeCloud !== false;
  const state = await readState(localDatabase, cloudDatabase, currentUserId);
  const localById = mapById(state.local);
  const cloudById = mapById(state.cloud);
  const cloudRowById = new Map(
    state.cloudRows.flatMap((row) => {
      const id = localIdFromCloud(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const actorId = await resolveSyncActorId(localDatabase);
  const ids = new Set([...localById.keys(), ...cloudById.keys()]);
  const baselineTable = logicalSyncBaselineTable(cloudDatabase);
  const deferredBootstrapConflictIds = new Set<string>();
  const resolutions: DatabaseLogicalSyncResolution<
    NutritionTrackingAggregate | undefined
  >[] = [];
  for (const id of ids) {
    if (hasUnsafeBootstrapDecisionConflict(localById.get(id), cloudById.get(id))) {
      const baseline = await baselineTable?.get(logicalSyncBaselineId(
        currentUserId,
        'nutrition-tracking',
        id,
      ));
      if (!baseline) {
        deferredBootstrapConflictIds.add(id);
        continue;
      }
    }
    resolutions.push(await resolveDatabaseLogicalSyncState({
      cloudDatabase,
      accountUserId: currentUserId,
      domainId: 'nutrition-tracking',
      entityId: id,
      actorId,
      localValue: localById.get(id),
      cloudValue: cloudById.get(id),
      cloudStamp: logicalSyncStamp(cloudRowById.get(id)),
      legacyResolve: resolveLegacyAggregate,
    }));
  }
  const final = sortById(
    [
      ...resolutions
        .map((resolution) => resolution.value)
        .filter(
          (value): value is NutritionTrackingAggregate => value !== undefined,
        ),
      ...[...deferredBootstrapConflictIds]
        .map((id) => localById.get(id))
        .filter(
          (value): value is NutritionTrackingAggregate => value !== undefined,
        ),
    ],
  );
  const preview = buildPreview(state, final);
  const completedAt = new Date().toISOString();

  const uploaded = writeCloud
    ? resolutions
        .map((resolution) => resolution.value)
        .filter(
          (value): value is NutritionTrackingAggregate => (
            value !== undefined
            && !sameEntity(cloudById.get(value.id), value)
          ),
        )
    : [];
  const downloaded = final.filter((value) => !sameEntity(localById.get(value.id), value));

  let localStateApplied = false;
  await localDatabase.transaction(
    'rw',
    localDatabase.weeklyReviews,
    localDatabase.acceptedCalorieAdjustments,
    localDatabase.coachDecisionMemories,
    async () => {
      const [currentReviews, currentAdjustments, currentMemories] = await Promise.all([
        localDatabase.weeklyReviews.toArray(),
        localDatabase.acceptedCalorieAdjustments.toArray(),
        localDatabase.coachDecisionMemories.toArray(),
      ]);
      if (
        !sameLocalCollection(
          buildAggregates(currentReviews, currentAdjustments, currentMemories),
          state.local,
        )
      ) {
        return;
      }

      for (const aggregate of final) {
        if (deferredBootstrapConflictIds.has(aggregate.id)) continue;
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
        await localDatabase.coachDecisionMemories
          .where('weeklyReviewId')
          .equals(aggregate.review.id)
          .delete();
        if (aggregate.memory) {
          await localDatabase.coachDecisionMemories.put(aggregate.memory);
        }
      }
      localStateApplied = true;
    },
  );

  if (writeCloud && localStateApplied) {
    for (const resolution of resolutions) {
      const aggregate = resolution.value;
      if (!aggregate) continue;
      await upsertLogicalCloudValue(
        cloudDatabase.realNutritionTracking,
        cloudById.get(aggregate.id),
        cloudRowById.get(aggregate.id),
        aggregate,
        resolution.stamp,
        (value) => toCloudAggregate(value) as NutritionTrackingAggregate,
      );
      await persistLogicalSyncBaseline(cloudDatabase, resolution.baseline);
    }
  }

  const allAdjustments = final.flatMap((value) => [...value.adjustments]);
  const recalculatedDailyTargets = localStateApplied
    && deferredBootstrapConflictIds.size === 0
    ? await reconcileDailyTargets(localDatabase, allAdjustments, completedAt)
    : 0;

  return {
    ...preview,
    uploadedReviews: uploaded.length,
    downloadedReviews: localStateApplied ? downloaded.length : 0,
    uploadedAdjustments: uploaded.reduce((sum, value) => sum + value.adjustments.length, 0),
    downloadedAdjustments: localStateApplied
      ? downloaded.reduce((sum, value) => sum + value.adjustments.length, 0)
      : 0,
    recalculatedDailyTargets,
    completedAt,
  };
}
