import type { NewEntity } from '@/domain/models/common';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieRecipeRepository } from '@/infrastructure/repositories/dexie/DexieRecipeRepository';
import { DexieTargetRepository } from '@/infrastructure/repositories/dexie/DexieTargetRepository';
import { DexieWeeklyReviewRepository } from '@/infrastructure/repositories/dexie/DexieWeeklyReviewRepository';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-complex-repository-test-${crypto.randomUUID()}`);
}

describe('repositories Dexie complexes', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('réutilise un repas existant et supprime ses entrées en cascade', async () => {
    const repository = new DexieFoodRepository(database);
    const product = await repository.createProduct({
      name: 'Riz cuit',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 130,
        proteinGrams: 2.7,
        carbohydratesGrams: 28,
        fatGrams: 0.3,
      },
      source: { type: 'manual' },
      isNutritionComplete: true,
      isFavorite: false,
      isArchived: false,
    });
    const firstMeal = await repository.getOrCreateMeal('2026-06-23', 'lunch');
    const secondMeal = await repository.getOrCreateMeal('2026-06-23', 'lunch');

    await repository.createEntry({
      date: '2026-06-23',
      mealId: firstMeal.id,
      mealSlot: 'lunch',
      sourceType: 'product',
      reference: {
        sourceType: 'product',
        productId: product.id,
        inputMode: 'amount',
        inputQuantity: 150,
        normalizedAmount: 150,
        normalizedUnit: 'g',
        nutritionPer100Snapshot: product.nutritionPer100,
      },
    });

    expect(secondMeal.id).toBe(firstMeal.id);
    expect(await database.meals.count()).toBe(1);
    expect(await database.foodEntries.count()).toBe(1);

    await repository.deleteMeal(firstMeal.id);

    expect(await database.meals.count()).toBe(0);
    expect(await database.foodEntries.count()).toBe(0);
  });

  it('remplace atomiquement les ingrédients d’une recette', async () => {
    const repository = new DexieRecipeRepository(database);
    const recipe = await repository.create({ name: 'Bol énergétique', numberOfServings: 2 });

    const firstIngredients = await repository.replaceIngredients(recipe.id, [
      {
        productId: 'product-rice',
        quantity: 200,
        unit: 'g',
        sortOrder: 0,
        nutritionPer100Snapshot: {
          caloriesKcal: 130,
          proteinGrams: 2.7,
          carbohydratesGrams: 28,
          fatGrams: 0.3,
        },
      },
      {
        productId: 'product-chicken',
        quantity: 150,
        unit: 'g',
        sortOrder: 1,
        nutritionPer100Snapshot: {
          caloriesKcal: 165,
          proteinGrams: 31,
          carbohydratesGrams: 0,
          fatGrams: 3.6,
        },
      },
    ]);

    const secondIngredients = await repository.replaceIngredients(recipe.id, [
      {
        productId: 'product-rice',
        quantity: 250,
        unit: 'g',
        sortOrder: 0,
        nutritionPer100Snapshot: firstIngredients[0]!.nutritionPer100Snapshot,
      },
    ]);

    expect(firstIngredients).toHaveLength(2);
    expect(secondIngredients).toHaveLength(1);
    expect(await repository.listIngredients(recipe.id)).toHaveLength(1);
  });

  it('maintient un objectif et un statut de journal uniques par date', async () => {
    const repository = new DexieTargetRepository(database);
    const targetInput = {
      date: '2026-06-23',
      calculationWeightKg: 60,
      energy: {
        bmrKcal: 1_600,
        occupationalBaseKcal: 1_920,
        walkingKcal: 120,
        runningKcal: 0,
        swimmingKcal: 0,
        strengthTrainingKcal: 0,
        otherActivitiesKcal: 0,
        totalEstimatedExpenditureKcal: 2_040,
      },
      goalAdjustmentKcal: 0,
      acceptedCalibrationAdjustmentKcal: 0,
      calorieFloorKcal: 1_760,
      targetCaloriesKcal: 2_040,
      macros: {
        proteinGrams: 110,
        carbohydratesGrams: 265,
        fatGrams: 55,
      },
      calculationVersion: 1,
    } as const;

    const firstTarget = await repository.upsertTarget(targetInput);
    const secondTarget = await repository.upsertTarget({
      ...targetInput,
      targetCaloriesKcal: 2_100,
    });
    await repository.upsertJournalStatus({ date: '2026-06-23', isComplete: false });
    await repository.upsertJournalStatus({ date: '2026-06-23', isComplete: true });

    expect(secondTarget.id).toBe(firstTarget.id);
    expect(secondTarget.targetCaloriesKcal).toBe(2_100);
    expect(await database.dailyTargets.count()).toBe(1);
    expect(await database.dailyJournalStatuses.count()).toBe(1);
  });

  it('conserve un seul bilan par semaine et historise les ajustements', async () => {
    const repository = new DexieWeeklyReviewRepository(database);
    const reviewInput: NewEntity<WeeklyReview> = {
      weekStart: '2026-06-22',
      weekEnd: '2026-06-28',
      previousWeekStart: '2026-06-15',
      previousWeekEnd: '2026-06-21',
      weighInCount: 4,
      previousWeighInCount: 3,
      trackedFoodDays: 6,
      completedFoodDays: 6,
      calorieComparableDays: 6,
      averageWeightKg: 60,
      previousAverageWeightKg: 60,
      actualWeightChangeKg: 0,
      targetWeightChangeKg: 0,
      averageConsumedCaloriesKcal: 2_000,
      averageTargetCaloriesKcal: 2_000,
      calorieDeviationPercent: 0,
      calorieAdherencePercent: 100,
      proteinTargetDays: 5,
      stepGoalDays: 5,
      recordedStepDays: 6,
      isCalibrationEligible: true,
      ineligibilityReasons: [],
      rawProposedAdjustmentKcal: 0,
      proposedDecision: 'keep',
      proposedAdjustmentKcal: 0,
      currentCumulativeAdjustmentKcal: 0,
      resultingCumulativeAdjustmentKcal: 0,
      adherenceScore: 88,
      adherenceLevel: 'excellent',
      decisionStatus: 'pending',
    };

    const firstReview = await repository.upsert(reviewInput);
    const secondReview = await repository.upsert({ ...reviewInput, adherenceScore: 90 });
    const decision = await repository.accept(secondReview.weekStart, {
      weeklyReviewId: secondReview.id,
      effectiveFrom: '2026-06-29',
      adjustmentKcalPerDay: 50,
      resultingCumulativeAdjustmentKcal: 50,
      status: 'active',
    });

    expect(secondReview.id).toBe(firstReview.id);
    expect(decision.review.decisionStatus).toBe('accepted');
    expect(decision.adjustment?.adjustmentKcalPerDay).toBe(50);
    expect(await database.weeklyReviews.count()).toBe(1);
    expect(await repository.listAdjustments()).toHaveLength(1);
  });
});
