import Dexie from 'dexie';

import type { DataSpaceStorage } from '@/infrastructure/data-spaces/dataSpaceRegistry';
import {
  applyPreparedGuestDataImport,
  prepareGuestDataImport,
} from '@/infrastructure/data-spaces/guestDataImportService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  DEFAULT_DATABASE_NAME,
  accountDatabaseNameForFingerprint,
} from '@/infrastructure/database/databaseNames';

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const ACCOUNT = 'acct-d2f00baa';
const TARGET_DATABASE = accountDatabaseNameForFingerprint(ACCOUNT);
const GUEST_DATABASE = `${DEFAULT_DATABASE_NAME}-d2-test`;

function metadata(id: string, updatedAt: string) {
  return {
    id,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt,
  };
}

async function resetDatabases(): Promise<void> {
  for (const name of [GUEST_DATABASE, TARGET_DATABASE]) {
    if (await Dexie.exists(name)) await Dexie.delete(name);
  }
}

describe('guestDataImportService', () => {
  beforeEach(resetDatabases);
  afterEach(resetDatabases);

  it('analyse puis fusionne les données invitées sans modifier la source', async () => {
    const guest = new AppDatabase(GUEST_DATABASE);
    const account = new AppDatabase(TARGET_DATABASE);
    await guest.open();
    await account.open();

    await account.weights.put({
      ...metadata('weight-account', '2026-07-01T08:00:00.000Z'),
      date: '2026-07-01',
      weightKg: 61.5,
    });
    await guest.weights.put({
      ...metadata('weight-guest', '2026-07-02T08:00:00.000Z'),
      date: '2026-07-01',
      weightKg: 60.9,
      note: 'Plus récente',
    });

    await account.foodProducts.put({
      ...metadata('product-account', '2026-07-01T08:00:00.000Z'),
      name: 'Produit compte',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 100,
        proteinGrams: 10,
        carbohydratesGrams: 10,
        fatGrams: 2,
      },
      barcode: '3017620422003',
      source: {
        type: 'openFoodFacts',
        fetchedAt: '2026-07-01T08:00:00.000Z',
        barcode: '3017620422003',
      },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });
    await guest.foodProducts.put({
      ...metadata('product-guest', '2026-07-02T08:00:00.000Z'),
      name: 'Produit invité actualisé',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 105,
        proteinGrams: 11,
        carbohydratesGrams: 10,
        fatGrams: 2,
      },
      barcode: '3017620422003',
      source: {
        type: 'openFoodFacts',
        fetchedAt: '2026-07-02T08:00:00.000Z',
        barcode: '3017620422003',
      },
      isNutritionComplete: true,
      isFavorite: true,
      isArchived: false,
    });

    await account.meals.put({
      ...metadata('meal-account', '2026-07-01T08:00:00.000Z'),
      date: '2026-07-01',
      slot: 'breakfast',
      title: 'Petit-déjeuner compte',
    });
    await guest.meals.put({
      ...metadata('meal-guest', '2026-07-02T08:00:00.000Z'),
      date: '2026-07-01',
      slot: 'breakfast',
      title: 'Petit-déjeuner invité',
    });
    await guest.foodEntries.put({
      ...metadata('entry-guest', '2026-07-02T08:05:00.000Z'),
      date: '2026-07-01',
      mealId: 'meal-guest',
      mealSlot: 'breakfast',
      sourceType: 'product',
      reference: {
        sourceType: 'product',
        productId: 'product-guest',
        inputMode: 'amount',
        inputQuantity: 100,
        normalizedAmount: 100,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: {
          caloriesKcal: 105,
          proteinGrams: 11,
          carbohydratesGrams: 10,
          fatGrams: 2,
        },
      },
    });

    await account.weeklyReviews.put({
      ...metadata('review-account', '2026-07-01T08:00:00.000Z'),
      weekStart: '2026-06-22',
      weekEnd: '2026-06-28',
      previousWeekStart: '2026-06-15',
      previousWeekEnd: '2026-06-21',
      weighInCount: 2,
      previousWeighInCount: 2,
      trackedFoodDays: 7,
      completedFoodDays: 7,
      calorieComparableDays: 7,
      targetWeightChangeKg: 0,
      proteinTargetDays: 7,
      stepGoalDays: 7,
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
      decisionStatus: 'accepted',
    });
    await guest.weeklyReviews.put({
      ...(await account.weeklyReviews.get('review-account'))!,
      id: 'review-guest',
      adherenceScore: 95,
      updatedAt: '2026-07-02T08:00:00.000Z',
    });
    await guest.acceptedCalorieAdjustments.put({
      ...metadata('adjustment-guest', '2026-07-02T08:10:00.000Z'),
      weeklyReviewId: 'review-guest',
      effectiveFrom: '2026-06-29',
      adjustmentKcalPerDay: 100,
      resultingCumulativeAdjustmentKcal: 100,
      status: 'active',
    });

    const prepared = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });

    expect(prepared.preview.hasGuestData).toBe(true);
    expect(prepared.preview.recordsToAdd).toBeGreaterThanOrEqual(2);
    expect(prepared.preview.recordsToUpdate).toBeGreaterThanOrEqual(3);

    const sourceCountBefore = await guest.tables.reduce(
      async (promise, table) => (await promise) + (await table.count()),
      Promise.resolve(0),
    );

    const result = await applyPreparedGuestDataImport(prepared, {
      sourceDatabase: guest,
      targetDatabase: account,
      storage: new MemoryStorage(),
      now: '2026-07-02T09:00:00.000Z',
    });

    expect(result.sourcePreserved).toBe(true);
    expect(await guest.tables.reduce(
      async (promise, table) => (await promise) + (await table.count()),
      Promise.resolve(0),
    )).toBe(sourceCountBefore);

    expect(await account.weights.toArray()).toEqual([
      expect.objectContaining({
        id: 'weight-account',
        date: '2026-07-01',
        weightKg: 60.9,
      }),
    ]);
    expect(await account.foodProducts.toArray()).toEqual([
      expect.objectContaining({
        id: 'product-account',
        name: 'Produit invité actualisé',
      }),
    ]);
    expect(await account.meals.toArray()).toEqual([
      expect.objectContaining({
        id: 'meal-account',
        title: 'Petit-déjeuner invité',
      }),
    ]);
    expect(await account.foodEntries.get('entry-guest')).toEqual(
      expect.objectContaining({
        mealId: 'meal-account',
        reference: expect.objectContaining({ productId: 'product-account' }),
      }),
    );
    expect(await account.weeklyReviews.toArray()).toEqual([
      expect.objectContaining({
        id: 'review-account',
        adherenceScore: 95,
      }),
    ]);
    expect(await account.acceptedCalorieAdjustments.get('adjustment-guest')).toEqual(
      expect.objectContaining({ weeklyReviewId: 'review-account' }),
    );

    const secondPreview = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });
    expect(secondPreview.preview.recordsToAdd).toBe(0);
    expect(secondPreview.preview.recordsToUpdate).toBe(0);
    expect(secondPreview.preview.recordsToRemove).toBe(0);

    guest.close();
    account.close();
  });

  it('conserve la donnée du compte lorsqu’elle est plus récente', async () => {
    const guest = new AppDatabase(GUEST_DATABASE);
    const account = new AppDatabase(TARGET_DATABASE);
    await guest.open();
    await account.open();

    await guest.dailySteps.put({
      ...metadata('steps-guest', '2026-07-01T08:00:00.000Z'),
      date: '2026-07-01',
      totalSteps: 5_000,
      source: 'manual',
    });
    await account.dailySteps.put({
      ...metadata('steps-account', '2026-07-02T08:00:00.000Z'),
      date: '2026-07-01',
      totalSteps: 10_000,
      source: 'manual',
    });

    const prepared = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });
    await applyPreparedGuestDataImport(prepared, {
      sourceDatabase: guest,
      targetDatabase: account,
      storage: new MemoryStorage(),
    });

    expect(await account.dailySteps.toArray()).toEqual([
      expect.objectContaining({
        id: 'steps-account',
        totalSteps: 10_000,
      }),
    ]);

    guest.close();
    account.close();
  });

  it('refuse l’import si la source change après l’analyse', async () => {
    const guest = new AppDatabase(GUEST_DATABASE);
    const account = new AppDatabase(TARGET_DATABASE);
    await guest.open();
    await account.open();

    await guest.weights.put({
      ...metadata('weight-guest', '2026-07-01T08:00:00.000Z'),
      date: '2026-07-01',
      weightKg: 61,
    });
    const prepared = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });
    await guest.weights.put({
      ...metadata('weight-new', '2026-07-02T08:00:00.000Z'),
      date: '2026-07-02',
      weightKg: 60.8,
    });

    await expect(
      applyPreparedGuestDataImport(prepared, {
        sourceDatabase: guest,
        targetDatabase: account,
        storage: new MemoryStorage(),
      }),
    ).rejects.toThrow('données invitées ont changé');
    expect(await account.weights.count()).toBe(0);

    guest.close();
    account.close();
  });

  it('refuse l’import si le compte change après l’analyse', async () => {
    const guest = new AppDatabase(GUEST_DATABASE);
    const account = new AppDatabase(TARGET_DATABASE);
    await guest.open();
    await account.open();

    await guest.weights.put({
      ...metadata('weight-guest', '2026-07-01T08:00:00.000Z'),
      date: '2026-07-01',
      weightKg: 61,
    });
    const prepared = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });
    await account.weights.put({
      ...metadata('weight-account', '2026-07-02T08:00:00.000Z'),
      date: '2026-07-02',
      weightKg: 60.8,
    });

    await expect(
      applyPreparedGuestDataImport(prepared, {
        sourceDatabase: guest,
        targetDatabase: account,
        storage: new MemoryStorage(),
      }),
    ).rejects.toThrow('données du compte ont changé');
    expect(await account.weights.get('weight-account')).toBeDefined();

    guest.close();
    account.close();
  });

  it('ne fabrique pas de createdAt pour les états utilisateur qui n’en possèdent pas', async () => {
    const guest = new AppDatabase(GUEST_DATABASE);
    const account = new AppDatabase(TARGET_DATABASE);
    await guest.open();
    await account.open();

    const earnedAchievement = {
      id: 'first-session' as const,
      earnedAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
    };
    const unlockedTheme = {
      id: 'classic' as const,
      unlockedAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
    };
    const themePreference = {
      id: 'visual-theme-preference' as const,
      activeThemeId: 'classic' as const,
      updatedAt: '2026-07-01T08:00:00.000Z',
    };

    await account.earnedAchievements.put(earnedAchievement);
    await account.unlockedVisualThemes.put(unlockedTheme);
    await account.visualThemePreferences.put(themePreference);
    await account.weeklyMissionCompletions.put({
      id: 'weekly-mission:2026-06-29',
      weekStart: '2026-06-29',
      completedAt: '2026-07-05T08:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z',
    });
    await account.routineReminderCompletions.put({
      id: 'routine-reminder:2026-07-01:weighIn',
      date: '2026-07-01',
      type: 'weighIn',
      completedAt: '2026-07-01T08:30:00.000Z',
      updatedAt: '2026-07-01T08:30:00.000Z',
    });

    await guest.earnedAchievements.put(earnedAchievement);
    await guest.unlockedVisualThemes.put(unlockedTheme);
    await guest.visualThemePreferences.put(themePreference);

    const prepared = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });
    const progress = prepared.preview.categories.find(
      ({ key }) => key === 'progress',
    );

    expect(progress).toEqual(
      expect.objectContaining({
        guestRecords: 3,
        accountRecords: 5,
        recordsToAdd: 0,
        recordsToUpdate: 0,
        recordsToRemove: 0,
      }),
    );
    expect(prepared.preview.recordsToUpdate).toBe(0);
    for (const table of [
      account.earnedAchievements,
      account.unlockedVisualThemes,
      account.visualThemePreferences,
      account.weeklyMissionCompletions,
      account.routineReminderCompletions,
    ]) {
      for (const row of await table.toArray()) {
        expect(row).not.toHaveProperty('createdAt');
      }
    }

    guest.close();
    account.close();
  });

  it('respecte les suppressions invitées plus récentes', async () => {
    const guest = new AppDatabase(GUEST_DATABASE);
    const account = new AppDatabase(TARGET_DATABASE);
    await guest.open();
    await account.open();

    await account.activities.put({
      ...metadata('activity-old', '2026-07-01T08:00:00.000Z'),
      date: '2026-07-01',
      type: 'running',
      durationMinutes: 30,
      intensity: 'moderate',
      sessionType: 'easy',
      distanceKm: 5,
      averageCadenceSpm: 168,
      calculation: {
        weightKg: 61,
        estimatedCaloriesKcal: 300,
        calculationVersion: 1,
      },
    });
    await guest.deletionRecords.put({
      ...metadata('deletion:activity:activity-old', '2026-07-02T08:00:00.000Z'),
      entityType: 'activity',
      entityId: 'activity-old',
      status: 'deleted',
      deletedAt: '2026-07-02T08:00:00.000Z',
    });

    const prepared = await prepareGuestDataImport(ACCOUNT, {
      sourceDatabase: guest,
      targetDatabase: account,
    });
    expect(prepared.preview.recordsToRemove).toBe(1);

    await applyPreparedGuestDataImport(prepared, {
      sourceDatabase: guest,
      targetDatabase: account,
      storage: new MemoryStorage(),
    });
    expect(await account.activities.count()).toBe(0);
    expect(await account.deletionRecords.get('deletion:activity:activity-old')).toBeDefined();

    guest.close();
    account.close();
  });
});
