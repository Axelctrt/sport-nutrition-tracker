import { createDefaultAppSettings } from "@/domain/defaults/appSettings";
import type { BackupData, BackupEnvelope } from "@/domain/models/backup";
import { AppDatabase } from "@/infrastructure/database/AppDatabase";
import { initializeDatabase } from "@/infrastructure/database/databaseLifecycle";
import { readBackupData } from "@/infrastructure/backup/backupService";
import {
  applySelectiveBackupRestore,
  createSelectiveRestorePreview,
  type PreparedSelectiveBackupRestore,
} from "@/infrastructure/backup/selectiveBackupRestoreService";
import { createEntity } from "@/shared/utils/entities";

function emptyData(): BackupData {
  return {
    userProfile: [],
    appSettings: [createDefaultAppSettings()],
    weights: [],
    dailySteps: [],
    activities: [],
    foodProducts: [],
    meals: [],
    foodEntries: [],
    favoriteMeals: [],
    recipes: [],
    recipeIngredients: [],
    dailyTargets: [],
    dailyJournalStatuses: [],
    weeklyReviews: [],
    acceptedCalorieAdjustments: [],
    exerciseDefinitions: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
    workoutSessions: [],
    workoutSessionExercises: [],
    strengthSets: [],
    progressionSuggestions: [],
  };
}

function createEnvelope(data: BackupData): BackupEnvelope {
  return {
    format: "sportpilot-backup",
    schemaVersion: 3,
    exportedAt: "2026-06-28T16:00:00.000Z",
    appVersion: "0.16.0",
    data,
  };
}

function createPrepared(
  envelope: BackupEnvelope,
): PreparedSelectiveBackupRestore {
  return createSelectiveRestorePreview(emptyData(), envelope);
}

