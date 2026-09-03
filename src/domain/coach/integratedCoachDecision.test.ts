import { addDays, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  projectQualifiedCalorieObservations,
  resolveIntegratedCoachDecision,
  summarizeIntegratedStrengthContext,
  type IntegratedCoachAction,
  type IntegratedStrengthContext,
} from '@/domain/coach/integratedCoachDecision';
import type { CoachState, CoachStateResult } from '@/domain/coach/coachState';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type {
  StrengthExercisePerformance,
  StrengthPerformanceSnapshot,
  StrengthPerformanceTrend,
} from '@/domain/coach/strengthPerformance';
import type { LocalDate } from '@/domain/models/common';
import type { CalorieAdaptationAssessment } from '@/domain/models/weeklyReview';
import {
  calculateCalorieAdaptationAssessment,
  type CalorieAdaptationObservation,
  type CalculateCalorieAdaptationAssessmentInput,
} from '@/domain/reviews/calorieAdaptationAssessment';
import { toLocalDate } from '@/shared/utils/dates';
import { createCalorieAdaptationAssessment } from '@/test/factories/weeklyReviewFactory';
import { createCoachSafetyAssessment } from '@/test/factories/coachSafetyFactory';

const REFERENCE_DATE: LocalDate = '2026-08-25';

function exercise(
  trend: StrengthPerformanceTrend,
  index: number,
): StrengthExercisePerformance {
  return {
    exerciseDefinitionId: `exercise-${index}`,
    exerciseName: `Exercise ${index}`,
    trackingMode: 'loadRepetitions',
    exposureCount: trend === 'insufficientData' ? 1 : 3,
    comparableExposureCount: trend === 'insufficientData' ? 1 : 3,
    trend,
    reasons: [],
    exposures: [],
  };
}

function strength(
  ...trends: StrengthPerformanceTrend[]
): StrengthPerformanceSnapshot {
  return {
    referenceDate: REFERENCE_DATE,
    exercises: trends.map(exercise),
    schedule: {
      completedPlannedCount: 0,
      skippedCount: 0,
      overdueCount: 0,
      abandonedCount: 0,
    },
  };
}

function coachState(
  state: CoachState,
  confidenceLevel: CoachStateResult['confidence']['level'] = 'reliable',
): CoachStateResult {
  return {
    state,
    confidence: {
      weight: 100,
      food: 100,
      activity: 100,
      recovery: 100,
      overall: confidenceLevel === 'reliable' ? 100 : 50,
      level: confidenceLevel,
    },
    reasons: [],
    blockingFactors: [],
    priority: state === 'degradedRecovery' ? 'high' : 'medium',
    recommendedAction: { type: 'maintainPlan' },
    nextReview: { type: 'date', date: '2026-09-01' },
  };
}

function assessment(
  proposedAdjustmentKcal: number,
  overrides: Partial<CalorieAdaptationAssessment> = {},
): CalorieAdaptationAssessment {
  return createCalorieAdaptationAssessment({
    proposedAdjustmentKcal,
    ...overrides,
  });
}

describe('summarizeIntegratedStrengthContext', () => {
  it.each([
    [[], 'insufficient'],
    [['insufficientData'], 'insufficient'],
    [['progressing', 'insufficientData'], 'progressing'],
    [['stable', 'insufficientData'], 'stable'],
    [['stagnating', 'stable'], 'stagnating'],
    [['degrading', 'stable'], 'degrading'],
    [['degrading', 'progressing', 'stagnating'], 'mixed'],
  ] as [StrengthPerformanceTrend[], IntegratedStrengthContext][])(
    '%j -> %s sans seuil arbitraire',
    (trends, expected) => {
      expect(summarizeIntegratedStrengthContext(strength(...trends))).toBe(expected);
    },
  );
});

interface DecisionCase {
  name: string;
  state: CoachState;
  strength: StrengthPerformanceTrend[];
  candidate: number;
  action: IntegratedCoachAction;
  proposed?: number;
  blockedReason?: string;
  confidence?: CoachStateResult['confidence']['level'];
  assessmentOverrides?: Partial<CalorieAdaptationAssessment>;
}

