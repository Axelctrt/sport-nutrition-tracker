import Dexie, { type Table } from 'dexie';
import type { UserProfile } from '@/domain/models/profile';
import type { DailyTarget } from '@/domain/models/targets';
import type {
  AcceptedCalorieAdjustment,
  WeeklyReview,
} from '@/domain/models/weeklyReview';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
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

  constructor() {
    super(`sportpilot-c3-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({ realNutritionTracking: 'id, updatedAt' });
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

function aggregate(
  reviewValue = review(),
  adjustmentValue = adjustment(),
): NutritionTrackingAggregate {
  return {
    id: reviewValue.id,
    review: reviewValue,
    adjustments: [adjustmentValue],
    updatedAt: adjustmentValue.updatedAt,
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

function dailyTarget(): DailyTarget {
  return {
    id: 'daily-target:2026-07-01',
    date: '2026-07-01',
    calculationWeightKg: 70,
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
    await local.userProfile.add(profile());
    await local.dailyTargets.add(dailyTarget());
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
    expect(await local.dailyTargets.get('daily-target:2026-07-01'))
      .toMatchObject({ acceptedCalibrationAdjustmentKcal: 100 });
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
