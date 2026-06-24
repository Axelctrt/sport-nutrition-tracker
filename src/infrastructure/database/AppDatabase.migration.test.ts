import Dexie from 'dexie';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { APP_SETTINGS_ID, LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { StrengthTrainingActivity } from '@/domain/models/activity';
import type { FoodProduct } from '@/domain/models/food';
import type { Recipe } from '@/domain/models/recipe';
import type { UserProfile } from '@/domain/models/profile';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { schemaVersion1 } from '@/infrastructure/database/schema';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

function createDatabaseName(): string {
  return `sportpilot-migration-test-${crypto.randomUUID()}`;
}

describe('migration Dexie vers le schéma version 2', () => {
  it('conserve les données du MVP et ajoute les tables de musculation sans conversion destructive', async () => {
    const databaseName = createDatabaseName();
    const oldDatabase = new Dexie(databaseName);
    oldDatabase.version(1).stores(schemaVersion1);
    await oldDatabase.open();

    const profile = createEntity<UserProfile>(
      createProfileInput(),
      LOCAL_USER_PROFILE_ID,
      '2026-06-24T10:00:00.000Z',
    );
    const settings = createDefaultAppSettings();
    const weight = createEntity(
      { date: '2026-06-24', weightKg: 60 },
      'weight-1',
      '2026-06-24T10:00:00.000Z',
    );
    const steps = createEntity(
      { date: '2026-06-24', totalSteps: 9_000, source: 'manual' as const },
      'steps-1',
      '2026-06-24T10:00:00.000Z',
    );
    const historicalStrengthActivity = createEntity<StrengthTrainingActivity>(
      {
        type: 'strengthTraining',
        date: '2026-06-24',
        durationMinutes: 50,
        intensity: 'moderate',
        rpe: 7,
        met: 5,
        calculation: {
          weightKg: 60,
          estimatedCaloriesKcal: 262.5,
          metUsed: 5,
          calculationVersion: 1,
        },
      },
      'activity-strength-1',
      '2026-06-24T10:00:00.000Z',
    );
    const product = createEntity<FoodProduct>(
      {
        name: 'Yaourt nature',
        basisUnit: 'g',
        nutritionPer100: {
          caloriesKcal: 60,
          proteinGrams: 4,
          carbohydratesGrams: 5,
          fatGrams: 2,
        },
        source: { type: 'manual' },
        isNutritionComplete: true,
        isFavorite: false,
        isArchived: false,
      },
      'product-1',
      '2026-06-24T10:00:00.000Z',
    );
    const recipe = createEntity<Recipe>(
      { name: 'Petit-déjeuner', numberOfServings: 1 },
      'recipe-1',
      '2026-06-24T10:00:00.000Z',
    );

    await oldDatabase.table('userProfile').add(profile);
    await oldDatabase.table('appSettings').add(settings);
    await oldDatabase.table('weights').add(weight);
    await oldDatabase.table('dailySteps').add(steps);
    await oldDatabase.table('activities').add(historicalStrengthActivity);
    await oldDatabase.table('foodProducts').add(product);
    await oldDatabase.table('recipes').add(recipe);
    oldDatabase.close();

    const upgradedDatabase = new AppDatabase(databaseName);
    await upgradedDatabase.open();

    expect(await upgradedDatabase.userProfile.get(LOCAL_USER_PROFILE_ID)).toEqual(profile);
    expect(await upgradedDatabase.appSettings.get(APP_SETTINGS_ID)).toEqual(settings);
    expect(await upgradedDatabase.weights.get('weight-1')).toEqual(weight);
    expect(await upgradedDatabase.dailySteps.get('steps-1')).toEqual(steps);
    expect(await upgradedDatabase.activities.get('activity-strength-1')).toEqual(
      historicalStrengthActivity,
    );
    expect(await upgradedDatabase.foodProducts.get('product-1')).toEqual(product);
    expect(await upgradedDatabase.recipes.get('recipe-1')).toEqual(recipe);

    expect(await upgradedDatabase.exerciseDefinitions.count()).toBe(0);
    expect(await upgradedDatabase.workoutTemplates.count()).toBe(0);
    expect(await upgradedDatabase.workoutTemplateExercises.count()).toBe(0);
    expect(await upgradedDatabase.workoutSessions.count()).toBe(0);
    expect(await upgradedDatabase.workoutSessionExercises.count()).toBe(0);
    expect(await upgradedDatabase.strengthSets.count()).toBe(0);
    expect(await upgradedDatabase.progressionSuggestions.count()).toBe(0);

    upgradedDatabase.close();
    await Dexie.delete(databaseName);
  });
});
