import { describe, expect, it } from 'vitest';
import { COACH_STATES, type CoachStateResult } from '@/domain/coach/coachState';
import {
  buildCoachStateObservations,
  type BuildCoachStateObservationsInput,
} from '@/domain/coach/coachStateObservations';
import type { FoodEntry } from '@/domain/models/food';
import type { WorkoutSession } from '@/domain/models/strength';
import type { DailyTarget } from '@/domain/models/targets';
import type { WeightEntry } from '@/domain/models/weight';
import { buildCalorieAdaptationObservations } from '@/domain/reviews/calorieAdaptationObservations';
import { createEntity } from '@/shared/utils/entities';

const FIRST_DATE = '2026-08-01';
const SECOND_DATE = '2026-08-02';
const THIRD_DATE = '2026-08-03';

function target(date: string, withStepBasis: boolean): DailyTarget {
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
    ...(withStepBasis
      ? {
          stepBasis: {
            mode: 'expected' as const,
            steps: 7_500,
            stepGoal: 8_000,
            source: 'recentHistory' as const,
            confidence: 'established' as const,
            observedDayCount: 21,
            observationWindowDays: 28,
          },
        }
      : {}),
    calculationVersion: 5,
  }, `target-${date}`);
}

function weight(
  date: string,
  provenance?: WeightEntry['provenance'],
): WeightEntry {
  return createEntity({
    date,
    weightKg: 70,
    ...(provenance ? { provenance } : {}),
  }, `weight-${date}`);
}

function input(): BuildCoachStateObservationsInput {
  return {
    analysisStart: FIRST_DATE,
    analysisEnd: THIRD_DATE,
    fallbackExpectedSteps: 8_000,
    weights: [
      weight(FIRST_DATE, 'userMeasurement'),
      weight(SECOND_DATE, 'profileInitialization'),
      weight(THIRD_DATE),
    ],
    foodEntries: [createEntity<FoodEntry>({
      date: FIRST_DATE,
      mealId: 'meal',
      mealSlot: 'lunch' as const,
      sourceType: 'product' as const,
      reference: {
        sourceType: 'product' as const,
        productId: 'product',
        inputMode: 'amount' as const,
        inputQuantity: 100,
        normalizedAmount: 100,
        normalizedUnit: 'g' as const,
        nutritionPer100Snapshot: {
          caloriesKcal: 2_000,
          proteinGrams: 120,
          carbohydratesGrams: 0,
          fatGrams: 0,
        },
      },
    }, 'food')],
    dailyTargets: [target(FIRST_DATE, true), target(SECOND_DATE, false)],
    journalStatuses: [createEntity({
      date: FIRST_DATE,
      isComplete: true,
    }, 'status')],
    dailySteps: [createEntity({
      date: FIRST_DATE,
      totalSteps: 7_000,
      source: 'manual' as const,
    }, 'steps')],
    checkIns: [
      createEntity({
        date: FIRST_DATE,
        waistCm: 81,
        sleepQuality: 'good' as const,
        readiness: 'high' as const,
        signalProvenance: {
          sleepQuality: 'userReported' as const,
          readiness: 'userReported' as const,
        },
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-08-01T07:00:00.000Z',
      }, 'check-in-confirmed'),
      createEntity({
        date: SECOND_DATE,
        sleepQuality: 'average' as const,
        readiness: 'normal' as const,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-08-02T07:00:00.000Z',
      }, 'check-in-legacy'),
      createEntity({
        date: THIRD_DATE,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-08-03T07:00:00.000Z',
      }, 'check-in-absent'),
    ],
    checkOuts: [
      createEntity({
        date: FIRST_DATE,
        hunger: 'normal' as const,
        energy: 'normal' as const,
        signalProvenance: {
          hunger: 'userReported' as const,
          energy: 'userReported' as const,
        },
        foodJournalComplete: true,
        contextFlags: ['travel'] as const,
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-08-01T20:00:00.000Z',
      }, 'check-out-confirmed'),
      createEntity({
        date: SECOND_DATE,
        hunger: 'high' as const,
        energy: 'low' as const,
        foodJournalComplete: false,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-08-02T20:00:00.000Z',
      }, 'check-out-legacy'),
      createEntity({
        date: THIRD_DATE,
        foodJournalComplete: false,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-08-03T20:00:00.000Z',
      }, 'check-out-absent'),
    ],
    activities: [],
    workoutSessions: [createEntity<WorkoutSession>({
      date: FIRST_DATE,
      status: 'completed' as const,
    }, 'strength-session')],
  };
}

