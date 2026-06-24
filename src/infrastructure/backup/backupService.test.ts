import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { APP_SETTINGS_ID, LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { BackupEnvelope } from '@/domain/models/backup';
import type { UserProfile } from '@/domain/models/profile';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import {
  clearAllUserData,
  createBackupEnvelope,
  parseBackupText,
  replaceDatabaseFromBackup,
  serializeBackupEnvelope,
  summarizeBackup,
} from '@/infrastructure/backup/backupService';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import {
  createExerciseDefinitionInput,
  createProgressionSuggestionInput,
  createStrengthSetInput,
  createWorkoutSessionExerciseInput,
  createWorkoutSessionInput,
  createWorkoutTemplateExerciseInput,
  createWorkoutTemplateInput,
} from '@/test/factories/strengthFactory';

function createTestDatabase(): AppDatabase {
  return new AppDatabase(`sportpilot-backup-test-${crypto.randomUUID()}`);
}

function createEnvelope(overrides: Partial<BackupEnvelope['data']> = {}): BackupEnvelope {
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
      ...overrides,
    },
  };
}

describe('backupService', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = createTestDatabase();
    await initializeDatabase(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('exporte toutes les tables et produit un JSON réimportable', async () => {
    await database.userProfile.add(
      createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID),
    );
    await database.weights.add(
      createEntity({ date: '2026-06-23', weightKg: 60 }, 'weight-1'),
    );

    const envelope = await createBackupEnvelope(database, '2026-06-24T10:00:00.000Z');
    const parsed = parseBackupText(serializeBackupEnvelope(envelope));
    const summary = summarizeBackup(parsed);

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.data.userProfile).toHaveLength(1);
    expect(parsed.data.weights).toHaveLength(1);
    expect(parsed.data.appSettings[0]?.id).toBe(APP_SETTINGS_ID);
    expect(parsed.data.exerciseDefinitions).toEqual([]);
    expect(summary.totalRecords).toBe(3);
    expect(summary.hasProfile).toBe(true);
  });

  it('exporte puis restaure toutes les nouvelles données de musculation', async () => {
    const exercise = createEntity(createExerciseDefinitionInput(), 'exercise-1');
    const template = createEntity(createWorkoutTemplateInput(), 'template-1');
    const templateExercise = createEntity(
      createWorkoutTemplateExerciseInput(),
      'template-exercise-1',
    );
    const session = createEntity(createWorkoutSessionInput(), 'session-1');
    const sessionExercise = createEntity(
      createWorkoutSessionExerciseInput(),
      'session-exercise-1',
    );
    const strengthSet = createEntity(createStrengthSetInput(), 'set-1');
    const suggestion = createEntity(
      createProgressionSuggestionInput(),
      'suggestion-1',
    );

    await database.exerciseDefinitions.add(exercise);
    await database.workoutTemplates.add(template);
    await database.workoutTemplateExercises.add(templateExercise);
    await database.workoutSessions.add(session);
    await database.workoutSessionExercises.add(sessionExercise);
    await database.strengthSets.add(strengthSet);
    await database.progressionSuggestions.add(suggestion);

    const envelope = await createBackupEnvelope(database, '2026-06-25T10:00:00.000Z');
    const parsed = parseBackupText(serializeBackupEnvelope(envelope));

    await clearAllUserData(database);
    await replaceDatabaseFromBackup(parsed, database);

    expect(await database.exerciseDefinitions.get('exercise-1')).toEqual(exercise);
    expect(await database.workoutTemplates.get('template-1')).toEqual(template);
    expect(await database.workoutTemplateExercises.get('template-exercise-1')).toEqual(
      templateExercise,
    );
    expect(await database.workoutSessions.get('session-1')).toEqual(session);
    expect(await database.workoutSessionExercises.get('session-exercise-1')).toEqual(
      sessionExercise,
    );
    expect(await database.strengthSets.get('set-1')).toEqual(strengthSet);
    expect(await database.progressionSuggestions.get('suggestion-1')).toEqual(suggestion);
  });

  it('remplace intégralement les données avec une sauvegarde valide', async () => {
    await database.weights.add(
      createEntity({ date: '2026-06-20', weightKg: 62 }, 'old-weight'),
    );
    const envelope = createEnvelope({
      weights: [createEntity({ date: '2026-06-23', weightKg: 60 }, 'new-weight')],
    });

    await replaceDatabaseFromBackup(envelope, database);

    expect(await database.weights.toArray()).toEqual([
      expect.objectContaining({ id: 'new-weight', weightKg: 60 }),
    ]);
    expect(await database.userProfile.get(LOCAL_USER_PROFILE_ID)).toBeDefined();
  });

  it('annule toute la transaction lorsque l’écriture échoue', async () => {
    await database.weights.add(
      createEntity({ date: '2026-06-20', weightKg: 62 }, 'old-weight'),
    );
    const envelope = createEnvelope({
      weights: [
        createEntity({ date: '2026-06-23', weightKg: 60 }, 'duplicate-1'),
        createEntity({ date: '2026-06-23', weightKg: 59 }, 'duplicate-2'),
      ],
    });

    await expect(replaceDatabaseFromBackup(envelope, database)).rejects.toThrow(
      /données précédentes ont été conservées/,
    );
    expect(await database.weights.toArray()).toEqual([
      expect.objectContaining({ id: 'old-weight', weightKg: 62 }),
    ]);
  });

  it('efface les données utilisateur et recrée uniquement les paramètres par défaut', async () => {
    await database.userProfile.add(
      createEntity<UserProfile>(createProfileInput(), LOCAL_USER_PROFILE_ID),
    );
    await database.weights.add(
      createEntity({ date: '2026-06-23', weightKg: 60 }, 'weight-1'),
    );
    await database.exerciseDefinitions.add(
      createEntity(createExerciseDefinitionInput(), 'exercise-1'),
    );

    await clearAllUserData(database);

    expect(await database.userProfile.count()).toBe(0);
    expect(await database.weights.count()).toBe(0);
    expect(await database.exerciseDefinitions.count()).toBe(0);
    expect(await database.appSettings.count()).toBe(1);
    expect(await database.appSettings.get(APP_SETTINGS_ID)).toMatchObject({
      id: APP_SETTINGS_ID,
      theme: 'system',
    });
  });

  it('refuse un JSON invalide avant toute opération de base', () => {
    expect(() => parseBackupText('{not-json')).toThrow(/JSON valide/);
  });
});