describe('resolveIntegratedCoachDecision', () => {
  it.each([
    { name: '1 insufficientData', state: 'insufficientData', strength: [], candidate: -50, action: 'collectMoreData', blockedReason: 'dataQuality' },
    { name: '2 confiance insuffisante', state: 'truePlateau', confidence: 'uncertain', strength: [], candidate: -50, action: 'collectMoreData', blockedReason: 'dataQuality' },
    { name: '3 insufficientFoodTracking', state: 'insufficientFoodTracking', strength: [], candidate: -50, action: 'improveFoodTracking', blockedReason: 'foodAdherence' },
    { name: '3b insufficientFoodTracking devance une confiance incertaine', state: 'insufficientFoodTracking', confidence: 'uncertain', strength: [], candidate: -50, action: 'improveFoodTracking', blockedReason: 'foodAdherence' },
    { name: '4 suivi alimentaire bloqué par le moteur existant', state: 'truePlateau', strength: [], candidate: -50, action: 'maintainPlan', blockedReason: 'foodAdherence', assessmentOverrides: { blockingFactors: ['Apports hors seuil existant.'] } },
    { name: '5 recovery bloque -50', state: 'degradedRecovery', strength: [], candidate: -50, action: 'prioritizeRecovery', blockedReason: 'recovery' },
    { name: '6 recovery conserve +50 protecteur', state: 'degradedRecovery', strength: [], candidate: 50, action: 'prioritizeRecovery', proposed: 50 },
    { name: '7 recovery reste longitudinal C1', state: 'onTrack', strength: [], candidate: 0, action: 'maintainPlan' },
    { name: '8 activité bloque -50', state: 'activityBelowExpected', strength: [], candidate: -50, action: 'reviewActivity', blockedReason: 'activity' },
    { name: '9 activité sans candidat reste prioritaire', state: 'activityBelowExpected', strength: [], candidate: 0, action: 'reviewActivity' },
    { name: '10 plateau + progressing bloque -50', state: 'truePlateau', strength: ['progressing'], candidate: -50, action: 'maintainPlan', blockedReason: 'strengthPerformance' },
    { name: '11 plateau + degrading bloque -50', state: 'truePlateau', strength: ['degrading'], candidate: -50, action: 'reviewTraining', blockedReason: 'strengthPerformance' },
    { name: '12 plateau + mixed bloque -50', state: 'truePlateau', strength: ['degrading', 'progressing'], candidate: -50, action: 'reviewTraining', blockedReason: 'strengthPerformance' },
    { name: '13 stagnating ne bloque pas -50', state: 'truePlateau', strength: ['stagnating'], candidate: -50, action: 'reviewNutritionTarget', proposed: -50 },
    { name: '14 Strength insuffisant ne bloque pas -50', state: 'truePlateau', strength: ['insufficientData'], candidate: -50, action: 'reviewNutritionTarget', proposed: -50 },
    { name: '15 perte excessive + degrading conserve +50', state: 'excessiveLoss', strength: ['degrading'], candidate: 50, action: 'reviewNutritionTarget', proposed: 50 },
    { name: '16 mauvais Strength seul ne crée aucune hausse', state: 'onTrack', strength: ['degrading'], candidate: 0, action: 'monitorTrend' },
    { name: '17 contexte temporaire', state: 'temporaryWaterVariation', strength: [], candidate: -50, action: 'monitorTrend', blockedReason: 'temporaryContext' },
    { name: '18 signaux contradictoires', state: 'conflictingSignals', strength: [], candidate: -50, action: 'monitorTrend', blockedReason: 'conflictingSignals' },
    { name: '19 onTrack', state: 'onTrack', strength: ['stable'], candidate: 0, action: 'maintainPlan' },
    { name: '20 recomposition', state: 'possibleRecomposition', strength: ['progressing'], candidate: 0, action: 'maintainPlan' },
    { name: '21 candidat zéro', state: 'truePlateau', strength: ['stable'], candidate: 0, action: 'monitorTrend' },
    { name: '22 récupération devance activité et Strength', state: 'degradedRecovery', strength: ['degrading'], candidate: -50, action: 'prioritizeRecovery', blockedReason: 'recovery' },
    { name: '23 activité devance Strength', state: 'activityBelowExpected', strength: ['degrading'], candidate: -50, action: 'reviewActivity', blockedReason: 'activity' },
    { name: '24 correction Nutrition unique', state: 'targetTooHigh', strength: ['stable'], candidate: -100, action: 'reviewNutritionTarget', proposed: -100 },
  ] satisfies DecisionCase[])('$name', ({
    state,
    strength: trends,
    candidate,
    action,
    proposed,
    blockedReason,
    confidence,
    assessmentOverrides,
  }) => {
    const result = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState(state, confidence),
      strengthPerformance: strength(...trends),
      calorieAssessment: assessment(candidate, assessmentOverrides),
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: REFERENCE_DATE }),
    });

    expect(result.primaryAction).toBe(action);
    expect(result.proposedNutritionAdjustmentKcal).toBe(proposed);
    expect(result.requiresUserAcceptance).toBe(proposed !== undefined);
    expect(result.blockedAdjustment?.reason).toBe(blockedReason);
    expect(Object.keys(result).filter((key) => key === 'primaryAction')).toHaveLength(1);
  });

  it('expose les compteurs planning seulement comme raisons, sans seuil décisionnel', () => {
    const snapshot = strength('stable');
    snapshot.schedule = {
      completedPlannedCount: 1,
      skippedCount: 9,
      overdueCount: 8,
      abandonedCount: 7,
    };
    const result = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('onTrack'),
      strengthPerformance: snapshot,
      calorieAssessment: assessment(0),
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: REFERENCE_DATE }),
    });

    expect(result.primaryAction).toBe('maintainPlan');
    expect(result.reasons).toEqual(expect.arrayContaining([
      'strengthScheduleSkipped:9',
      'strengthScheduleOverdue:8',
      'strengthScheduleAbandoned:7',
    ]));
  });

  it('ne transforme pas une priorité activité en second levier Nutrition', () => {
    const result = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('activityBelowExpected'),
      strengthPerformance: strength('degrading'),
      calorieAssessment: assessment(50),
      safetyAssessment: createCoachSafetyAssessment({ referenceDate: REFERENCE_DATE }),
    });
    expect(result.primaryAction).toBe('reviewActivity');
    expect(result).not.toHaveProperty('proposedNutritionAdjustmentKcal');
    expect(result.requiresUserAcceptance).toBe(false);
  });

  it('bloque avec une raison Safety typée uniquement une baisse sous doNotIntensify', () => {
    const safetyAssessment = createCoachSafetyAssessment({
      status: 'doNotIntensify',
      concerns: [
        { domain: 'recovery', reasons: ['Récupération à protéger.'], immediateVeto: false },
        { domain: 'performance', reasons: ['Performance en baisse.'], immediateVeto: false },
      ],
      reasons: ['Récupération à protéger.', 'Performance en baisse.'],
      blockingFactors: ['Récupération à protéger.', 'Performance en baisse.'],
    });
    const blocked = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('truePlateau'),
      strengthPerformance: strength('stable'),
      calorieAssessment: assessment(-50),
      safetyAssessment,
    });
    const protective = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('excessiveLoss'),
      strengthPerformance: strength('stable'),
      calorieAssessment: assessment(50),
      safetyAssessment,
    });

    expect(blocked.blockedAdjustment).toEqual({ direction: 'decrease', reason: 'safety' });
    expect(blocked).not.toHaveProperty('proposedNutritionAdjustmentKcal');
    expect(blocked.requiresUserAcceptance).toBe(false);
    expect(protective.proposedNutritionAdjustmentKcal).toBe(50);
    expect(protective.requiresUserAcceptance).toBe(true);
  });

  it('ne bloque ni une baisse en caution, ni un candidat nul', () => {
    const caution = createCoachSafetyAssessment({
      status: 'caution',
      concerns: [{ domain: 'performance', reasons: ['À surveiller.'], immediateVeto: false }],
      reasons: ['À surveiller.'],
    });
    const decrease = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('targetTooHigh'),
      strengthPerformance: strength('stable'),
      calorieAssessment: assessment(-50),
      safetyAssessment: caution,
    });
    const unchanged = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('truePlateau'),
      strengthPerformance: strength('stable'),
      calorieAssessment: assessment(0),
      safetyAssessment: createCoachSafetyAssessment({
        status: 'doNotIntensify',
        concerns: [{ domain: 'acuteContext', reasons: ['Maladie.'], immediateVeto: true }],
        reasons: ['Maladie.'],
        blockingFactors: ['Maladie.'],
      }),
    });

    expect(decrease.proposedNutritionAdjustmentKcal).toBe(-50);
    expect(decrease.requiresUserAcceptance).toBe(true);
    expect(unchanged.primaryAction).toBe('monitorTrend');
    expect(unchanged.requiresUserAcceptance).toBe(false);
  });

  it('refuse défensivement toute baisse incohérente avec excessiveLoss', () => {
    const result = resolveIntegratedCoachDecision({
      referenceDate: REFERENCE_DATE,
      coachStateResult: coachState('excessiveLoss'),
      strengthPerformance: strength('stable'),
      calorieAssessment: assessment(-50),
      safetyAssessment: createCoachSafetyAssessment({
        status: 'caution',
        concerns: [{
          domain: 'bodyTrend',
          reasons: ['La perte observée est plus rapide que prévu.'],
          immediateVeto: false,
        }],
        reasons: ['La perte observée est plus rapide que prévu.'],
      }),
    });
    expect(result.blockedAdjustment).toEqual({ direction: 'decrease', reason: 'safety' });
    expect(result).not.toHaveProperty('proposedNutritionAdjustmentKcal');
  });
});

