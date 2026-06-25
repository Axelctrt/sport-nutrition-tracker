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

export type DatabaseTableName = (typeof databaseTableNames)[number];

export const databaseSchemaVersion = 2;

export const schemaVersion1 = {
  userProfile: 'id, updatedAt',
  appSettings: 'id, updatedAt',
  weights: 'id, &date, updatedAt',
  dailySteps: 'id, &date, updatedAt',
  activities: 'id, date, type, [date+type], updatedAt',
  foodProducts: 'id, name, barcode, isFavorite, isArchived, updatedAt',
  meals: 'id, &[date+slot], date, slot, updatedAt',
  foodEntries: 'id, date, mealId, mealSlot, sourceType, [date+mealSlot], updatedAt',
  favoriteMeals: 'id, name, updatedAt',
  recipes: 'id, name, updatedAt',
  recipeIngredients: 'id, recipeId, productId, [recipeId+sortOrder], updatedAt',
  dailyTargets: 'id, &date, updatedAt',
  dailyJournalStatuses: 'id, &date, isComplete, updatedAt',
  weeklyReviews: 'id, &weekStart, updatedAt',
  acceptedCalorieAdjustments: 'id, effectiveFrom, status, updatedAt',
} as const;

export const schemaVersion2: Record<DatabaseTableName, string> = {
  ...schemaVersion1,
  exerciseDefinitions:
    'id, name, source, primaryMuscleGroup, equipment, isArchived, updatedAt',
  workoutTemplates: 'id, name, isArchived, updatedAt',
  workoutTemplateExercises:
    'id, templateId, exerciseDefinitionId, [templateId+sortOrder], isActive, updatedAt',
  workoutSessions: 'id, date, status, sourceTemplateId, [date+status], updatedAt',
  workoutSessionExercises:
    'id, sessionId, exerciseDefinitionId, [sessionId+sortOrder], updatedAt',
  strengthSets:
    'id, sessionId, sessionExerciseId, [sessionExerciseId+setNumber], type, isCompleted, updatedAt',
  progressionSuggestions:
    'id, sessionId, sessionExerciseId, exerciseDefinitionId, templateExerciseId, status, updatedAt',
};
