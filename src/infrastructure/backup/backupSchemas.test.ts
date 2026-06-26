import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { BackupEnvelope } from '@/domain/models/backup';
import type { Activity } from '@/domain/models/activity';
import type { UserProfile } from '@/domain/models/profile';
import { migrateBackupEnvelope } from '@/infrastructure/backup/backupMigrations';
import { backupEnvelopeSchema } from '@/infrastructure/backup/backupSchemas';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import {
  createExerciseDefinitionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
  createWorkoutSessionInput,
} from '@/test/factories/strengthFactory';

function createValidEnvelope(): BackupEnvelope {
  return {
    format: 'sportpilot-backup',
    schemaVersion: 2,
    exportedAt: '2026-06-24T10:00:00.000Z',
    data: {
      userProfile: [createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID)],
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

describe('backupEnvelopeSchema', () => {
  it('valide une sauvegarde complète au format courant', () => {
    expect(backupEnvelopeSchema.parse(createValidEnvelope())).toMatchObject({
      format: 'sportpilot-backup',
      schemaVersion: 2,
    });
  });

  it('complète les nouveaux réglages absents d’une sauvegarde 0.15.0', () => {
    const envelope = createValidEnvelope();
    const legacySettings = { ...envelope.data.appSettings[0] } as Record<string, unknown>;
    delete legacySettings.backupReminderIntervalDays;
    delete legacySettings.restTimerAutoStart;
    delete legacySettings.restTimerSoundEnabled;
    delete legacySettings.restTimerVibrationEnabled;
    envelope.data.appSettings = [legacySettings as unknown as BackupEnvelope['data']['appSettings'][number]];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.appSettings[0]?.backupReminderIntervalDays).toBe(0);
    expect(parsed.data.appSettings[0]?.restTimerAutoStart).toBe(true);
    expect(parsed.data.appSettings[0]?.restTimerSoundEnabled).toBe(false);
    expect(parsed.data.appSettings[0]?.restTimerVibrationEnabled).toBe(true);
  });

  it('accepte les activités récentes sans RPE et les anciennes activités qui en contiennent encore un', () => {
    const envelope = createValidEnvelope();
    envelope.data.activities = [
      createEntity(createRunningActivityInput(), 'activity-modern'),
      createEntity({ ...createRunningActivityInput(), rpe: 8 }, 'activity-legacy'),
    ] as Activity[];

    const parsed = backupEnvelopeSchema.parse(envelope);
    expect(parsed.data.activities[0]).not.toHaveProperty('rpe');
    expect(parsed.data.activities[1]).toMatchObject({ rpe: 8 });
  });

  it('refuse deux pesées pour la même date', () => {
    const envelope = createValidEnvelope();
    envelope.data.weights = [
      createEntity({ date: '2026-06-23', weightKg: 60 }, 'weight-1'),
      createEntity({ date: '2026-06-23', weightKg: 59.8 }, 'weight-2'),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it('refuse une entrée alimentaire dont le repas est absent', () => {
    const envelope = createValidEnvelope();
    envelope.data.foodEntries = [
      createEntity(
        {
          date: '2026-06-23',
          mealId: 'missing-meal',
          mealSlot: 'lunch',
          sourceType: 'product',
          reference: {
            sourceType: 'product',
            productId: 'product-1',
            inputMode: 'amount',
            inputQuantity: 100,
            normalizedAmount: 100,
            normalizedUnit: 'g',
            nutritionPer100Snapshot: {
              caloriesKcal: 100,
              proteinGrams: 5,
              carbohydratesGrams: 10,
              fatGrams: 2,
            },
          },
        },
        'entry-1',
      ),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it('refuse un exercice de séance modèle orphelin', () => {
    const envelope = createValidEnvelope();
    envelope.data.exerciseDefinitions = [
      createEntity(createExerciseDefinitionInput(), 'exercise-1'),
    ];
    envelope.data.workoutTemplates = [createEntity(createWorkoutTemplateInput(), 'template-1')];
    envelope.data.workoutTemplateExercises = [
      createEntity(
        createWorkoutTemplateExerciseInput({ exerciseDefinitionId: 'missing-exercise' }),
        'template-exercise-1',
      ),
    ];

    const result = backupEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it('accepte un ancien exercice sans stratégie de suivi explicite', () => {
    const envelope = createValidEnvelope();
    const legacyExercise = createEntity(
      createExerciseDefinitionInput({ loadUnit: 'bodyweight' }),
      'legacy-bodyweight-exercise',
    ) as unknown as Record<string, unknown>;
    delete legacyExercise.trackingMode;
    envelope.data.exerciseDefinitions = [
      legacyExercise as unknown as BackupEnvelope['data']['exerciseDefinitions'][number],
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.exerciseDefinitions[0]).toMatchObject({
      loadUnit: 'bodyweight',
    });
    expect(parsed.data.exerciseDefinitions[0]?.trackingMode).toBeUndefined();
  });

  it('accepte une séance planifiée et ses métadonnées de report', () => {
    const envelope = createValidEnvelope();
    const plannedSession = createEntity(createWorkoutSessionInput({
      status: 'planned',
      date: '2026-07-01',
      plannedDate: '2026-07-01',
      originalPlannedDate: '2026-06-29',
      plannedAt: '2026-06-26T18:00:00.000Z',
    }), 'planned-session') as unknown as Record<string, unknown>;
    delete plannedSession.startedAt;
    delete plannedSession.completedAt;
    delete plannedSession.durationMinutes;
    envelope.data.workoutSessions = [
      plannedSession as unknown as BackupEnvelope['data']['workoutSessions'][number],
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.workoutSessions[0]).toMatchObject({
      status: 'planned',
      plannedDate: '2026-07-01',
      originalPlannedDate: '2026-06-29',
    });
  });

  it('conserve les métadonnées des supersets et circuits dans une sauvegarde', () => {
    const envelope = createValidEnvelope();
    envelope.data.exerciseDefinitions = [
      createEntity(createExerciseDefinitionInput(), 'exercise-1'),
      createEntity(createExerciseDefinitionInput({ name: 'Rowing barre', primaryMuscleGroup: 'back' }), 'exercise-2'),
    ];
    envelope.data.workoutTemplates = [createEntity(createWorkoutTemplateInput(), 'template-1')];
    envelope.data.workoutTemplateExercises = [
      createEntity(createWorkoutTemplateExerciseInput({
        templateId: 'template-1',
        exerciseDefinitionId: 'exercise-1',
        sortOrder: 0,
        exerciseGroupId: 'group-a',
        exerciseGroupType: 'superset',
        exerciseGroupName: 'Poussée / tirage',
        exerciseGroupRounds: 4,
        exerciseGroupRestBetweenExercisesSeconds: 15,
        exerciseGroupRestBetweenRoundsSeconds: 90,
      }), 'template-exercise-1'),
      createEntity(createWorkoutTemplateExerciseInput({
        templateId: 'template-1',
        exerciseDefinitionId: 'exercise-2',
        sortOrder: 1,
        exerciseGroupId: 'group-a',
        exerciseGroupType: 'superset',
        exerciseGroupName: 'Poussée / tirage',
        exerciseGroupRounds: 4,
        exerciseGroupRestBetweenExercisesSeconds: 15,
        exerciseGroupRestBetweenRoundsSeconds: 90,
      }), 'template-exercise-2'),
    ];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.workoutTemplateExercises).toHaveLength(2);
    expect(parsed.data.workoutTemplateExercises[0]).toMatchObject({
      exerciseGroupId: 'group-a',
      exerciseGroupType: 'superset',
      exerciseGroupName: 'Poussée / tirage',
      exerciseGroupRounds: 4,
      exerciseGroupRestBetweenExercisesSeconds: 15,
      exerciseGroupRestBetweenRoundsSeconds: 90,
    });
  });

});

describe('migrateBackupEnvelope', () => {
  it('migre une sauvegarde version 1 vers la version 2 sans altérer ses données', () => {
    const migrated = migrateBackupEnvelope(createVersion1Envelope());

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.userProfile).toHaveLength(1);
    expect(migrated.data.exerciseDefinitions).toEqual([]);
    expect(migrated.data.workoutTemplates).toEqual([]);
    expect(migrated.data.workoutSessions).toEqual([]);
    expect(migrated.data.strengthSets).toEqual([]);
  });

  it('accepte directement la version 2', () => {
    expect(migrateBackupEnvelope(createValidEnvelope()).schemaVersion).toBe(2);
  });

  it('refuse une sauvegarde créée par une version future', () => {
    const envelope = createValidEnvelope();
    envelope.schemaVersion = 99;

    expect(() => migrateBackupEnvelope(envelope)).toThrow(/plus récente/);
  });

  it('refuse un fichier qui ne provient pas de SportPilot', () => {
    expect(() => migrateBackupEnvelope({ format: 'other', schemaVersion: 1 })).toThrow(
      /n’est pas une sauvegarde SportPilot/,
    );
  });
  it('conserve les portions et corrections locales des produits alimentaires', () => {
    const envelope = createValidEnvelope();
    envelope.data.foodProducts = [createEntity({
      name: 'Yaourt local',
      brand: 'Exemple',
      basisUnit: 'g',
      nutritionPer100: {
        caloriesKcal: 68,
        proteinGrams: 5,
        carbohydratesGrams: 7,
        fatGrams: 2,
        fiberGrams: 1.5,
        saltGrams: 0.12,
      },
      servingSize: 125,
      servingLabel: '1 pot',
      barcode: '3017624010701',
      source: {
        type: 'openFoodFacts',
        fetchedAt: '2026-06-27T08:00:00.000Z',
        barcode: '3017624010701',
      },
      isNutritionComplete: true,
      localOverrides: ['name', 'saltGrams'],
      isFavorite: false,
      isArchived: false,
    }, 'food-product-reliable')];

    const parsed = backupEnvelopeSchema.parse(envelope);

    expect(parsed.data.foodProducts[0]).toMatchObject({
      servingSize: 125,
      servingLabel: '1 pot',
      localOverrides: ['name', 'saltGrams'],
      nutritionPer100: { fiberGrams: 1.5, saltGrams: 0.12 },
    });
  });

});