describe("selectiveBackupRestoreService", () => {
  it("compare les compteurs locaux et entrants par domaine", () => {
    const current = emptyData();
    current.weights = [
      createEntity({ date: "2026-06-01", weightKg: 80 }, "weight-current"),
    ];

    const incoming = emptyData();
    incoming.weights = [
      createEntity({ date: "2026-06-20", weightKg: 79 }, "weight-1"),
      createEntity({ date: "2026-06-28", weightKg: 78.5 }, "weight-2"),
    ];

    const preview = createSelectiveRestorePreview(
      current,
      createEnvelope(incoming),
    );

    expect(
      preview.categories.find(({ key }) => key === "bodyTracking"),
    ).toEqual(
      expect.objectContaining({
        currentRecords: 1,
        incomingRecords: 2,
        available: true,
      }),
    );

    expect(preview.categories.find(({ key }) => key === "rewards")).toEqual(
      expect.objectContaining({
        incomingRecords: 0,
        available: false,
      }),
    );
  });

  it("remplace uniquement le domaine sélectionné", async () => {
    const database = new AppDatabase(
      `sportpilot-selective-restore-${crypto.randomUUID()}`,
    );
    await initializeDatabase(database);

    try {
      await database.weights.add(
        createEntity({ date: "2026-06-01", weightKg: 80 }, "weight-old"),
      );
      await database.dailySteps.add(
        createEntity(
          {
            date: "2026-06-01",
            totalSteps: 4_000,
            source: "manual" as const,
          },
          "steps-old",
        ),
      );

      const incoming = emptyData();
      incoming.weights = [
        createEntity({ date: "2026-06-28", weightKg: 78.5 }, "weight-new"),
      ];

      const envelope = createEnvelope(incoming);
      const prepared = createPrepared(envelope);

      await applySelectiveBackupRestore(prepared, ["bodyTracking"], database);

      expect(await database.weights.toArray()).toEqual([
        expect.objectContaining({
          id: "weight-new",
          weightKg: 78.5,
        }),
      ]);
      expect(await database.dailySteps.count()).toBe(0);
      expect(await database.userSettings.count()).toBe(1);
      expect(await database.exerciseDefinitions.count()).toBeGreaterThan(0);
    } finally {
      database.close();
      await database.delete();
    }
  });

  it("restaure les états utilisateur sans toucher aux données métier", async () => {
    const database = new AppDatabase(
      `sportpilot-selective-user-state-${crypto.randomUUID()}`,
    );
    await initializeDatabase(database);

    try {
      await database.weights.add(
        createEntity({ date: "2026-06-01", weightKg: 80 }, "weight-preserved"),
      );
      await database.earnedAchievements.add({
        id: "first-session",
        earnedAt: "2026-06-01T08:00:00.000Z",
        updatedAt: "2026-06-01T08:00:00.000Z",
      });

      const incoming = emptyData();
      incoming.goals = [];
      incoming.endurancePlanningSessions = [];
      incoming.earnedAchievements = [
        {
          id: "ten-sessions",
          earnedAt: "2026-06-28T08:00:00.000Z",
          updatedAt: "2026-06-28T08:00:00.000Z",
        },
      ];
      incoming.unlockedVisualThemes = [
        {
          id: "classic",
          unlockedAt: "2026-06-01T08:00:00.000Z",
          updatedAt: "2026-06-01T08:00:00.000Z",
        },
        {
          id: "endurance",
          unlockedAt: "2026-06-28T08:00:00.000Z",
          updatedAt: "2026-06-28T08:00:00.000Z",
        },
      ];
      incoming.visualThemePreferences = [
        {
          id: "visual-theme-preference",
          activeThemeId: "endurance",
          updatedAt: "2026-06-28T08:00:00.000Z",
        },
      ];
      incoming.weeklyMissionCompletions = [
        {
          id: "weekly-mission:2026-06-22",
          weekStart: "2026-06-22",
          completedAt: "2026-06-28T09:00:00.000Z",
          updatedAt: "2026-06-28T09:00:00.000Z",
        },
      ];
      incoming.routineReminderCompletions = [
        {
          id: "routine-reminder:2026-06-28:weighIn",
          date: "2026-06-28",
          type: "weighIn",
          completedAt: "2026-06-28T09:30:00.000Z",
          updatedAt: "2026-06-28T09:30:00.000Z",
        },
      ];

      const envelope: BackupEnvelope = {
        format: "sportpilot-backup",
        schemaVersion: 5,
        exportedAt: "2026-06-28T10:00:00.000Z",
        appVersion: "0.16.0",
        includedUserStateTables: [
          "goals",
          "endurancePlanningSessions",
          "earnedAchievements",
          "unlockedVisualThemes",
          "visualThemePreferences",
          "weeklyMissionCompletions",
          "routineReminderCompletions",
        ],
        data: incoming,
      };
      const prepared = createSelectiveRestorePreview(
        await readBackupData(database),
        envelope,
      );

      const result = await applySelectiveBackupRestore(
        prepared,
        ["rewards"],
        database,
      );

      expect(result.restoredRecordCount).toBe(6);
      expect(await database.weights.get("weight-preserved")).toBeDefined();
      expect(await database.earnedAchievements.toArray()).toEqual([
        expect.objectContaining({ id: "ten-sessions" }),
      ]);
      expect(await database.routineReminderCompletions.toArray()).toEqual([
        expect.objectContaining({
          id: "routine-reminder:2026-06-28:weighIn",
        }),
      ]);
      expect(await database.visualThemePreferences.toArray()).toEqual([
        expect.objectContaining({ activeThemeId: "endurance" }),
      ]);
    } finally {
      database.close();
      await database.delete();
    }
  });

  it("remplace uniquement les marqueurs de suppression du domaine restauré", async () => {
    const database = new AppDatabase(
      `sportpilot-selective-deletions-${crypto.randomUUID()}`,
    );
    await initializeDatabase(database);

    try {
      await database.deletionRecords.bulkAdd([
        {
          id: "deletion:activity:activity-old",
          entityType: "activity",
          entityId: "activity-old",
          status: "deleted",
          deletedAt: "2026-06-01T08:00:00.000Z",
          createdAt: "2026-06-01T08:00:00.000Z",
          updatedAt: "2026-06-01T08:00:00.000Z",
        },
        {
          id: "deletion:recipe:recipe-preserved",
          entityType: "recipe",
          entityId: "recipe-preserved",
          status: "deleted",
          deletedAt: "2026-06-01T09:00:00.000Z",
          createdAt: "2026-06-01T09:00:00.000Z",
          updatedAt: "2026-06-01T09:00:00.000Z",
        },
      ]);

      const incoming = emptyData();
      incoming.deletionRecords = [
        {
          id: "deletion:activity:activity-new",
          entityType: "activity",
          entityId: "activity-new",
          status: "deleted",
          deletedAt: "2026-06-28T08:00:00.000Z",
          createdAt: "2026-06-28T08:00:00.000Z",
          updatedAt: "2026-06-28T08:00:00.000Z",
        },
        {
          id: "deletion:recipe:recipe-incoming",
          entityType: "recipe",
          entityId: "recipe-incoming",
          status: "deleted",
          deletedAt: "2026-06-28T09:00:00.000Z",
          createdAt: "2026-06-28T09:00:00.000Z",
          updatedAt: "2026-06-28T09:00:00.000Z",
        },
      ];

      const envelope: BackupEnvelope = {
        format: "sportpilot-backup",
        schemaVersion: 7,
        exportedAt: "2026-06-28T10:00:00.000Z",
        appVersion: "0.16.0",
        includedUserStateTables: ["deletionRecords"],
        data: incoming,
      };
      const prepared = createSelectiveRestorePreview(
        await readBackupData(database),
        envelope,
      );

      await applySelectiveBackupRestore(
        prepared,
        ["activities"],
        database,
      );

      expect(
        (await database.deletionRecords.toArray()).map(({ id }) => id),
      ).toEqual(
        expect.arrayContaining([
          "deletion:activity:activity-new",
          "deletion:recipe:recipe-preserved",
        ]),
      );
      expect(
        await database.deletionRecords.get(
          "deletion:activity:activity-old",
        ),
      ).toBeUndefined();
      expect(
        await database.deletionRecords.get(
          "deletion:recipe:recipe-incoming",
        ),
      ).toBeUndefined();
    } finally {
      database.close();
      await database.delete();
    }
  });

  it("refuse une sélection vide ou indisponible", async () => {
    const prepared = createPrepared(createEnvelope(emptyData()));

    await expect(applySelectiveBackupRestore(prepared, [])).rejects.toThrow(
      "Sélectionne au moins un domaine",
    );

    await expect(
      applySelectiveBackupRestore(prepared, ["rewards"]),
    ).rejects.toThrow("La sauvegarde ne contient pas");
  });
});
