import Dexie, { type Table } from 'dexie';
import { DAILY_TARGET_CALCULATION_VERSION } from '@/domain/calculations/constants';
import { buildDailyTargetEnergyInputSnapshot } from '@/domain/calculations/dailyTargetInputSnapshot';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { UserProfile } from '@/domain/models/profile';
import type {
  DailyTarget,
  DailyTargetEnergyInputSnapshot,
} from '@/domain/models/targets';
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  logicalSyncBaselineId,
  type LogicalSyncBaseline,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealNutritionTrackingSync,
  synchronizeRealNutritionTracking,
  type NutritionTrackingAggregate,
} from '@/infrastructure/sync-prototype/realNutritionTrackingSyncService';

type CloudAggregate = NutritionTrackingAggregate & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};

class TestCloudDatabase extends Dexie {
  declare realNutritionTracking: Table<CloudAggregate, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor() {
    super(`sportpilot-c3-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realNutritionTracking: 'id, updatedAt',
      realSyncBaselines: 'id, [accountUserId+domainId], accountUserId, domainId, entityId',
    });
  }
}

const createdAt = '2026-06-29T08:00:00.000Z';

function review(
  updatedAt = '2026-07-01T08:00:00.000Z',
  decisionStatus: WeeklyReview['decisionStatus'] = 'accepted',
): WeeklyReview {
  return {
    id: 'weekly-review:2026-06-22',
    weekStart: '2026-06-22',
    weekEnd: '2026-06-28',
    previousWeekStart: '2026-06-15',
    previousWeekEnd: '2026-06-21',
    weighInCount: 3,
    previousWeighInCount: 3,
    trackedFoodDays: 7,
    completedFoodDays: 7,
    calorieComparableDays: 7,
    averageWeightKg: 70,
    previousAverageWeightKg: 70.2,
    actualWeightChangeKg: -0.2,
    targetWeightChangeKg: -0.3,
    averageConsumedCaloriesKcal: 2100,
    averageTargetCaloriesKcal: 2000,
    calorieDeviationPercent: 5,
    calorieAdherencePercent: 95,
    proteinTargetDays: 6,
    stepGoalDays: 5,
    recordedStepDays: 7,
    isCalibrationEligible: true,
    ineligibilityReasons: [],
    rawProposedAdjustmentKcal: 100,
    proposedDecision: 'increase',
    proposedAdjustmentKcal: 100,
    currentCumulativeAdjustmentKcal: 0,
    resultingCumulativeAdjustmentKcal: 100,
    adherenceScore: 90,
    adherenceLevel: 'excellent',
    decisionStatus,
    ...(decisionStatus === 'accepted' ? { decidedAt: updatedAt } : {}),
    createdAt,
    updatedAt,
  };
}

function adjustment(
  updatedAt = '2026-07-01T08:01:00.000Z',
): AcceptedCalorieAdjustment {
  return {
    id: 'adjustment-1',
    weeklyReviewId: 'weekly-review:2026-06-22',
    effectiveFrom: '2026-06-29',
    adjustmentKcalPerDay: 100,
    resultingCumulativeAdjustmentKcal: 100,
    status: 'active',
    createdAt: updatedAt,
    updatedAt,
  };
}

function memory(updatedAt = '2026-07-01T08:02:00.000Z'): CoachDecisionMemoryRecord {
  return {
    id: 'coach-decision:weekly-review:2026-06-22',
    weeklyReviewId: 'weekly-review:2026-06-22',
    period: { weekStart: '2026-06-22', weekEnd: '2026-06-28' },
    decisionDate: '2026-06-28',
    phase: { id: 'stabilization', label: 'Stabilisation', objective: 'maintenance' },
    coachState: 'onTrack',
    confidence: { weight: 80, food: 80, activity: 80, recovery: 80, overall: 80, level: 'reliable' },
    primaryAction: 'reviewNutritionTarget', reasons: ['Ajustement confirmé.'], blockingFactors: [],
    safety: { status: 'clear', reasons: [] },
    proposedChange: { type: 'nutritionCalories', adjustmentKcalPerDay: 100 },
    status: 'accepted', decidedAt: updatedAt, effectiveFrom: '2026-06-29',
    nextReview: { type: 'date', date: '2026-07-05' },
    createdAt: updatedAt, updatedAt,
  };
}

function aggregate(
  reviewValue = review(),
  adjustmentValue = adjustment(),
  memoryValue?: CoachDecisionMemoryRecord,
): NutritionTrackingAggregate {
  return {
    id: reviewValue.id,
    review: reviewValue,
    adjustments: [adjustmentValue],
    ...(memoryValue ? { memory: memoryValue } : {}),
    updatedAt: [reviewValue.updatedAt, adjustmentValue.updatedAt, memoryValue?.updatedAt ?? '']
      .sort()
      .at(-1)!,
  };
}

function profile(): UserProfile {
  return {
    id: 'profile',
    sexForEnergyEquation: 'male',
    ageInformation: { mode: 'age', ageYears: 30, recordedOn: '2026-07-01' },
    heightCm: 178,
    initialWeightKg: 70,
    goal: 'maintenance',
    targetWeeklyWeightChangePercent: 0,
    occupationalActivity: 'sedentary',
    dailyStepGoal: 8000,
    proteinGramsPerKg: 1.8,
    fatGramsPerKg: 0.8,
    createdAt,
    updatedAt: createdAt,
  };
}

function dailyTarget(
  energyInputSnapshot?: DailyTargetEnergyInputSnapshot,
): DailyTarget {
  return {
    id: 'daily-target:2026-07-01',
    date: '2026-07-01',
    calculationWeightKg: 70,
    ...(energyInputSnapshot ? { energyInputSnapshot } : {}),
    energy: {
      bmrKcal: 1600,
      occupationalBaseKcal: 400,
      walkingKcal: 0,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 2000,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1600,
    targetCaloriesKcal: 2000,
    macros: { proteinGrams: 126, carbohydratesGrams: 250, fatGrams: 56 },
    calculationVersion: 1,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('synchronisation C3 du suivi nutritionnel', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-c3-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('envoie un bilan accepté et son ajustement une seule fois', async () => {
    await local.weeklyReviews.add(review());
    await local.acceptedCalorieAdjustments.add(adjustment());

    const first = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedReviews).toBe(1);
    expect(first.uploadedAdjustments).toBe(1);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realNutritionTracking.get('#weekly-review:2026-06-22'))
      .toMatchObject({ adjustments: [expect.objectContaining({ id: 'adjustment-1' })] });
  });

  it('synchronise la mémoire avec le bilan, isole les comptes et reste idempotent', async () => {
    await local.weeklyReviews.add(review());
    await local.acceptedCalorieAdjustments.add(adjustment());
    await local.coachDecisionMemories.add(memory());

    const first = await synchronizeRealNutritionTracking(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');
    const retry = await synchronizeRealNutritionTracking(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');
    expect(first.uploadedReviews).toBe(1);
    expect(retry.differingEntityCount).toBe(0);
    expect((await cloud.realNutritionTracking.get('#weekly-review:2026-06-22'))?.memory?.id)
      .toBe(memory().id);
    await cloud.realNutritionTracking.update('#weekly-review:2026-06-22', { owner: 'user-1' });
    // realSyncBaselines est local à chaque replica Dexie Cloud et n'est pas
    // transporté vers le nouvel appareil.
    await cloud.realSyncBaselines.clear();

    const otherDevice = new AppDatabase(`sportpilot-c9-device-${crypto.randomUUID()}`);
    await otherDevice.open();
    try {
      const otherAccount = await synchronizeRealNutritionTracking(otherDevice, cloud as unknown as SyncPrototypeDatabase, 'user-2');
      expect(otherAccount.downloadedReviews).toBe(0);
      expect(await otherDevice.coachDecisionMemories.count()).toBe(0);
      const sameAccount = await synchronizeRealNutritionTracking(otherDevice, cloud as unknown as SyncPrototypeDatabase, 'user-1');
      expect(sameAccount.downloadedReviews).toBe(1);
      expect(await otherDevice.coachDecisionMemories.get(memory().id)).toEqual(memory());
    } finally {
      otherDevice.close();
      await otherDevice.delete();
    }
  });

  it('ajoute au bootstrap une mémoire locale quand le reste du bundle est identique', async () => {
    await local.weeklyReviews.add(review());
    await local.acceptedCalorieAdjustments.add(adjustment());
    await local.coachDecisionMemories.add(memory());
    await cloud.realNutritionTracking.add({
      ...aggregate(),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    });

    await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect((await cloud.realNutritionTracking.get('#weekly-review:2026-06-22'))?.memory)
      .toEqual(memory());
    expect(await local.acceptedCalorieAdjustments.get('adjustment-1'))
      .toMatchObject({ adjustmentKcalPerDay: 100 });
  });

  it('ajoute au bootstrap une mémoire cloud quand le reste du bundle est identique', async () => {
    const transportedMemory = {
      ...memory('2026-07-01T08:02:00.000Z'),
      reasons: ['Décision déjà transportée.'],
    };
    await local.weeklyReviews.add(review());
    await local.acceptedCalorieAdjustments.add(adjustment());
    await cloud.realNutritionTracking.add({
      ...aggregate(review(), adjustment(), transportedMemory),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    });

    await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.coachDecisionMemories.get(memory().id))
      .toEqual(transportedMemory);
    expect(await local.acceptedCalorieAdjustments.get(adjustment().id))
      .toEqual(adjustment());
  });

  it('converge normalement quand la même mémoire existe des deux côtés', async () => {
    const sharedMemory = memory('2026-07-01T08:02:00.000Z');
    const localReview = review('2030-07-01T08:00:00.000Z');
    const localAdjustment = adjustment('2030-07-01T08:01:00.000Z');
    await local.weeklyReviews.add(localReview);
    await local.acceptedCalorieAdjustments.add(localAdjustment);
    await local.coachDecisionMemories.add(sharedMemory);
    await cloud.realNutritionTracking.add({
      ...aggregate(review(), adjustment(), sharedMemory),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    });

    await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.weeklyReviews.get(localReview.id)).toEqual(localReview);
    expect(await local.acceptedCalorieAdjustments.get(localAdjustment.id))
      .toEqual(localAdjustment);
    expect((await cloud.realNutritionTracking.get('#weekly-review:2026-06-22'))?.memory)
      .toEqual(sharedMemory);
  });

  it('diffère sans écriture deux décisions stabilisées concurrentes au bootstrap', async () => {
    const localReview = {
      ...review('2035-07-01T08:00:00.000Z'),
      averageConsumedCaloriesKcal: 2_150,
      rawProposedAdjustmentKcal: 150,
      proposedAdjustmentKcal: 150,
      resultingCumulativeAdjustmentKcal: 150,
    };
    const localAdjustment = {
      ...adjustment('2035-07-01T08:01:00.000Z'),
      adjustmentKcalPerDay: 150,
      resultingCumulativeAdjustmentKcal: 150,
    };
    const localMemory = {
      ...memory('2035-07-01T08:02:00.000Z'),
      reasons: ['Décision locale concurrente.'],
      proposedChange: {
        type: 'nutritionCalories' as const,
        adjustmentKcalPerDay: 150,
      },
    };
    const cloudReview = review('2020-07-01T08:00:00.000Z');
    const cloudAdjustment = adjustment('2020-07-01T08:01:00.000Z');
    const cloudMemory = {
      ...memory('2020-07-01T08:02:00.000Z'),
      reasons: ['Décision cloud concurrente.'],
    };

    await local.userProfile.add(profile());
    await local.weeklyReviews.add(localReview);
    await local.acceptedCalorieAdjustments.add(localAdjustment);
    await local.coachDecisionMemories.add(localMemory);
    await local.dailyTargets.add({
      ...dailyTarget(),
    });
    const cloudBundle = {
      ...aggregate(cloudReview, cloudAdjustment, cloudMemory),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    };
    await cloud.realNutritionTracking.add(cloudBundle);

    const result = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const retry = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.weeklyReviews.get(localReview.id)).toEqual(localReview);
    expect(await local.acceptedCalorieAdjustments.get(localAdjustment.id))
      .toEqual(localAdjustment);
    expect(await local.coachDecisionMemories.get(localMemory.id)).toEqual(localMemory);
    expect(await cloud.realNutritionTracking.get(cloudBundle.id)).toEqual(cloudBundle);
    expect((await local.dailyTargets.get('daily-target:2026-07-01'))
      ?.acceptedCalibrationAdjustmentKcal).toBe(150);
    expect(result.recalculatedDailyTargets).toBe(1);
    expect(retry.recalculatedDailyTargets).toBe(0);
    expect(result).toMatchObject({
      differingEntityCount: 1,
      uploadedReviews: 0,
      downloadedReviews: 0,
      uploadedAdjustments: 0,
      downloadedAdjustments: 0,
    });
    expect(retry.differingEntityCount).toBe(1);
    expect(await cloud.realSyncBaselines.get(logicalSyncBaselineId(
      'user-1',
      'nutrition-tracking',
      localReview.id,
    ))).toBeUndefined();
  });

  it('réconcilie une entité sûre sans toucher au conflit bootstrap d’un autre bilan', async () => {
    const conflictedLocalReview = {
      ...review('2035-07-01T08:00:00.000Z'),
      averageConsumedCaloriesKcal: 2_150,
      rawProposedAdjustmentKcal: 150,
      proposedAdjustmentKcal: 150,
      resultingCumulativeAdjustmentKcal: 150,
    };
    const conflictedLocalAdjustment = {
      ...adjustment('2035-07-01T08:01:00.000Z'),
      adjustmentKcalPerDay: 150,
      resultingCumulativeAdjustmentKcal: 150,
    };
    const conflictedLocalMemory = {
      ...memory('2035-07-01T08:02:00.000Z'),
      reasons: ['Décision locale concurrente.'],
      proposedChange: {
        type: 'nutritionCalories' as const,
        adjustmentKcalPerDay: 150,
      },
    };
    const conflictedCloudBundle = {
      ...aggregate(
        review('2020-07-01T08:00:00.000Z'),
        adjustment('2020-07-01T08:01:00.000Z'),
        {
          ...memory('2020-07-01T08:02:00.000Z'),
          reasons: ['Décision cloud concurrente.'],
        },
      ),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    };
    const safeCloudReview = {
      ...review('2040-07-08T08:00:00.000Z'),
      id: 'weekly-review:2026-06-29',
      weekStart: '2026-06-29',
      weekEnd: '2026-07-05',
      previousWeekStart: '2026-06-22',
      previousWeekEnd: '2026-06-28',
      rawProposedAdjustmentKcal: 50,
      proposedAdjustmentKcal: 50,
      currentCumulativeAdjustmentKcal: 150,
      resultingCumulativeAdjustmentKcal: 200,
    };
    const safeCloudAdjustment = {
      ...adjustment('2040-07-08T08:01:00.000Z'),
      id: 'adjustment-2',
      weeklyReviewId: safeCloudReview.id,
      effectiveFrom: '2026-07-06',
      adjustmentKcalPerDay: 50,
      resultingCumulativeAdjustmentKcal: 200,
    };
    const safeCloudBundle = {
      ...aggregate(safeCloudReview, safeCloudAdjustment),
      id: '#weekly-review:2026-06-29',
      owner: 'user-1',
    };

    await local.userProfile.add(profile());
    await local.weeklyReviews.add(conflictedLocalReview);
    await local.acceptedCalorieAdjustments.add(conflictedLocalAdjustment);
    await local.coachDecisionMemories.add(conflictedLocalMemory);
    await local.dailyTargets.add({
      ...dailyTarget(),
      id: 'daily-target:2026-07-08',
      date: '2026-07-08',
      acceptedCalibrationAdjustmentKcal: 150,
      targetCaloriesKcal: 2_150,
    });
    await cloud.realNutritionTracking.bulkAdd([
      conflictedCloudBundle,
      safeCloudBundle,
    ]);

    const result = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const retry = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.weeklyReviews.get(conflictedLocalReview.id))
      .toEqual(conflictedLocalReview);
    expect(await local.acceptedCalorieAdjustments.get(conflictedLocalAdjustment.id))
      .toEqual(conflictedLocalAdjustment);
    expect(await local.coachDecisionMemories.get(conflictedLocalMemory.id))
      .toEqual(conflictedLocalMemory);
    expect(await cloud.realNutritionTracking.get(conflictedCloudBundle.id))
      .toEqual(conflictedCloudBundle);
    expect(await cloud.realSyncBaselines.get(logicalSyncBaselineId(
      'user-1',
      'nutrition-tracking',
      conflictedLocalReview.id,
    ))).toBeUndefined();

    expect(await local.weeklyReviews.get(safeCloudReview.id))
      .toEqual(safeCloudReview);
    expect(await local.acceptedCalorieAdjustments.get(safeCloudAdjustment.id))
      .toEqual(safeCloudAdjustment);
    expect((await local.dailyTargets.get('daily-target:2026-07-08'))
      ?.acceptedCalibrationAdjustmentKcal).toBe(200);
    expect(result).toMatchObject({
      downloadedReviews: 1,
      downloadedAdjustments: 1,
      recalculatedDailyTargets: 1,
    });
    expect(retry).toMatchObject({
      downloadedReviews: 0,
      downloadedAdjustments: 0,
      recalculatedDailyTargets: 0,
    });
  });

  it('télécharge le bilan et l’ajustement atomiquement', async () => {
    await cloud.realNutritionTracking.add({
      ...aggregate(),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    });

    const result = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedReviews).toBe(1);
    expect(result.downloadedAdjustments).toBe(1);
    expect(await local.weeklyReviews.get('weekly-review:2026-06-22')).toBeDefined();
    expect(await local.acceptedCalorieAdjustments.get('adjustment-1')).toBeDefined();
  });

  it('applique la version la plus récente du bilan complet', async () => {
    await local.weeklyReviews.add(review('2026-07-01T08:00:00.000Z'));
    await local.acceptedCalorieAdjustments.add(adjustment('2026-07-01T08:01:00.000Z'));
    const cloudReview = review('2026-07-02T08:00:00.000Z', 'accepted');
    const cloudAdjustment = {
      ...adjustment('2026-07-02T08:01:00.000Z'),
      adjustmentKcalPerDay: 150,
      resultingCumulativeAdjustmentKcal: 150,
    };
    await cloud.realNutritionTracking.add({
      ...aggregate(cloudReview, cloudAdjustment),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    });

    await synchronizeRealNutritionTracking(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(await local.acceptedCalorieAdjustments.get('adjustment-1'))
      .toMatchObject({ adjustmentKcalPerDay: 150 });
  });

  it('ignore les métadonnées techniques Dexie Cloud', async () => {
    await local.weeklyReviews.add(review());
    await local.acceptedCalorieAdjustments.add(adjustment());
    await cloud.realNutritionTracking.add({
      ...aggregate(),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 123,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealNutritionTrackingSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    expect(preview.differingEntityCount).toBe(0);
  });

  it('refuse un ajustement local orphelin', async () => {
    await local.acceptedCalorieAdjustments.add(adjustment());

    await expect(synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    )).rejects.toThrow('référence un bilan absent');
  });

  it('refuse un ajustement attaché à un bilan non accepté', async () => {
    await local.weeklyReviews.add(review('2026-07-01T08:00:00.000Z', 'pending'));
    await local.acceptedCalorieAdjustments.add(adjustment());

    await expect(synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    )).rejects.toThrow('sans décision acceptée');
  });

  it('recalcule les objectifs quotidiens devenus obsolètes', async () => {
    const historicalSnapshot = buildDailyTargetEnergyInputSnapshot(
      {
        ...profile(),
        heightCm: 185,
        occupationalActivity: 'veryActive',
      },
      createDefaultAppSettings(),
    );
    await local.userProfile.add(profile());
    await local.weights.bulkAdd([
      {
        id: 'weight:2026-06-23',
        date: '2026-06-23',
        weightKg: 72,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'weight:2026-06-27',
        date: '2026-06-27',
        weightKg: 70,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
    await local.dailyTargets.add({
      ...dailyTarget(historicalSnapshot),
      plannedActivities: [],
      stepBasis: {
        mode: 'expected',
        steps: 8_000,
        stepGoal: 8_000,
        source: 'profileFallback',
        confidence: 'fallback',
        observedDayCount: 0,
        observationWindowDays: 0,
      },
    });
    await cloud.realNutritionTracking.add({
      ...aggregate(),
      id: '#weekly-review:2026-06-22',
      owner: 'user-1',
    });

    const result = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.recalculatedDailyTargets).toBe(1);
    const recalculatedTarget = await local.dailyTargets.get(
      'daily-target:2026-07-01',
    );
    expect(recalculatedTarget).toMatchObject({
        acceptedCalibrationAdjustmentKcal: 100,
        calculationWeightKg: 70,
        calculationVersion: DAILY_TARGET_CALCULATION_VERSION,
      });
    expect(recalculatedTarget?.energyInputSnapshot).toEqual(historicalSnapshot);
    expect(recalculatedTarget?.energy.occupationalBaseKcal).toBe(
      recalculatedTarget!.energy.bmrKcal * 1.45,
    );
    expect(recalculatedTarget?.stepBasis?.steps).toBe(8_000);
  });

  it('isole les bilans appartenant à un autre compte', async () => {
    await cloud.realNutritionTracking.add({
      ...aggregate(),
      id: '#weekly-review:2026-06-22',
      owner: 'other-user',
    });

    const result = await synchronizeRealNutritionTracking(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedReviews).toBe(0);
    expect(await local.weeklyReviews.count()).toBe(0);
  });
});
