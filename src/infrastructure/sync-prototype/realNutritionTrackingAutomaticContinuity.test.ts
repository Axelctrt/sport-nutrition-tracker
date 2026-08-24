import Dexie, { type Table } from 'dexie';

import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import { buildDailyTargetEnergyInputSnapshot } from '@/domain/calculations/dailyTargetInputSnapshot';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { UserProfile } from '@/domain/models/profile';
import type {
  DailyTarget,
  DailyTargetEnergyInputSnapshot,
} from '@/domain/models/targets';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import { DexieWeeklyReviewRepository } from '@/infrastructure/repositories/dexie/DexieWeeklyReviewRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealNutritionJournalSync,
  synchronizeRealNutritionJournal,
  type NutritionJournalDayAggregate,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import {
  previewRealNutritionTrackingSync,
  synchronizeRealNutritionTracking,
  type NutritionTrackingAggregate,
} from '@/infrastructure/sync-prototype/realNutritionTrackingSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'nutrition-tracking-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;
const TARGET_DATE = '2026-08-19';
const WEEK_START = '2026-08-10';
const REVIEW_ID = 'weekly-review:2026-08-10';
const CREATED_AT = '2026-08-10T08:00:00.000Z';

type CloudMetadata = {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
  syncRevision?: number;
  syncActorId?: string;
};
type CloudTracking = NutritionTrackingAggregate & CloudMetadata;
type CloudDay = NutritionJournalDayAggregate & CloudMetadata;