describe('Coach State foundation', () => {
  it('définit le contrat complet sans résoudre un état', () => {
    expect(COACH_STATES).toEqual([
      'insufficientData',
      'insufficientFoodTracking',
      'onTrack',
      'temporaryWaterVariation',
      'possibleRecomposition',
      'conflictingSignals',
      'truePlateau',
      'targetTooHigh',
      'targetTooLow',
      'excessiveLoss',
      'excessiveGain',
      'activityBelowExpected',
      'degradedRecovery',
    ]);

    const contract = {
      state: 'onTrack',
      confidence: {
        weight: 100,
        food: 100,
        activity: 100,
        recovery: 100,
        overall: 100,
        level: 'reliable',
      },
      reasons: [],
      blockingFactors: [],
      priority: 'low',
      recommendedAction: { type: 'maintainPlan' },
      nextReview: { type: 'date', date: FIRST_DATE },
    } satisfies CoachStateResult;

    expect(contract.recommendedAction.type).toBe('maintainPlan');
    expect(buildCoachStateObservations(input())[0]).not.toHaveProperty('state');
  });

  it('préserve la qualification des poids et des quatre subjectifs', () => {
    const observations = buildCoachStateObservations(input());

    expect(observations[0]?.weight).toMatchObject({
      provenance: 'userMeasured',
      confidence: 'confirmed',
    });
    expect(observations[1]?.weight).toMatchObject({
      provenance: 'profileInitialization',
      confidence: 'fallback',
    });
    expect(observations[2]?.weight).toMatchObject({
      provenance: 'legacyUnknown',
      confidence: 'unknown',
    });

    for (const signal of ['sleepQuality', 'readiness', 'hunger', 'energy'] as const) {
      expect(observations[0]?.[signal]).toMatchObject({
        provenance: 'userReported',
        confidence: 'confirmed',
      });
      expect(observations[1]?.[signal]).toMatchObject({
        provenance: 'legacyUnknown',
        confidence: 'unknown',
      });
      expect(observations[2]?.[signal]).toBeUndefined();
    }
  });

  it('préserve les provenances de pas sans inventer un historique', () => {
    const observations = buildCoachStateObservations(input());

    expect(observations[0]?.expectedSteps).toEqual({
      value: 7_500,
      source: 'recentHistory',
      confidence: 'established',
    });
    expect(observations[1]?.expectedSteps).toEqual({
      value: 8_000,
      source: 'profileFallback',
      confidence: 'fallback',
    });
    expect(observations[0]?.actualSteps).toEqual({
      value: 7_000,
      source: 'manual',
    });
  });

  it('compose les données historiques non sensibles sans les recalculer', () => {
    const source = input();
    const historical = buildCalorieAdaptationObservations(source)[0]!;
    const coach = buildCoachStateObservations(source)[0]!;

    expect(coach).toMatchObject({
      waistCm: historical.waistCm,
      consumedCaloriesKcal: historical.consumedCaloriesKcal,
      targetCaloriesKcal: historical.targetCaloriesKcal,
      proteinTargetMet: historical.proteinTargetMet,
      journalComplete: historical.journalComplete,
      hasTemporaryContext: historical.hasTemporaryContext,
      strengthSessionCount: historical.strengthSessionCount,
    });
  });

  it('n’expose aucune copie brute permettant de contourner les preuves', () => {
    const observations = buildCoachStateObservations(input());

    for (const observation of observations) {
      expect(observation).not.toHaveProperty('weightKg');
      for (const signal of ['sleepQuality', 'readiness', 'hunger', 'energy'] as const) {
        if (observation[signal]) {
          expect(observation[signal]).toEqual(expect.objectContaining({
            value: expect.any(String),
            provenance: expect.any(String),
            confidence: expect.any(String),
          }));
        }
      }
    }
  });
});