function observation(
  overrides: Partial<CoachStateObservation> = {},
): CoachStateObservation {
  return {
    date: REFERENCE_DATE,
    journalComplete: false,
    expectedSteps: {
      value: 9_000,
      source: 'profileFallback',
      confidence: 'fallback',
    },
    hasTemporaryContext: false,
    strengthSessionCount: 0,
    ...overrides,
  };
}

describe('projectQualifiedCalorieObservations', () => {
  it.each([
    ['userMeasured', 'confirmed', 80],
    ['profileInitialization', 'fallback', undefined],
    ['legacyUnknown', 'unknown', undefined],
    ['profileFallback', 'fallback', undefined],
  ] as const)('poids %s/%s -> %s', (provenance, confidence, expected) => {
    const [projected] = projectQualifiedCalorieObservations([observation({
      weight: { value: 80, date: REFERENCE_DATE, provenance, confidence },
    })]);
    expect(projected?.weightKg).toBe(expected);
  });

  it('transmet uniquement les subjectifs userReported/confirmed', () => {
    const [projected] = projectQualifiedCalorieObservations([observation({
      hunger: {
        value: 'high',
        date: REFERENCE_DATE,
        provenance: 'userReported',
        confidence: 'confirmed',
      },
      energy: {
        value: 'low',
        date: REFERENCE_DATE,
        provenance: 'legacyUnknown',
        confidence: 'unknown',
      },
    })]);
    expect(projected).toMatchObject({ hunger: 'high' });
    expect(projected).not.toHaveProperty('energy');
    expect(projected).not.toHaveProperty('readiness');
    expect(projected).not.toHaveProperty('sleepQuality');
  });

  it('omet la baseline de pas fallback tout en conservant la mesure réelle', () => {
    const [fallback] = projectQualifiedCalorieObservations([observation({
      actualSteps: { value: 1_000, source: 'manual' },
    })]);
    const [qualified] = projectQualifiedCalorieObservations([observation({
      expectedSteps: { value: 9_000, source: 'recentHistory', confidence: 'established' },
      actualSteps: { value: 8_500, source: 'manual' },
    })]);
    expect(fallback).not.toHaveProperty('expectedSteps');
    expect(fallback?.actualSteps).toBe(1_000);
    expect(qualified).toMatchObject({ expectedSteps: 9_000, actualSteps: 8_500 });
  });

  it('empêche une baseline de pas fallback de déclencher activityBelowExpected', () => {
    const raw = rawObservations(0, false).map((entry) => ({
      ...entry,
      actualSteps: 1_000,
    }));
    const projected = projectQualifiedCalorieObservations(
      qualifiedFromRaw(raw).map((entry) => ({
        ...entry,
        expectedSteps: {
          value: 9_000,
          source: 'profileFallback',
          confidence: 'fallback',
        },
      })),
    );
    const result = calculateCalorieAdaptationAssessment({
      analysisStart: '2026-08-05',
      analysisEnd: REFERENCE_DATE,
      observations: projected,
      goal: 'loss',
      targetWeeklyWeightChangeKg: -0.4,
      currentCumulativeAdjustmentKcal: 0,
      maximumWeeklyAdjustmentKcal: 100,
      maximumCumulativeAdjustmentKcal: 600,
    });
    expect(result.actualToExpectedStepsPercent).toBeUndefined();
    expect(result.detectedState).not.toBe('activityBelowExpected');
  });

  it('ne rend pas fiable un candidat fondé uniquement sur des poids fallback', () => {
    const observations = rawObservations(0, true).map((entry) => observation({
      date: entry.date,
      weight: {
        value: entry.weightKg!,
        date: entry.date,
        provenance: 'profileFallback',
        confidence: 'fallback',
      },
      consumedCaloriesKcal: entry.consumedCaloriesKcal!,
      targetCaloriesKcal: entry.targetCaloriesKcal!,
      journalComplete: true,
    }));
    const result = calculateCalorieAdaptationAssessment({
      analysisStart: '2026-08-05',
      analysisEnd: REFERENCE_DATE,
      observations: projectQualifiedCalorieObservations(observations),
      goal: 'loss',
      targetWeeklyWeightChangeKg: -0.4,
      currentCumulativeAdjustmentKcal: 0,
      maximumWeeklyAdjustmentKcal: 100,
      maximumCumulativeAdjustmentKcal: 600,
    });
    expect(result.detectedState).toBe('insufficientData');
    expect(result.proposedAdjustmentKcal).toBe(0);
  });
});

