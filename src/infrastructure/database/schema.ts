import { CURRENT_DATABASE_VERSION } from '@/infrastructure/database/migrations/versions';

export const databaseTableNames = [
  'userProfile',
  'userSettings',
  'weights',
  'dailySteps',
  'activities',
  'foodProducts',
  'meals',
  'foodEntries',
  'favoriteMeals',
  'recipes',
  'recipeIngredients',
  'dailyTargets',
  'dailyJournalStatuses',
  'weeklyReviews',
  'acceptedCalorieAdjustments',
  'exerciseDefinitions',
  'workoutTemplates',
  'workoutTemplateExercises',
  'workoutSessions',
  'workoutSessionExercises',
  'strengthSets',
  'progressionSuggestions',
  'goals',
  'endurancePlanningSessions',
  'earnedAchievements',
  'unlockedVisualThemes',
  'visualThemePreferences',
  'weeklyMissionCompletions',
  'routineReminderCompletions',
] as const;

export const databaseInternalTableNames = [
  'deviceSettings',
  'migrationJournal',
  'databaseDiagnostics',

  'trashItems',
] as const;

export const allDatabaseTableNames = [
  ...databaseTableNames,
  ...databaseInternalTableNames,
] as const;

export type DatabaseUserTableName = (typeof databaseTableNames)[number];
export type DatabaseInternalTableName =
  (typeof databaseInternalTableNames)[number];
export type DatabaseTableName = (typeof allDatabaseTableNames)[number];

export const databaseSchemaVersion = CURRENT_DATABASE_VERSION;

export const schemaVersion1 = {
  userProfile: 'id, updatedAt',
  appSettings: 'id, updatedAt',
  weights: 'id, &date, updatedAt',
  dailySteps: 'id, &date, updatedAt',
  activities: 'id, date, type, [date+type], updatedAt',
  foodProducts: 'id, name, barcode, isFavorite, isArchived, updatedAt',
  meals: 'id, &[date+slot], date, slot, updatedAt',
  foodEntries:
    'id, date, mealId, mealSlot, sourceType, [date+mealSlot], updatedAt',
  favoriteMeals: 'id, name, updatedAt',
  recipes: 'id, name, updatedAt',
  recipeIngredients: 'id, recipeId, productId, [recipeId+sortOrder], updatedAt',
  dailyTargets: 'id, &date, updatedAt',
  dailyJournalStatuses: 'id, &date, isComplete, updatedAt',
  weeklyReviews: 'id, &weekStart, updatedAt',
  acceptedCalorieAdjustments: 'id, effectiveFrom, status, updatedAt',
} as const;

export const schemaVersion2: Record<string, string> = {
  ...schemaVersion1,
  exerciseDefinitions:
    'id, name, source, primaryMuscleGroup, equipment, isArchived, updatedAt',
  workoutTemplates: 'id, name, isArchived, updatedAt',
  workoutTemplateExercises:
    'id, templateId, exerciseDefinitionId, [templateId+sortOrder], isActive, updatedAt',
  workoutSessions:
    'id, date, status, sourceTemplateId, [date+status], updatedAt',
  workoutSessionExercises:
    'id, sessionId, exerciseDefinitionId, [sessionId+sortOrder], updatedAt',
  strengthSets:
    'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], type, isCompleted, updatedAt',
  progressionSuggestions:
    'id, sessionId, sessionExerciseId, exerciseDefinitionId, templateExerciseId, status, updatedAt',
};

export const schemaVersion3: Record<string, string> = {
  ...schemaVersion2,
  migrationJournal: 'id, &version, status, source, appliedAt',
  databaseDiagnostics: 'id, checkedAt, status, schemaVersion',
};

export const schemaVersion4: Record<string, string> = {
  ...schemaVersion3,
  trashItems:
    'id, entityType, entityId, deletedAt, purgeAt, [entityType+entityId]',
};

export const schemaVersion5: Record<string, string> = {
  ...schemaVersion4,
  goals: 'id, metric, status, startDate, deadline, updatedAt',
  endurancePlanningSessions:
    'id, date, activityType, status, updatedAt',
};


export const schemaVersion6: Record<string, string> = {
  ...schemaVersion5,
  earnedAchievements: 'id, earnedAt, updatedAt',
  unlockedVisualThemes: 'id, unlockedAt, updatedAt',
  visualThemePreferences: 'id, activeThemeId, updatedAt',
  weeklyMissionCompletions: 'id, &weekStart, completedAt, updatedAt',
  routineReminderCompletions:
    'id, &[date+type], date, type, completedAt, updatedAt',
};

export const schemaVersion7 = {
  ...schemaVersion6,
  appSettings: null,
  userSettings: 'id, updatedAt',
  deviceSettings: 'id, &deviceId, updatedAt',
} as const;