type CloudJournalMarker = {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  deletedAt?: string;
  updatedAt: string;
} & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realNutritionTracking: Table<CloudTracking, string>;
  declare realNutritionJournalDays: Table<CloudDay, string>;
  declare realNutritionJournalDeletionRecords: Table<CloudJournalMarker, string>;

  constructor(label: string) {
    super(`sportpilot-nutrition-tracking-a-b-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realNutritionTracking: 'id, updatedAt',
      realNutritionJournalDays: 'id, date, updatedAt',
      realNutritionJournalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

function profile(): UserProfile {
  return {
    id: 'profile-tracking-a-b',
    sexForEnergyEquation: 'male',
    ageInformation: { mode: 'age', ageYears: 30, recordedOn: TARGET_DATE },
    heightCm: 178,
    initialWeightKg: 70,
    goal: 'maintenance',
    targetWeeklyWeightChangePercent: 0,
    occupationalActivity: 'sedentary',
    dailyStepGoal: 8_000,
    proteinGramsPerKg: 1.8,
    fatGramsPerKg: 0.8,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function staleDailyTarget(
  energyInputSnapshot: DailyTargetEnergyInputSnapshot,
): DailyTarget {
  return {
    id: `daily-target:${TARGET_DATE}`,
    date: TARGET_DATE,
    calculationWeightKg: 70,
    energyInputSnapshot,
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
    macros: {
      proteinGrams: 126,
      carbohydratesGrams: 250,
      fatGrams: 56,
    },
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
    calculationVersion: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function pendingReviewInput(): Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    weekStart: WEEK_START,
    weekEnd: '2026-08-16',
    previousWeekStart: '2026-08-03',
    previousWeekEnd: '2026-08-09',
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
    decisionStatus: 'pending',
  };
}

function createDeviceClient(
  local: AppDatabase,
  cloud: TestCloudDatabase,
): SyncPrototypeClient {
  let snapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realNutritionJournal: { enabled: true, status: 'idle' },
    realNutritionTracking: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  } as SyncPrototypeSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealNutritionJournal = vi.fn(async () => {
    const preview = await previewRealNutritionJournalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realNutritionJournal: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });

  const analyzeRealNutritionTracking = vi.fn(async () => {
    const preview = await previewRealNutritionTrackingSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realNutritionTracking: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealNutritionJournal,
    syncRealNutritionJournal: vi.fn(async () =>
      synchronizeRealNutritionJournal(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )),
    analyzeRealNutritionTracking,
    syncRealNutritionTracking: vi.fn(async () =>
      synchronizeRealNutritionTracking(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )),
  } as unknown as SyncPrototypeClient;
}

async function replicateCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const [tracking, days, markers] = await Promise.all([
    source.realNutritionTracking.toArray(),
    source.realNutritionJournalDays.toArray(),
    source.realNutritionJournalDeletionRecords.toArray(),
  ]);
  await Promise.all([
    target.realNutritionTracking.clear(),
    target.realNutritionJournalDays.clear(),
    target.realNutritionJournalDeletionRecords.clear(),
  ]);
  if (tracking.length > 0) await target.realNutritionTracking.bulkPut(tracking);
  if (days.length > 0) await target.realNutritionJournalDays.bulkPut(days);
  if (markers.length > 0) {
    await target.realNutritionJournalDeletionRecords.bulkPut(markers);
  }
}

describe('gate A→B Nutrition Tracking automatique', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    localA = new AppDatabase(`nutrition-tracking-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`nutrition-tracking-b-${crypto.randomUUID()}`);
    cloudA = new TestCloudDatabase('a');
    cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);
  });

  afterEach(async () => {
    const names = [localA.name, localB.name, cloudA.name, cloudB.name];
    localA.close();
    localB.close();
    cloudA.close();
    cloudB.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('propage review + ajustement et chaîne le dailyTarget recalculé vers Journal puis B frais', async () => {
    const settingsA = new DexieSettingsRepository(localA);
    await settingsA.update({
      automaticAccountSyncEnabled: true,
      automaticAccountSyncConnectionMode: 'any-connection',
      automaticAccountSyncAccountFingerprint: FINGERPRINT,
    });

    const currentProfile = profile();
    const historicalSnapshot = buildDailyTargetEnergyInputSnapshot(
      {
        ...currentProfile,
        heightCm: 185,
        occupationalActivity: 'veryActive',
      },
      createDefaultAppSettings(),
    );

    await localA.userProfile.add(currentProfile);
    await localA.weights.bulkAdd([
      {
        id: 'weight:2026-08-11',
        date: '2026-08-11',
        weightKg: 72,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      },
      {
        id: 'weight:2026-08-16',
        date: '2026-08-16',
        weightKg: 70,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      },
    ]);
    const stale = staleDailyTarget(historicalSnapshot);
    await localA.dailyTargets.add(stale);

    const clientA = createDeviceClient(localA, cloudA);
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: settingsA,
      eventTarget: window,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controllerA.initialize();

    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionJournalDays.get(
        `#nutrition-journal:${TARGET_DATE}`,
      )).toMatchObject({ target: { targetCaloriesKcal: stale.targetCaloriesKcal } });
    });

    const reviewsA = new DexieWeeklyReviewRepository(localA);
    const pending = await reviewsA.upsert(pendingReviewInput());
    expect(pending.id).toBe(REVIEW_ID);

    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionTracking.get(`#${REVIEW_ID}`))
        .toMatchObject({ review: { decisionStatus: 'pending' } });
    });

    const accepted = await reviewsA.accept(WEEK_START, {
      weeklyReviewId: REVIEW_ID,
      effectiveFrom: '2026-08-17',
      adjustmentKcalPerDay: 100,
      resultingCumulativeAdjustmentKcal: 100,
      status: 'active',
    });
    expect(accepted.adjustment).toBeDefined();

    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionTracking.get(`#${REVIEW_ID}`))
        .toMatchObject({
          review: { decisionStatus: 'accepted' },
          adjustments: [expect.objectContaining({
            weeklyReviewId: REVIEW_ID,
            adjustmentKcalPerDay: 100,
          })],
        });
    });

    let recalculated: DailyTarget | undefined;
    await vi.waitFor(async () => {
      recalculated = await localA.dailyTargets.get(`daily-target:${TARGET_DATE}`);
      expect(recalculated).toBeDefined();
      expect(recalculated).not.toEqual(stale);
      expect(recalculated?.acceptedCalibrationAdjustmentKcal).toBe(100);

      const cloudDay = await cloudA.realNutritionJournalDays.get(
        `#nutrition-journal:${TARGET_DATE}`,
      );
      expect(cloudDay?.target).toEqual(recalculated);
    });

    expect(clientA.syncRealNutritionTracking).toHaveBeenCalled();
    expect(clientA.syncRealNutritionJournal).toHaveBeenCalled();

    await replicateCloud(cloudA, cloudB);
    const cloudBeforeRestore = {
      tracking: await cloudB.realNutritionTracking.toArray(),
      days: await cloudB.realNutritionJournalDays.toArray(),
    };

    const trackingRestore = await synchronizeRealNutritionTracking(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );
    const journalRestore = await synchronizeRealNutritionJournal(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(trackingRestore.downloadedReviews).toBe(1);
    expect(trackingRestore.downloadedAdjustments).toBe(1);
    expect(journalRestore.downloadedDays).toBe(1);
    expect(await localB.weeklyReviews.get(REVIEW_ID)).toMatchObject({
      decisionStatus: 'accepted',
    });
    expect(await localB.acceptedCalorieAdjustments.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weeklyReviewId: REVIEW_ID,
          adjustmentKcalPerDay: 100,
        }),
      ]),
    );
    expect(await localB.dailyTargets.get(`daily-target:${TARGET_DATE}`))
      .toEqual(recalculated);
    expect(await cloudB.realNutritionTracking.toArray())
      .toEqual(cloudBeforeRestore.tracking);
    expect(await cloudB.realNutritionJournalDays.toArray())
      .toEqual(cloudBeforeRestore.days);

    controllerA.dispose();
  });
});
