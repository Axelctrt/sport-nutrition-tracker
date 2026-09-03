import { buildDailyTargetEnergyInputSnapshot } from "@/domain/calculations/dailyTargetInputSnapshot";
import { createDefaultAppSettings } from "@/domain/defaults/appSettings";
import { LOCAL_USER_PROFILE_ID } from "@/domain/defaults/identifiers";
import type { BackupEnvelope } from "@/domain/models/backup";
import type {
  Activity,
  CyclingActivity,
  RunningActivity,
  SwimmingActivity,
} from "@/domain/models/activity";
import type { UserProfile } from "@/domain/models/profile";
import type { DailyTarget } from "@/domain/models/targets";
import { migrateBackupEnvelope } from "@/infrastructure/backup/backupMigrations";
import { backupEnvelopeSchema } from "@/infrastructure/backup/backupSchemas";
import { createEntity } from "@/shared/utils/entities";
import { createProfileInput } from "@/test/factories/profileFactory";
import { createRunningActivityInput } from "@/test/factories/activityFactory";
import {
  createExerciseDefinitionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
  createWorkoutSessionInput,
} from "@/test/factories/strengthFactory";
import {
  createCalorieAdaptationAssessment,
  createWeeklyReview,
} from "@/test/factories/weeklyReviewFactory";

function createValidEnvelope(): BackupEnvelope {
  return {
    format: "sportpilot-backup",
    schemaVersion: 2,
    exportedAt: "2026-06-24T10:00:00.000Z",
    data: {
      userProfile: [
        createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID),
      ],
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
    },
  };
}

function createVersion1Envelope(): unknown {
  const current = createValidEnvelope();
  const {
    exerciseDefinitions: _exerciseDefinitions,
    workoutTemplates: _workoutTemplates,
    workoutTemplateExercises: _workoutTemplateExercises,
    workoutSessions: _workoutSessions,
    workoutSessionExercises: _workoutSessionExercises,
    strengthSets: _strengthSets,
    progressionSuggestions: _progressionSuggestions,
    ...version1Data
  } = current.data;

  return {
    ...current,
    schemaVersion: 1,
    data: version1Data,
  };
}

