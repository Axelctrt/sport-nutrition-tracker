import Dexie from "dexie";
import "fake-indexeddb/auto";

import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import {
  createSelectiveDataResetPlan,
  getSelectiveDataResetPreview,
  resetSelectedData,
} from "@/infrastructure/database/selectiveDataResetService";

function createDatabaseName(): string {
  return `sportpilot-selective-reset-${crypto.randomUUID()}`;
}

async function addRecord(
  database: AppDatabase,
  tableName: string,
  record: object,
): Promise<void> {
  await database.table(tableName).add(record);
}

describe("selectiveDataResetService", () => {
  let databaseName: string;
  let database: AppDatabase;

  beforeEach(async () => {
    databaseName = createDatabaseName();
    database = new AppDatabase(databaseName);
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await Dexie.delete(databaseName);
  });

  it("supprime uniquement les activités et les données dérivées", async () => {
    await addRecord(database, "userProfile", {
      id: "profile",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "appSettings", {
      id: "settings",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "weights", {
      id: "weight",
      date: "2026-06-27",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "dailySteps", {
      id: "steps",
      date: "2026-06-27",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "activities", {
      id: "activity",
      date: "2026-06-27",
      type: "running",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "weeklyReviews", {
      id: "review",
      weekStart: "2026-06-22",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "acceptedCalorieAdjustments", {
      id: "adjustment",
      effectiveFrom: "2026-06-27",
      status: "accepted",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "migrationJournal", {
      id: "schema-version-3",
      version: 3,
      status: "succeeded",
      source: "migration",
      appliedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "databaseDiagnostics", {
      id: "latest",
      checkedAt: "2026-06-27T10:00:00.000Z",
      status: "healthy",
      schemaVersion: 3,
    });

    const result = await resetSelectedData(["activityHistory"], database);

    expect(result.deletedRecordCount).toBe(4);
    expect(result.includesDerivedReviewData).toBe(true);
    expect(await database.dailySteps.count()).toBe(0);
    expect(await database.activities.count()).toBe(0);
    expect(await database.weeklyReviews.count()).toBe(0);
    expect(await database.acceptedCalorieAdjustments.count()).toBe(0);
    expect(await database.weights.count()).toBe(1);
    expect(await database.userProfile.count()).toBe(1);
    expect(await database.appSettings.count()).toBe(1);
    expect(await database.migrationJournal.count()).toBe(1);
    expect(await database.databaseDiagnostics.count()).toBe(1);
  });

  it("ajoute le journal nutritionnel quand la bibliothèque est sélectionnée", async () => {
    await addRecord(database, "foodProducts", {
      id: "product",
      name: "Produit test",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "meals", {
      id: "meal",
      date: "2026-06-27",
      slot: "lunch",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "foodEntries", {
      id: "entry",
      date: "2026-06-27",
      mealId: "meal",
      mealSlot: "lunch",
      sourceType: "product",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });

    const preview = await getSelectiveDataResetPreview(
      ["nutritionLibrary"],
      database,
    );

    expect(preview.automaticallyIncludedCategories).toEqual([
      "nutritionHistory",
    ]);
    expect(preview.totalRecordCount).toBe(3);
    expect(preview.tableNames).toEqual(
      expect.arrayContaining(["foodProducts", "meals", "foodEntries"]),
    );

    await resetSelectedData(["nutritionLibrary"], database);

    expect(await database.foodProducts.count()).toBe(0);
    expect(await database.meals.count()).toBe(0);
    expect(await database.foodEntries.count()).toBe(0);
  });

  it("recrée le catalogue système après suppression de la bibliothèque de musculation", async () => {
    await addRecord(database, "exerciseDefinitions", {
      id: "custom:test",
      name: "Exercice test",
      source: "custom",
      primaryMuscleGroup: "chest",
      equipment: "other",
      isArchived: false,
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "workoutTemplates", {
      id: "template",
      name: "Modèle test",
      isArchived: false,
      updatedAt: "2026-06-27T10:00:00.000Z",
    });
    await addRecord(database, "workoutSessions", {
      id: "session",
      date: "2026-06-27",
      status: "completed",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });

    const result = await resetSelectedData(["strengthLibrary"], database);

    expect(result.automaticallyIncludedCategories).toEqual(["strengthHistory"]);
    expect(result.restoredCatalogExerciseCount).toBeGreaterThan(0);
    expect(await database.workoutTemplates.count()).toBe(0);
    expect(await database.workoutSessions.count()).toBe(0);
    expect(await database.exerciseDefinitions.get("custom:test")).toBeUndefined();
    expect(
      await database.exerciseDefinitions.where("source").equals("catalog").count(),
    ).toBeGreaterThan(0);
  });

  it("refuse une réinitialisation sans sélection", async () => {
    expect(createSelectiveDataResetPlan([]).tableNames).toEqual([]);
    await expect(resetSelectedData([], database)).rejects.toThrow(
      "Sélectionne au moins une catégorie",
    );
  });
});
