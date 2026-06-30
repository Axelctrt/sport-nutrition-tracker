import type { BackupData } from '@/domain/models/backup';
import type { Goal } from '@/domain/goals/goalState';
import {
  computeGoalCurrentValue,
  computeGoalProgressPercent,
  createGoalProgressView,
} from '@/application/goals/goalProgressService';

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

function goal(
  overrides: Partial<Goal> = {},
): Goal {
  return {
    id: 'goal-1',
    title: 'Objectif test',
    metric: 'totalSteps',
    targetValue: 10_000,
    startDate: '2026-06-01',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('goalProgressService', () => {
  it('cumule uniquement les données postérieures au départ', () => {
    const data = emptyData();
    data.dailySteps = [
      {
        id: 'before',
        date: '2026-05-31',
        totalSteps: 9_000,
        source: 'manual',
        createdAt: '2026-05-31T08:00:00.000Z',
        updatedAt: '2026-05-31T08:00:00.000Z',
      },
      {
        id: 'after',
        date: '2026-06-02',
        totalSteps: 6_000,
        source: 'manual',
        createdAt: '2026-06-02T08:00:00.000Z',
        updatedAt: '2026-06-02T08:00:00.000Z',
      },
    ];

    expect(
      computeGoalCurrentValue(goal(), data),
    ).toBe(6_000);
  });

  it('additionne les distances par discipline', () => {
    const data = emptyData();
    data.activities = [
      {
        id: 'run',
        type: 'running',
        date: '2026-06-02',
        durationMinutes: 30,
        intensity: 'moderate',
        sessionType: 'easy',
        distanceKm: 5,
        averageCadenceSpm: 170,
        calculation: {
          weightKg: 70,
          estimatedCaloriesKcal: 400,
          calculationVersion: 1,
        },
        createdAt: '2026-06-02T08:00:00.000Z',
        updatedAt: '2026-06-02T08:00:00.000Z',
      },
      {
        id: 'swim',
        type: 'swimming',
        date: '2026-06-03',
        durationMinutes: 40,
        intensity: 'moderate',
        sessionType: 'endurance',
        mainStroke: 'freestyle',
        distanceMeters: 1_500,
        calculation: {
          weightKg: 70,
          estimatedCaloriesKcal: 300,
          calculationVersion: 1,
        },
        createdAt: '2026-06-03T08:00:00.000Z',
        updatedAt: '2026-06-03T08:00:00.000Z',
      },
    ];

    expect(
      computeGoalCurrentValue(
        goal({
          metric: 'runningDistanceKm',
          targetValue: 10,
        }),
        data,
      ),
    ).toBe(5);

    expect(
      computeGoalCurrentValue(
        goal({
          metric: 'swimmingDistanceKm',
          targetValue: 3,
        }),
        data,
      ),
    ).toBe(1.5);
  });

  it('calcule une progression de poids dans les deux directions', () => {
    expect(
      computeGoalProgressPercent(
        goal({
          metric: 'weightTarget',
          baselineValue: 80,
          targetValue: 70,
        }),
        75,
      ),
    ).toBe(50);

    expect(
      computeGoalProgressPercent(
        goal({
          metric: 'weightTarget',
          baselineValue: 60,
          targetValue: 70,
        }),
        65,
      ),
    ).toBe(50);
  });

  it('détecte les jalons, le rythme requis et le retard', () => {
    const data = emptyData();
    data.dailySteps = [
      {
        id: 'steps',
        date: '2026-06-02',
        totalSteps: 5_000,
        source: 'manual',
        createdAt: '2026-06-02T08:00:00.000Z',
        updatedAt: '2026-06-02T08:00:00.000Z',
      },
    ];

    const view = createGoalProgressView(
      goal({
        deadline: '2026-06-06',
      }),
      data,
      '2026-06-04',
    );

    expect(view.progressPercent).toBe(50);
    expect(view.newlyReachedMilestones).toEqual([
      25,
      50,
    ]);
    expect(view.daysRemaining).toBe(2);
    expect(view.requiredPerDay).toBe(2_500);

    expect(
      createGoalProgressView(
        goal({ deadline: '2026-06-03' }),
        data,
        '2026-06-04',
      ).isOverdue,
    ).toBe(true);
  });
});