function createDailyTarget(
  energyInputSnapshot?: DailyTarget["energyInputSnapshot"],
): DailyTarget {
  return createEntity<DailyTarget>({
    date: "2026-07-01",
    calculationWeightKg: 70,
    ...(energyInputSnapshot ? { energyInputSnapshot } : {}),
    energy: {
      bmrKcal: 1_600,
      occupationalBaseKcal: 320,
      walkingKcal: 180,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 2_100,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1_600,
    targetCaloriesKcal: 2_100,
    macros: {
      proteinGrams: 126,
      carbohydratesGrams: 266,
      fatGrams: 56,
    },
    calculationVersion: 5,
  }, "daily-target:2026-07-01");
}

describe("backupEnvelopeSchema", () => {
  it("accepte Douleur ou blessure et reste compatible avec l'absence legacy", () => {
    const envelope = migrateBackupEnvelope(createValidEnvelope());
    envelope.data.dailyCheckIns = [{
      id: 'daily-check-in:2026-08-30',
      date: '2026-08-30',
      contextFlags: ['painOrInjury'],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-30T07:00:00.000Z',
      createdAt: '2026-08-30T07:00:00.000Z',
      updatedAt: '2026-08-30T07:00:00.000Z',
    }];
    expect(backupEnvelopeSchema.parse(envelope).data.dailyCheckIns?.[0]?.contextFlags)
      .toEqual(['painOrInjury']);

    envelope.data.dailyCheckIns[0]!.contextFlags = [];
    expect(backupEnvelopeSchema.parse(envelope).data.dailyCheckIns?.[0]?.contextFlags)
      .toEqual([]);
  });

  it("valide une sauvegarde complète au format courant", () => {
    expect(backupEnvelopeSchema.parse(createValidEnvelope())).toMatchObject({
      format: "sportpilot-backup",
      schemaVersion: 2,
    });
  });

  it("conserve l’évaluation adaptative optionnelle d’un bilan", () => {
    const envelope = createValidEnvelope();
    envelope.data.weeklyReviews = [
      createWeeklyReview({
        adaptation: createCalorieAdaptationAssessment({
          detectedState: "possibleRecomposition",
          proposedAdjustmentKcal: 0,
        }),
      }),
    ];

    expect(backupEnvelopeSchema.parse(envelope).data.weeklyReviews[0]?.adaptation)
      .toMatchObject({
        calculationVersion: 1,
        detectedState: "possibleRecomposition",
        proposedAdjustmentKcal: 0,
      });
  });

  it("conserve le snapshot historique d'une cible quotidienne", () => {
    const envelope = createValidEnvelope();
    const snapshot = buildDailyTargetEnergyInputSnapshot(
      envelope.data.userProfile[0]!,
      envelope.data.appSettings![0]!,
    );
    envelope.data.dailyTargets = [createDailyTarget(snapshot)];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.dailyTargets[0]?.energyInputSnapshot).toEqual(snapshot);
  });

  it("accepte une ancienne cible quotidienne sans snapshot historique", () => {
    const envelope = createValidEnvelope();
    envelope.data.dailyTargets = [createDailyTarget()];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.dailyTargets[0]?.energyInputSnapshot).toBeUndefined();
  });


  it("conserve le journal limité des impacts du profil", () => {
    const envelope = createValidEnvelope();
    const storedProfile = envelope.data.userProfile[0]!;
    envelope.data.userProfile = [{
      ...storedProfile,
      profileImpactHistory: [{
        id: "impact-1",
        changedAt: "2026-07-10T09:00:00.000Z",
        effectiveDate: "2026-07-10",
        changedFields: ["goal", "targetWeeklyWeightChangePercent"],
        summary: "Les objectifs nutritionnels de la journée ont été recalculés.",
        beforeTargetCaloriesKcal: 2400,
        afterTargetCaloriesKcal: 2180,
        beforeMacros: { proteinGrams: 108, carbohydratesGrams: 322, fatGrams: 54 },
        afterMacros: { proteinGrams: 108, carbohydratesGrams: 267, fatGrams: 54 },
      }],
    }];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.userProfile[0]?.profileImpactHistory).toEqual(
      envelope.data.userProfile[0]?.profileImpactHistory,
    );
  });

  it("complète les nouveaux réglages absents d’une sauvegarde 0.15.0", () => {
    const envelope = createValidEnvelope();
    const legacySettings = { ...envelope.data.appSettings![0] } as Record<
      string,
      unknown
    >;
    delete legacySettings.backupReminderIntervalDays;
    delete legacySettings.restTimerAutoStart;
    delete legacySettings.restTimerSoundEnabled;
    delete legacySettings.restTimerVibrationEnabled;
    delete legacySettings.enduranceTemplates;
    delete legacySettings.enduranceTemplatesVersion;
    delete legacySettings.dashboardPreferences;
    delete legacySettings.routineReminderPreferences;
    envelope.data.appSettings = [
      legacySettings as unknown as NonNullable<BackupEnvelope["data"]["appSettings"]>[number],
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.appSettings![0]?.backupReminderIntervalDays).toBe(0);
    expect(parsed.data.appSettings![0]?.restTimerAutoStart).toBe(true);
    expect(parsed.data.appSettings![0]?.restTimerSoundEnabled).toBe(false);
    expect(parsed.data.appSettings![0]?.restTimerVibrationEnabled).toBe(true);
    expect(parsed.data.appSettings![0]?.enduranceTemplatesVersion).toBe(1);
    expect(parsed.data.appSettings![0]?.enduranceTemplates).toHaveLength(4);
    expect(parsed.data.appSettings![0]?.dashboardPreferences).toMatchObject({
      preset: "balanced",
      hidden: [
        'activeWorkout',
        'trainingAgenda',
        'quickActions',
        'calculationDetails',
        'rewardsOverview',
        'weeklyMissions',
      ],
      quickActions: expect.arrayContaining(["addFood", "workout"]),
      summaryMetrics: ["macros", "steps"],
      supplementalBlock: "none",
    });
    expect(parsed.data.appSettings![0]?.dashboardDensity).toBe("comfortable");
    expect(
      Object.values(
        parsed.data.appSettings![0]?.routineReminderPreferences?.rules ?? {},
      ).every((rule) => !rule.enabled),
    ).toBe(true);
  });

  it("accepte les activités récentes sans RPE et les anciennes activités qui en contiennent encore un", () => {
    const envelope = createValidEnvelope();
    envelope.data.activities = [
      createEntity(createRunningActivityInput(), "activity-modern"),
      createEntity(
        { ...createRunningActivityInput(), rpe: 8 },
        "activity-legacy",
      ),
    ] as Activity[];

    const parsed = backupEnvelopeSchema.parse(envelope);
    expect(parsed.data.activities[0]).not.toHaveProperty("rpe");
    expect(parsed.data.activities[1]).toMatchObject({ rpe: 8 });
  });

  it("conserve les données d’endurance facultatives et accepte les anciennes activités", () => {
    const envelope = createValidEnvelope();
    envelope.data.activities = [
      createEntity<RunningActivity>(
        {
          ...createRunningActivityInput(),
          elevationGainMeters: 320,
          terrainType: "trail",
          intervalDetails: "3 × 8 min",
        },
        "running-enriched",
      ),
      createEntity<SwimmingActivity>(
        {
          type: "swimming",
          date: "2026-06-25",
          durationMinutes: 45,
          intensity: "moderate",
          sessionType: "endurance",
          mainStroke: "freestyle",
          distanceMeters: 1_500,
          poolLengthMeters: 25,
          calculation: {
            weightKg: 70,
            estimatedCaloriesKcal: 350,
            calculationVersion: 1,
          },
        },
        "swimming-enriched",
      ),
      createEntity<CyclingActivity>(
        {
          type: "cycling",
          date: "2026-06-26",
          durationMinutes: 90,
          intensity: "moderate",
          met: 6.8,
          includedInDailySteps: false,
          distanceKm: 36,
          elevationGainMeters: 420,
          bikeType: "road",
          environment: "outdoor",
          calculation: {
            weightKg: 70,
            estimatedCaloriesKcal: 700,
            metUsed: 6.8,
            calculationVersion: 1,
          },
        },
        "cycling-enriched",
      ),
      createEntity<RunningActivity>(
        createRunningActivityInput(),
        "running-legacy-compatible",
      ),
    ] as Activity[];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.activities).toHaveLength(4);
    expect(parsed.data.activities[0]).toMatchObject({
      terrainType: "trail",
      elevationGainMeters: 320,
    });
    expect(parsed.data.activities[1]).toMatchObject({ poolLengthMeters: 25 });
    expect(parsed.data.activities[2]).toMatchObject({
      type: "cycling",
      bikeType: "road",
      distanceKm: 36,
    });
    expect(parsed.data.activities[3]).not.toHaveProperty("terrainType");
  });


  it("conserve les liens explicites entre activité réelle et séance planifiée", () => {
    const envelope = createValidEnvelope();
    envelope.data.activities = [
      createEntity<RunningActivity>(
        {
          ...createRunningActivityInput({ date: "2026-07-13" }),
          plannedActivity: {
            source: "endurancePlanning",
            sourceId: "planned-run",
          },
        },
        "activity-linked",
      ),
    ];
    envelope.data.workoutSessions = [
      createEntity(
        createWorkoutSessionInput({
          status: "completed",
          date: "2026-07-14",
          completedActivityId: "activity-strength-linked",
        }),
        "strength-plan",
      ),
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.activities[0]).toMatchObject({
      plannedActivity: {
        source: "endurancePlanning",
        sourceId: "planned-run",
      },
    });
    expect(parsed.data.workoutSessions[0]).toMatchObject({
      completedActivityId: "activity-strength-linked",
    });
  });

  it("refuse deux pesées pour la même date", () => {
    const envelope = createValidEnvelope();
    envelope.data.weights = [
      createEntity({ date: "2026-06-23", weightKg: 60 }, "weight-1"),
      createEntity({ date: "2026-06-23", weightKg: 59.8 }, "weight-2"),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("refuse une entrée alimentaire dont le repas est absent", () => {
    const envelope = createValidEnvelope();
    envelope.data.foodEntries = [
      createEntity(
        {
          date: "2026-06-23",
          mealId: "missing-meal",
          mealSlot: "lunch",
          sourceType: "product",
          reference: {
            sourceType: "product",
            productId: "product-1",
            inputMode: "amount",
            inputQuantity: 100,
            normalizedAmount: 100,
            normalizedUnit: "g",
            nutritionPer100Snapshot: {
              caloriesKcal: 100,
              proteinGrams: 5,
              carbohydratesGrams: 10,
              fatGrams: 2,
            },
          },
        },
        "entry-1",
      ),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("refuse un exercice de séance modèle orphelin", () => {
    const envelope = createValidEnvelope();
    envelope.data.exerciseDefinitions = [
      createEntity(createExerciseDefinitionInput(), "exercise-1"),
    ];
    envelope.data.workoutTemplates = [
      createEntity(createWorkoutTemplateInput(), "template-1"),
    ];
    envelope.data.workoutTemplateExercises = [
      createEntity(
        createWorkoutTemplateExerciseInput({
          exerciseDefinitionId: "missing-exercise",
        }),
        "template-exercise-1",
      ),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("accepte un ancien exercice sans stratégie de suivi explicite", () => {
    const envelope = createValidEnvelope();
    const legacyExercise = createEntity(
      createExerciseDefinitionInput({ loadUnit: "bodyweight" }),
      "legacy-bodyweight-exercise",
    ) as unknown as Record<string, unknown>;
    delete legacyExercise.trackingMode;
    envelope.data.exerciseDefinitions = [
      legacyExercise as unknown as BackupEnvelope["data"]["exerciseDefinitions"][number],
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.exerciseDefinitions[0]).toMatchObject({
      loadUnit: "bodyweight",
    });
    expect(parsed.data.exerciseDefinitions[0]?.trackingMode).toBeUndefined();
  });

  it("accepte une séance planifiée et ses métadonnées de report", () => {
    const envelope = createValidEnvelope();
    const plannedSession = createEntity(
      createWorkoutSessionInput({
        status: "planned",
        date: "2026-07-01",
        plannedDate: "2026-07-01",
        originalPlannedDate: "2026-06-29",
        plannedAt: "2026-06-26T18:00:00.000Z",
      }),
      "planned-session",
    ) as unknown as Record<string, unknown>;
    delete plannedSession.startedAt;
    delete plannedSession.completedAt;
    delete plannedSession.durationMinutes;
    envelope.data.workoutSessions = [
      plannedSession as unknown as BackupEnvelope["data"]["workoutSessions"][number],
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.workoutSessions[0]).toMatchObject({
      status: "planned",
      plannedDate: "2026-07-01",
      originalPlannedDate: "2026-06-29",
    });
  });

  it("conserve les métadonnées des supersets et circuits dans une sauvegarde", () => {
    const envelope = createValidEnvelope();
    envelope.data.exerciseDefinitions = [
      createEntity(createExerciseDefinitionInput(), "exercise-1"),
      createEntity(
        createExerciseDefinitionInput({
          name: "Rowing barre",
          primaryMuscleGroup: "back",
        }),
        "exercise-2",
      ),
    ];
    envelope.data.workoutTemplates = [
      createEntity(createWorkoutTemplateInput(), "template-1"),
    ];
    envelope.data.workoutTemplateExercises = [
      createEntity(
        createWorkoutTemplateExerciseInput({
          templateId: "template-1",
          exerciseDefinitionId: "exercise-1",
          sortOrder: 0,
          exerciseGroupId: "group-a",
          exerciseGroupType: "superset",
          exerciseGroupName: "Poussée / tirage",
          exerciseGroupRounds: 4,
          exerciseGroupRestBetweenExercisesSeconds: 15,
          exerciseGroupRestBetweenRoundsSeconds: 90,
        }),
        "template-exercise-1",
      ),
      createEntity(
        createWorkoutTemplateExerciseInput({
          templateId: "template-1",
          exerciseDefinitionId: "exercise-2",
          sortOrder: 1,
          exerciseGroupId: "group-a",
          exerciseGroupType: "superset",
          exerciseGroupName: "Poussée / tirage",
          exerciseGroupRounds: 4,
          exerciseGroupRestBetweenExercisesSeconds: 15,
          exerciseGroupRestBetweenRoundsSeconds: 90,
        }),
        "template-exercise-2",
      ),
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.workoutTemplateExercises).toHaveLength(2);
    expect(parsed.data.workoutTemplateExercises[0]).toMatchObject({
      exerciseGroupId: "group-a",
      exerciseGroupType: "superset",
      exerciseGroupName: "Poussée / tirage",
      exerciseGroupRounds: 4,
      exerciseGroupRestBetweenExercisesSeconds: 15,
      exerciseGroupRestBetweenRoundsSeconds: 90,
    });
  });

  it("valide les marqueurs de suppression déterministes", () => {
    const envelope = migrateBackupEnvelope(createValidEnvelope());
    envelope.includedUserStateTables = [
      ...(envelope.includedUserStateTables ?? []),
      "deletionRecords",
    ];
    envelope.data.deletionRecords = [
      {
        id: "deletion:recipe:recipe-deleted",
        entityType: "recipe",
        entityId: "recipe-deleted",
        status: "deleted",
        deletedAt: "2026-06-29T10:00:00.000Z",
        createdAt: "2026-06-29T10:00:00.000Z",
        updatedAt: "2026-06-29T10:00:00.000Z",
      },
    ];

    expect(backupEnvelopeSchema.parse(envelope).data.deletionRecords).toEqual(
      envelope.data.deletionRecords,
    );

    envelope.data.deletionRecords[0]!.id = "invalid";
    expect(backupEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });
});

describe("migrateBackupEnvelope", () => {
  it("migre une sauvegarde version 1 vers la version 12 sans altérer ses données", () => {
    const migrated = migrateBackupEnvelope(createVersion1Envelope());

    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.data.dailyCheckIns).toEqual([]);
    expect(migrated.data.dailyActivityDecisions).toEqual([]);
    expect(migrated.data.dailyCheckOuts).toEqual([]);
    expect(migrated.data.userProfile).toHaveLength(1);
    expect(migrated.data.exerciseDefinitions).toEqual([]);
    expect(migrated.data.userSettings?.[0]?.id).toBe('user-settings');
    expect(migrated.data.appSettings).toBeUndefined();
    expect(migrated.data.workoutTemplates).toEqual([]);
    expect(migrated.data.workoutSessions).toEqual([]);
    expect(migrated.data.strengthSets).toEqual([]);
    expect(migrated.data.friendActivityPermissions).toEqual([]);
    expect(migrated.data.coachDecisionMemories).toEqual([]);
  });

  it('migre une sauvegarde v11 sans inventer de mémoire Coach', () => {
    const legacy = migrateBackupEnvelope(createValidEnvelope());
    legacy.schemaVersion = 11;
    delete legacy.data.coachDecisionMemories;

    const migrated = migrateBackupEnvelope(legacy);

    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.data.coachDecisionMemories).toEqual([]);
    expect(migrated.data.userProfile).toEqual(legacy.data.userProfile);
  });

  it('rejette une mémoire Coach sans bilan source', () => {
    const migrated = migrateBackupEnvelope(createValidEnvelope());
    migrated.data.coachDecisionMemories = [{
      id: 'coach-decision:missing', weeklyReviewId: 'missing',
      period: { weekStart: '2026-08-24', weekEnd: '2026-08-30' }, decisionDate: '2026-08-30',
      phase: { id: 'deficit', label: 'Déficit actif', objective: 'loss' }, coachState: 'onTrack',
      confidence: { weight: 80, food: 80, activity: 80, recovery: 80, overall: 80, level: 'reliable' },
      primaryAction: 'maintainPlan', reasons: [], blockingFactors: [], safety: { status: 'clear', reasons: [] },
      status: 'maintained', decidedAt: '2026-08-30T12:00:00.000Z', nextReview: { type: 'date', date: '2026-09-06' },
      createdAt: '2026-08-30T12:00:00.000Z', updatedAt: '2026-08-30T12:00:00.000Z',
    }];
    expect(backupEnvelopeSchema.safeParse(migrated).success).toBe(false);
  });

  it("migre directement la version 2 vers la version 12", () => {
    expect(migrateBackupEnvelope(createValidEnvelope()).schemaVersion).toBe(12);
  });

  it("convertit le rewardState v4 en tables utilisateur couvertes explicitement", () => {
    const legacy = {
      ...createValidEnvelope(),
      schemaVersion: 4,
      rewardState: {
        achievements: {
          earnedAchievements: [
            {
              id: "first-session",
              earnedAt: "2026-06-27T18:00:00.000Z",
            },
          ],
        },
        visualThemes: {
          activeThemeId: "neon-pulse",
          unlockedThemeIds: ["core", "neon-pulse"],
          unlockMetadata: {},
        },
        weeklyMissions: {
          completedWeeks: [
            {
              weekStart: "2026-06-22",
              completedAt: "2026-06-27T19:00:00.000Z",
            },
          ],
        },
      },
    };

    const migrated = migrateBackupEnvelope(legacy);

    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.rewardState).toBeUndefined();
    expect(migrated.includedUserStateTables).toEqual([
      "earnedAchievements",
      "unlockedVisualThemes",
      "visualThemePreferences",
      "weeklyMissionCompletions",
    ]);
    expect(migrated.data.earnedAchievements).toEqual([
      {
        id: "first-session",
        earnedAt: "2026-06-27T18:00:00.000Z",
        updatedAt: "2026-06-27T18:00:00.000Z",
      },
    ]);
    expect(migrated.data.visualThemePreferences).toEqual([
      expect.objectContaining({
        id: "visual-theme-preference",
        activeThemeId: "neon-pulse",
      }),
    ]);
    expect(migrated.data.weeklyMissionCompletions).toEqual([
      expect.objectContaining({
        id: "weekly-mission:2026-06-22",
      }),
    ]);
    expect(migrated.data.routineReminderCompletions).toEqual([]);
    expect(migrated.data.deletionRecords).toEqual([]);
  });

  it("refuse une sauvegarde créée par une version future", () => {
    const envelope = createValidEnvelope();
    envelope.schemaVersion = 99;

    expect(() => migrateBackupEnvelope(envelope)).toThrow(/plus récente/);
  });

  it('migre v10 vers v11 sans inventer de provenance', () => {
    const version10 = migrateBackupEnvelope(createValidEnvelope());
    version10.schemaVersion = 10;
    version10.data.weights = [{
      id: 'weight:legacy',
      date: '2026-08-24',
      weightKg: 71.4,
      createdAt: '2026-08-24T07:00:00.000Z',
      updatedAt: '2026-08-24T07:00:00.000Z',
    }];
    version10.data.dailyCheckIns = [{
      id: 'daily-check-in:2026-08-24',
      date: '2026-08-24',
      sleepQuality: 'average',
      readiness: 'normal',
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-24T07:00:00.000Z',
      createdAt: '2026-08-24T07:00:00.000Z',
      updatedAt: '2026-08-24T07:00:00.000Z',
    }];
    version10.data.dailyCheckOuts = [{
      id: 'daily-check-out:2026-08-24',
      date: '2026-08-24',
      hunger: 'normal',
      energy: 'normal',
      foodJournalComplete: true,
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-24T20:00:00.000Z',
      createdAt: '2026-08-24T20:00:00.000Z',
      updatedAt: '2026-08-24T20:00:00.000Z',
    }];

    const migrated = migrateBackupEnvelope(version10);

    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.data.weights[0]?.provenance).toBeUndefined();
    expect(migrated.data.dailyCheckIns?.[0]?.signalProvenance).toBeUndefined();
    expect(migrated.data.dailyCheckOuts?.[0]?.signalProvenance).toBeUndefined();
  });

  it('refuse les provenances v11 invalides ou orphelines', () => {
    const invalidWeight = migrateBackupEnvelope(createValidEnvelope());
    invalidWeight.data.weights = [{
      id: 'weight:invalid',
      date: '2026-08-25',
      weightKg: 71,
      provenance: 'userMeasurement',
      createdAt: '2026-08-25T07:00:00.000Z',
      updatedAt: '2026-08-25T07:00:00.000Z',
    }];
    (invalidWeight.data.weights[0] as { provenance: string }).provenance = 'guessed';
    expect(() => migrateBackupEnvelope(invalidWeight)).toThrow();

    const orphanSignal = migrateBackupEnvelope(createValidEnvelope());
    orphanSignal.data.dailyCheckIns = [{
      id: 'daily-check-in:2026-08-25',
      date: '2026-08-25',
      signalProvenance: { sleepQuality: 'userReported' },
      contextFlags: [],
      contextSyncPreference: 'localOnly',
      completedAt: '2026-08-25T07:00:00.000Z',
      createdAt: '2026-08-25T07:00:00.000Z',
      updatedAt: '2026-08-25T07:00:00.000Z',
    }];
    expect(() => migrateBackupEnvelope(orphanSignal)).toThrow();
  });

  it("refuse un fichier qui ne provient pas de SportPilot", () => {
    expect(() =>
      migrateBackupEnvelope({ format: "other", schemaVersion: 1 }),
    ).toThrow(/n’est pas une sauvegarde SportPilot/);
  });
  it("conserve les portions et corrections locales des produits alimentaires", () => {
    const envelope = createValidEnvelope();
    envelope.data.foodProducts = [
      createEntity(
        {
          name: "Yaourt local",
          brand: "Exemple",
          basisUnit: "g",
          nutritionPer100: {
            caloriesKcal: 68,
            proteinGrams: 5,
            carbohydratesGrams: 7,
            fatGrams: 2,
            fiberGrams: 1.5,
            saltGrams: 0.12,
          },
          servingSize: 125,
          servingLabel: "1 pot",
          barcode: "3017624010701",
          source: {
            type: "openFoodFacts",
            fetchedAt: "2026-06-27T08:00:00.000Z",
            barcode: "3017624010701",
          },
          isNutritionComplete: true,
          localOverrides: ["name", "saltGrams"],
          isFavorite: false,
          isArchived: false,
        },
        "food-product-reliable",
      ),
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.foodProducts[0]).toMatchObject({
      servingSize: 125,
      servingLabel: "1 pot",
      localOverrides: ["name", "saltGrams"],
      nutritionPer100: { fiberGrams: 1.5, saltGrams: 0.12 },
    });
  });
});
