import type { BackupData } from '@/domain/models/backup';
import {
  createProgressReportFromData,
  formatProgressReportText,
} from '@/application/reports/progressReportService';

function createData(): BackupData {
  return {
    userProfile: [
      {
        id: 'profile-1',
        firstName: 'Alex',
        sexForEnergyEquation: 'male',
        ageInformation: {
          mode: 'age',
          ageYears: 30,
          recordedOn: '2026-06-01',
        },
        heightCm: 175,
        initialWeightKg: 80,
        goal: 'loss',
        targetWeeklyWeightChangePercent: 0.5,
        occupationalActivity: 'sedentary',
        dailyStepGoal: 10_000,
        proteinGramsPerKg: 1.6,
        fatGramsPerKg: 0.8,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ],
    appSettings: [],
    weights: [
      {
        id: 'weight-1',
        date: '2026-06-01',
        weightKg: 80,
        createdAt: '2026-06-01T07:00:00.000Z',
        updatedAt: '2026-06-01T07:00:00.000Z',
      },
      {
        id: 'weight-2',
        date: '2026-06-28',
        weightKg: 78.5,
        createdAt: '2026-06-28T07:00:00.000Z',
        updatedAt: '2026-06-28T07:00:00.000Z',
      },
    ],
    dailySteps: [
      {
        id: 'steps-1',
        date: '2026-06-28',
        totalSteps: 12_000,
        source: 'manual',
        createdAt: '2026-06-28T20:00:00.000Z',
        updatedAt: '2026-06-28T20:00:00.000Z',
      },
    ],
    activities: [
      {
        id: 'activity-1',
        date: '2026-06-28',
        type: 'running',
        durationMinutes: 60,
        intensity: 'moderate',
        sessionType: 'longRun',
        distanceKm: 10,
        averageCadenceSpm: 170,
        calculation: {
          weightKg: 78.5,
          estimatedCaloriesKcal: 650,
          calculationVersion: 1,
        },
        createdAt: '2026-06-28T08:00:00.000Z',
        updatedAt: '2026-06-28T08:00:00.000Z',
      },
    ],
    foodProducts: [],
    meals: [],
    foodEntries: [
      {
        id: 'entry-1',
        date: '2026-06-28',
        mealId: 'meal-1',
        mealSlot: 'breakfast',
        sourceType: 'product',
        reference: {
          sourceType: 'product',
          productId: 'product-1',
          inputMode: 'amount',
          inputQuantity: 100,
          normalizedAmount: 100,
          normalizedUnit: 'g',
          nutritionPer100Snapshot: {
            caloriesKcal: 500,
            proteinGrams: 30,
            carbohydratesGrams: 50,
            fatGrams: 20,
          },
        },
        createdAt: '2026-06-28T08:00:00.000Z',
        updatedAt: '2026-06-28T08:00:00.000Z',
      },
    ],
    favoriteMeals: [],
    recipes: [],
    recipeIngredients: [],
    dailyTargets: [
      {
        id: 'target-1',
        date: '2026-06-28',
        calculationWeightKg: 78.5,
        energy: {
          bmrKcal: 1700,
          occupationalBaseKcal: 300,
          walkingKcal: 300,
          runningKcal: 650,
          swimmingKcal: 0,
          strengthTrainingKcal: 0,
          otherActivitiesKcal: 0,
          totalEstimatedExpenditureKcal: 2950,
        },
        goalAdjustmentKcal: -400,
        acceptedCalibrationAdjustmentKcal: 0,
        calorieFloorKcal: 1500,
        targetCaloriesKcal: 2500,
        macros: {
          proteinGrams: 130,
          carbohydratesGrams: 300,
          fatGrams: 70,
        },
        calculationVersion: 1,
        createdAt: '2026-06-28T00:00:00.000Z',
        updatedAt: '2026-06-28T00:00:00.000Z',
      },
    ],
    dailyJournalStatuses: [
      {
        id: 'status-1',
        date: '2026-06-28',
        isComplete: true,
        completedAt: '2026-06-28T21:00:00.000Z',
        createdAt: '2026-06-28T21:00:00.000Z',
        updatedAt: '2026-06-28T21:00:00.000Z',
      },
    ],
    weeklyReviews: [],
    acceptedCalorieAdjustments: [],
    exerciseDefinitions: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
    workoutSessions: [
      {
        id: 'session-1',
        date: '2026-06-27',
        status: 'completed',
        durationMinutes: 75,
        createdAt: '2026-06-27T10:00:00.000Z',
        updatedAt: '2026-06-27T11:15:00.000Z',
      },
    ],
    workoutSessionExercises: [
      {
        id: 'session-exercise-1',
        sessionId: 'session-1',
        exerciseDefinitionId: 'exercise-1',
        exerciseNameSnapshot: 'Développé couché',
        sortOrder: 0,
        loadUnitSnapshot: 'kg',
        createdAt: '2026-06-27T10:00:00.000Z',
        updatedAt: '2026-06-27T10:00:00.000Z',
      },
    ],
    strengthSets: [
      {
        id: 'set-1',
        sessionId: 'session-1',
        sessionExerciseId: 'session-exercise-1',
        setNumber: 1,
        repetitions: 10,
        weightKg: 50,
        rpe: 8,
        type: 'working',
        isCompleted: true,
        createdAt: '2026-06-27T10:10:00.000Z',
        updatedAt: '2026-06-27T10:10:00.000Z',
      },
    ],
    progressionSuggestions: [],
  };
}

describe('progressReportService', () => {
  it('agrège les cinq domaines sur la période', () => {
    const report = createProgressReportFromData(
      createData(),
      {
        from: '2026-06-01',
        to: '2026-06-28',
        sections: [
          'weight',
          'steps',
          'activities',
          'nutrition',
          'strength',
        ],
        includeIdentity: true,
      },
      '2026-06-28T14:00:00.000Z',
    );

    expect(report.profile?.firstName).toBe('Alex');
    expect(report.weight?.changeKg).toBe(-1.5);
    expect(report.steps).toEqual(
      expect.objectContaining({
        averageSteps: 12_000,
        targetReachedDays: 1,
      }),
    );
    expect(report.activities).toEqual(
      expect.objectContaining({
        runningDistanceKm: 10,
        estimatedCaloriesKcal: 650,
      }),
    );
    expect(report.nutrition).toEqual(
      expect.objectContaining({
        trackedDays: 1,
        averageCaloriesKcal: 500,
        averageCalorieAdherencePercent: 20,
      }),
    );
    expect(report.strength).toEqual(
      expect.objectContaining({
        completedSessionCount: 1,
        totalVolumeKg: 500,
        averageRpe: 8,
      }),
    );
  });

  it('masque le profil et les sections non sélectionnées', () => {
    const report = createProgressReportFromData(createData(), {
      from: '2026-06-01',
      to: '2026-06-28',
      sections: ['activities'],
      includeIdentity: false,
    });

    expect(report.profile).toBeUndefined();
    expect(report.activities).toBeDefined();
    expect(report.weight).toBeUndefined();
    expect(report.nutrition).toBeUndefined();
  });

  it('refuse une période inversée ou trop longue', () => {
    expect(() =>
      createProgressReportFromData(createData(), {
        from: '2026-06-28',
        to: '2026-06-01',
        sections: ['weight'],
        includeIdentity: false,
      }),
    ).toThrow('La date de début du rapport');

    expect(() =>
      createProgressReportFromData(createData(), {
        from: '2025-01-01',
        to: '2026-06-28',
        sections: ['weight'],
        includeIdentity: false,
      }),
    ).toThrow('au maximum 366 jours');
  });

  it('génère un texte partageable sans données brutes', () => {
    const report = createProgressReportFromData(createData(), {
      from: '2026-06-01',
      to: '2026-06-28',
      sections: ['weight', 'activities'],
      includeIdentity: false,
    });

    const text = formatProgressReportText(report);

    expect(text).toContain('RAPPORT DE PROGRESSION SPORTPILOT');
    expect(text).toContain('Évolution : -1,5 kg');
    expect(text).toContain('Course : 10 km');
    expect(text).not.toContain('Alex');
  });
});