function rawObservations(
  weeklyWeightTrend: number,
  reliable: boolean,
): CalorieAdaptationObservation[] {
  return Array.from({ length: 21 }, (_, index) => {
    const date = toLocalDate(addDays(parseISO('2026-08-05'), index));
    return {
      date,
      weightKg: 80 + weeklyWeightTrend * index / 7,
      consumedCaloriesKcal: 2_000,
      targetCaloriesKcal: 2_000,
      proteinTargetMet: true,
      journalComplete: true,
      ...(reliable ? { expectedSteps: 9_000, actualSteps: 9_000 } : {}),
      hasTemporaryContext: false,
      strengthSessionCount: 0,
    };
  });
}

function qualifiedFromRaw(
  entries: readonly CalorieAdaptationObservation[],
): CoachStateObservation[] {
  return entries.map((entry) => observation({
    date: entry.date,
    weight: {
      value: entry.weightKg!,
      date: entry.date,
      provenance: 'userMeasured',
      confidence: 'confirmed',
    },
    ...(entry.consumedCaloriesKcal === undefined
      ? {}
      : { consumedCaloriesKcal: entry.consumedCaloriesKcal }),
    ...(entry.targetCaloriesKcal === undefined
      ? {}
      : { targetCaloriesKcal: entry.targetCaloriesKcal }),
    ...(entry.proteinTargetMet === undefined
      ? {}
      : { proteinTargetMet: entry.proteinTargetMet }),
    journalComplete: entry.journalComplete,
    ...(entry.expectedSteps === undefined
      ? {}
      : {
          expectedSteps: {
            value: entry.expectedSteps,
            source: 'recentHistory' as const,
            confidence: 'established' as const,
          },
        }),
    ...(entry.actualSteps === undefined
      ? {}
      : { actualSteps: { value: entry.actualSteps, source: 'manual' as const } }),
  }));
}

