import Dexie from "dexie";

import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import {
  DATABASE_VERSION_1,
  DATABASE_VERSION_5,
} from "@/infrastructure/database/migrations/versions";
import {
  allDatabaseTableNames,
  schemaVersion1,
  schemaVersion5,
} from "@/infrastructure/database/schema";

type PersistedRecord = Record<string, unknown> & { id: string };
type FixtureByTable = Record<string, readonly PersistedRecord[]>;

const CREATED_AT = "2026-06-24T10:00:00.000Z";
const UPDATED_AT = "2026-06-24T11:00:00.000Z";

const version1Fixture: FixtureByTable = {
  userProfile: [
    {
      id: "local-user-profile",
      firstName: "Migration",
      birthDate: "2004-01-01",
      sex: "male",
      heightCm: 177,
      activityLevel: "moderate",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  appSettings: [
    {
      id: "app-settings",
      appearanceMode: "dark",
      dashboardWidgets: ["nutrition", "weight", "steps"],
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  weights: [
    {
      id: "weight-1",
      date: "2026-06-24",
      weightKg: 60.4,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  dailySteps: [
    {
      id: "steps-1",
      date: "2026-06-24",
      totalSteps: 9_000,
      source: "manual",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  activities: [
    {
      id: "activity-1",
      type: "running",
      date: "2026-06-24",
      durationMinutes: 45,
      distanceKm: 8.2,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  foodProducts: [
    {
      id: "product-1",
      name: "Yaourt nature",
      barcode: "1234567890123",
      basisUnit: "g",
      nutritionPer100: {
        caloriesKcal: 60,
        proteinGrams: 4,
        carbohydratesGrams: 5,
        fatGrams: 2,
      },
      source: { type: "manual" },
      isNutritionComplete: true,
      isFavorite: true,
      isArchived: false,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  meals: [
    {
      id: "meal-1",
      date: "2026-06-24",
      slot: "breakfast",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  foodEntries: [
    {
      id: "food-entry-1",
      date: "2026-06-24",
      mealId: "meal-1",
      mealSlot: "breakfast",
      sourceType: "product",
      productId: "product-1",
      quantity: 150,
      unit: "g",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  favoriteMeals: [
    {
      id: "favorite-meal-1",
      name: "Petit-déjeuner habituel",
      items: [{ productId: "product-1", quantity: 150, unit: "g" }],
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  recipes: [
    {
      id: "recipe-1",
      name: "Bol protéiné",
      numberOfServings: 1,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  recipeIngredients: [
    {
      id: "recipe-ingredient-1",
      recipeId: "recipe-1",
      productId: "product-1",
      quantity: 150,
      unit: "g",
      sortOrder: 0,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  dailyTargets: [
    {
      id: "daily-target-1",
      date: "2026-06-24",
      caloriesKcal: 2_400,
      proteinGrams: 120,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  dailyJournalStatuses: [
    {
      id: "daily-journal-status-1",
      date: "2026-06-24",
      isComplete: true,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  weeklyReviews: [
    {
      id: "weekly-review-1",
      weekStart: "2026-06-22",
      averageWeightKg: 60.2,
      averageCaloriesKcal: 2_350,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  acceptedCalorieAdjustments: [
    {
      id: "calorie-adjustment-1",
      effectiveFrom: "2026-06-29",
      status: "accepted",
      deltaKcal: 100,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
};

const version2Fixture: FixtureByTable = {
  ...version1Fixture,
  exerciseDefinitions: [
    {
      id: "exercise-definition-1",
      name: "Développé couché",
      source: "custom",
      primaryMuscleGroup: "chest",
      equipment: "barbell",
      isArchived: false,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  workoutTemplates: [
    {
      id: "workout-template-1",
      name: "Haut du corps",
      isArchived: false,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  workoutTemplateExercises: [
    {
      id: "workout-template-exercise-1",
      templateId: "workout-template-1",
      exerciseDefinitionId: "exercise-definition-1",
      sortOrder: 0,
      isActive: true,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  workoutSessions: [
    {
      id: "workout-session-1",
      date: "2026-06-24",
      status: "completed",
      sourceTemplateId: "workout-template-1",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  workoutSessionExercises: [
    {
      id: "workout-session-exercise-1",
      sessionId: "workout-session-1",
      exerciseDefinitionId: "exercise-definition-1",
      sortOrder: 0,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  strengthSets: [
    {
      id: "strength-set-1",
      sessionId: "workout-session-1",
      sessionExerciseId: "workout-session-exercise-1",
      setNumber: 1,
      type: "working",
      repetitions: 8,
      weightKg: 60,
      rpe: 7,
      isCompleted: true,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  progressionSuggestions: [
    {
      id: "progression-suggestion-1",
      sessionId: "workout-session-1",
      sessionExerciseId: "workout-session-exercise-1",
      exerciseDefinitionId: "exercise-definition-1",
      templateExerciseId: "workout-template-exercise-1",
      status: "pending",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
};

function createDatabaseName(): string {
  return `sportpilot-migration-test-${crypto.randomUUID()}`;
}

async function seedDatabase(
  database: Dexie,
  fixture: FixtureByTable,
): Promise<void> {
  for (const [tableName, records] of Object.entries(fixture)) {
    await database.table(tableName).bulkAdd([...records]);
  }
}

async function expectFixture(
  database: Dexie,
  fixture: FixtureByTable,
): Promise<void> {
  for (const [tableName, expectedRecords] of Object.entries(fixture)) {
    const actualRecords = (await database
      .table(tableName)
      .toArray()) as PersistedRecord[];

    const sortedActualRecords = [...actualRecords].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    const sortedExpectedRecords = [...expectedRecords].sort((left, right) =>
      left.id.localeCompare(right.id),
    );

    expect(sortedActualRecords).toEqual(sortedExpectedRecords);
  }
}

describe("chaîne de migrations Dexie", () => {
  it("conserve le contenu complet du schéma v1 pendant la montée vers la v5", async () => {
    const databaseName = createDatabaseName();
    const oldDatabase = new Dexie(databaseName);
    let upgradedDatabase: AppDatabase | undefined;

    try {
      oldDatabase.version(DATABASE_VERSION_1).stores(schemaVersion1);
      await oldDatabase.open();
      await seedDatabase(oldDatabase, version1Fixture);
      oldDatabase.close();

      upgradedDatabase = new AppDatabase(databaseName);
      await upgradedDatabase.open();

      expect(upgradedDatabase.verno).toBe(DATABASE_VERSION_5);
      await expectFixture(upgradedDatabase, version1Fixture);

      for (const tableName of Object.keys(schemaVersion5).filter(
        (name) => !(name in schemaVersion1),
      )) {
        const expectedCount = tableName === "migrationJournal" ? 3 : 0;
        expect(await upgradedDatabase.table(tableName).count()).toBe(
          expectedCount,
        );
      }
    } finally {
      oldDatabase.close();
      upgradedDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });

  it("conserve toutes les tables et relations après fermeture puis réouverture de la v5", async () => {
    const databaseName = createDatabaseName();
    const initialDatabase = new AppDatabase(databaseName);
    let reopenedDatabase: AppDatabase | undefined;

    try {
      await initialDatabase.open();
      await seedDatabase(initialDatabase, version2Fixture);
      initialDatabase.close();

      reopenedDatabase = new AppDatabase(databaseName);
      await reopenedDatabase.open();

      expect(reopenedDatabase.tables.map(({ name }) => name).sort()).toEqual(
        [...allDatabaseTableNames].sort(),
      );
      await expectFixture(reopenedDatabase, version2Fixture);
    } finally {
      initialDatabase.close();
      reopenedDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });

  it("préserve le schéma v5 lors de l’ajout simulé d’une future version 6", async () => {
    const databaseName = createDatabaseName();
    const currentDatabase = new AppDatabase(databaseName);
    let futureDatabase: Dexie | undefined;

    try {
      await currentDatabase.open();
      await seedDatabase(currentDatabase, version2Fixture);
      currentDatabase.close();

      futureDatabase = new AppDatabase(databaseName);
      futureDatabase.version(6).stores({
        ...schemaVersion5,
        migrationProbe: "id",
      });
      await futureDatabase.open();

      expect(futureDatabase.verno).toBe(6);
      await expectFixture(futureDatabase, version2Fixture);
      expect(await futureDatabase.table("migrationProbe").count()).toBe(0);
    } finally {
      currentDatabase.close();
      futureDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });
});
