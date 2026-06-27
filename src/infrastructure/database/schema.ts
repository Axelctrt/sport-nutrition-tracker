import { CURRENT_DATABASE_VERSION } from '@/infrastructure/database/migrations/versions';

export const databaseTableNames = [
  'userProfile',
  'appSettings',
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
] as const;

export const databaseInternalTableNames = [
  'migrationJournal',
  'databaseDiagnostics',
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