interface ParityCase {
  name: string;
  weeklyTrend: number;
  reliable: boolean;
  expected: number;
  overrides?: Partial<CalculateCalorieAdaptationAssessmentInput>;
}

describe('parité du candidat calorique existant', () => {
  it.each([
    { name: '+50', weeklyTrend: -0.8, reliable: false, expected: 50 },
    { name: '-50', weeklyTrend: 0, reliable: false, expected: -50 },
    { name: '+100', weeklyTrend: -0.8, reliable: true, expected: 100 },
    { name: '-100', weeklyTrend: 0, reliable: true, expected: -100 },
    { name: '0', weeklyTrend: -0.4, reliable: true, expected: 0 },
    { name: 'cap hebdomadaire', weeklyTrend: 0, reliable: true, expected: -75, overrides: { maximumWeeklyAdjustmentKcal: 75 } },
    { name: 'cap cumulatif', weeklyTrend: 0, reliable: true, expected: -25, overrides: { currentCumulativeAdjustmentKcal: -575 } },
    { name: 'cooldown', weeklyTrend: 0, reliable: true, expected: 0, overrides: { latestAcceptedAdjustmentDate: '2026-08-20' } },
  ] satisfies ParityCase[])('$name reste identique après projection qualifiée', ({
    weeklyTrend,
    reliable,
    expected,
    overrides,
  }) => {
    const raw = rawObservations(weeklyTrend, reliable);
    const input: CalculateCalorieAdaptationAssessmentInput = {
      analysisStart: '2026-08-05',
      analysisEnd: REFERENCE_DATE,
      observations: raw,
      goal: 'loss',
      targetWeeklyWeightChangeKg: -0.4,
      currentCumulativeAdjustmentKcal: 0,
      maximumWeeklyAdjustmentKcal: 100,
      maximumCumulativeAdjustmentKcal: 600,
      ...overrides,
    };
    const historical = calculateCalorieAdaptationAssessment(input);
    const qualified = calculateCalorieAdaptationAssessment({
      ...input,
      observations: projectQualifiedCalorieObservations(qualifiedFromRaw(raw)),
    });

    expect(qualified).toStrictEqual(historical);
    expect(qualified.proposedAdjustmentKcal).toBe(expected);
  });
});
