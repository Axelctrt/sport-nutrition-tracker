import { describe, expect, it } from 'vitest';
import type { StrengthTrainingActivity } from '@/domain/models/activity';
import type { DailyTarget } from '@/domain/models/targets';
import { buildCalorieAdaptationObservations } from '@/domain/reviews/calorieAdaptationObservations';
import { createEntity } from '@/shared/utils/entities';

function target(date: string): DailyTarget {
  return createEntity({
    date,
    calculationWeightKg: 70,
    energy: {
      bmrKcal: 1_600,
      occupationalBaseKcal: 1_900,
      walkingKcal: 100,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 2_000,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1_760,
    targetCaloriesKcal: 2_000,
    macros: {
      proteinGrams: 120,
      carbohydratesGrams: 240,
      fatGrams: 70,
    },
    stepBasis: {
      mode: 'expected',
      steps: 7_500,
      stepGoal: 8_000,
      source: 'recentHistory',
      confidence: 'established',
      observedDayCount: 21,
      observationWindowDays: 28,
    },
    calculationVersion: 5,
  }, `target-${date}`);
}

describe('calorie adaptation observations', () => {
  it('réunit les sources canoniques sans compter deux fois une séance de force', () => {
    const date = '2026-07-20';
    const strengthActivity = createEntity<StrengthTrainingActivity>({
      date,
      type: 'strengthTraining',
      durationMinutes: 60,
      intensity: 'moderate',
      met: 5,
      calculation: {
        weightKg: 70,
        estimatedCaloriesKcal: 250,
        calculationVersion: 1,
      },
    }, 'activity-strength');
    const result = buildCalorieAdaptationObservations({
      analysisStart: date,
      analysisEnd: date,
      fallbackExpectedSteps: 8_000,
      weights: [createEntity({ date, weightKg: 69.8 }, 'weight')],
      foodEntries: [],
      dailyTargets: [target(date)],
      journalStatuses: [createEntity({ date, isComplete: true }, 'status')],
      dailySteps: [createEntity({ date, totalSteps: 7_000, source: 'manual' as const }, 'steps')],
      checkIns: [createEntity({
        date,
        waistCm: 81,
        sleepQuality: 'good' as const,
        readiness: 'high' as const,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-20T07:00:00.000Z',
      }, 'check-in')],
      checkOuts: [createEntity({
        date,
        hunger: 'normal' as const,
        energy: 'normal' as const,
        foodJournalComplete: true,
        contextFlags: ['travel'] as const,
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-20T20:00:00.000Z',
      }, 'check-out')],
      activities: [strengthActivity],
      workoutSessions: [createEntity({
        date,
        status: 'completed' as const,
        completedActivityId: strengthActivity.id,
      }, 'session')],
    });

    expect(result).toEqual([
      expect.objectContaining({
        date,
        weightKg: 69.8,
        waistCm: 81,
        expectedSteps: 7_500,
        actualSteps: 7_000,
        journalComplete: true,
        hasTemporaryContext: true,
        strengthSessionCount: 1,
      }),
    ]);
  });
});
