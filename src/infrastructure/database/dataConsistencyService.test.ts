import type { BackupData } from '@/domain/models/backup';
import {
  createDataConsistencyRepairPlan,
  inspectDataConsistencyFromData,
  serializeDataConsistencyReport,
} from '@/infrastructure/database/dataConsistencyService';

function emptyData(): BackupData {
  return {
    userProfile: [],
    appSettings: [],
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

describe('dataConsistencyService', () => {
  it('considère une base vide comme cohérente', () => {
    const report = inspectDataConsistencyFromData(
      emptyData(),
      '2026-06-28T15:00:00.000Z',
    );

    expect(report).toEqual(
      expect.objectContaining({
        status: 'healthy',
        issueCount: 0,
        repairableIssueCount: 0,
      }),
    );
  });

  it('distingue les orphelins réparables des snapshots conservables', () => {
    const data = emptyData();

    data.recipeIngredients = [
      {
        id: 'ingredient-orphan',
        recipeId: 'missing-recipe',
        productId: 'missing-product',
      } as BackupData['recipeIngredients'][number],
    ];

    data.foodEntries = [
      {
        id: 'entry-snapshot',
        mealId: 'missing-meal',
        reference: {
          sourceType: 'product',
          productId: 'missing-product',
        },
      } as BackupData['foodEntries'][number],
    ];

    const report = inspectDataConsistencyFromData(data);

    expect(report.status).toBe('error');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'orphan-recipe-ingredient',
          repairable: true,
        }),
        expect.objectContaining({
          code: 'missing-food-entry-product',
          repairable: false,
        }),
      ]),
    );
  });

  it('inclut les enfants qui deviendraient orphelins dans le plan', () => {
    const data = emptyData();

    data.workoutSessionExercises = [
      {
        id: 'session-exercise-orphan',
        sessionId: 'missing-session',
        exerciseDefinitionId: 'exercise-1',
        sortOrder: 0,
      } as BackupData['workoutSessionExercises'][number],
    ];

    data.strengthSets = [
      {
        id: 'set-child',
        sessionId: 'missing-session',
        sessionExerciseId: 'session-exercise-orphan',
        setNumber: 1,
      } as BackupData['strengthSets'][number],
    ];

    data.progressionSuggestions = [
      {
        id: 'suggestion-child',
        sessionId: 'missing-session',
        sessionExerciseId: 'session-exercise-orphan',
        exerciseDefinitionId: 'exercise-1',
      } as BackupData['progressionSuggestions'][number],
    ];

    const report = inspectDataConsistencyFromData(data);
    const plan = createDataConsistencyRepairPlan(
      report,
      data,
    );

    expect(plan.workoutSessionExercises).toEqual([
      'session-exercise-orphan',
    ]);
    expect(plan.strengthSets).toEqual(['set-child']);
    expect(plan.progressionSuggestions).toEqual([
      'suggestion-child',
    ]);
    expect(plan.totalRecordCount).toBe(3);
  });

  it('signale les positions et numéros dupliqués sans les effacer', () => {
    const data = emptyData();

    data.workoutSessions = [
      {
        id: 'session-1',
      } as BackupData['workoutSessions'][number],
    ];

    data.workoutSessionExercises = [
      {
        id: 'exercise-1',
        sessionId: 'session-1',
        exerciseDefinitionId: 'definition-1',
        sortOrder: 0,
      } as BackupData['workoutSessionExercises'][number],
      {
        id: 'exercise-2',
        sessionId: 'session-1',
        exerciseDefinitionId: 'definition-2',
        sortOrder: 0,
      } as BackupData['workoutSessionExercises'][number],
    ];

    const report = inspectDataConsistencyFromData(data);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-session-sort-order',
          repairable: false,
        }),
      ]),
    );
  });

  it('sérialise un diagnostic partageable', () => {
    const report = inspectDataConsistencyFromData(
      emptyData(),
      '2026-06-28T15:00:00.000Z',
    );

    expect(
      JSON.parse(serializeDataConsistencyReport(report)),
    ).toEqual(
      expect.objectContaining({
        format: 'sportpilot-data-consistency-report',
        version: 1,
        status: 'healthy',
      }),
    );
  });
});
