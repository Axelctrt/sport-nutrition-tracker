import { addDays, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { resolveCoachState } from '@/domain/coach/coachStateResolver';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type { WeightGoal } from '@/domain/models/profile';

const START = new Date('2026-08-01T12:00:00');

interface Scenario {
  dayCount?: number;
  weightTrendKgPerWeek?: number;
  weightProvenance?: 'userMeasured' | 'profileInitialization' | 'legacyUnknown';
  weightConfidence?: 'confirmed' | 'fallback' | 'unknown';
  waistTrendCmPerWeek?: number;
  completeFoodDays?: number;
  actualSteps?: number;
  expectedStepsConfidence?: 'fallback' | 'emerging' | 'established';
  recovery?: 'confirmedNormal' | 'confirmedConcern' | 'legacyConcern' | 'absent';
  contextDays?: readonly number[];
  strengthEnabled?: boolean;
}

function observations(scenario: Scenario = {}): CoachStateObservation[] {
  const dayCount = scenario.dayCount ?? 21;
  const weightTrend = scenario.weightTrendKgPerWeek ?? -0.35;
  const weightProvenance = scenario.weightProvenance ?? 'userMeasured';
  const weightConfidence = scenario.weightConfidence ?? 'confirmed';
  const recovery = scenario.recovery ?? 'confirmedNormal';
  const expectedConfidence = scenario.expectedStepsConfidence ?? 'established';

  return Array.from({ length: dayCount }, (_, index) => {
    const date = format(addDays(START, index), 'yyyy-MM-dd');
    const recoverySignals = recovery === 'absent'
      ? {}
      : {
          hunger: {
            value: recovery === 'confirmedNormal' ? 'normal' as const : 'high' as const,
            date,
            provenance: recovery === 'legacyConcern' ? 'legacyUnknown' as const : 'userReported' as const,
            confidence: recovery === 'legacyConcern' ? 'unknown' as const : 'confirmed' as const,
          },
          energy: {
            value: recovery === 'confirmedNormal' ? 'normal' as const : 'low' as const,
            date,
            provenance: recovery === 'legacyConcern' ? 'legacyUnknown' as const : 'userReported' as const,
            confidence: recovery === 'legacyConcern' ? 'unknown' as const : 'confirmed' as const,
          },
          readiness: {
            value: recovery === 'confirmedNormal' ? 'normal' as const : 'low' as const,
            date,
            provenance: recovery === 'legacyConcern' ? 'legacyUnknown' as const : 'userReported' as const,
            confidence: recovery === 'legacyConcern' ? 'unknown' as const : 'confirmed' as const,
          },
          sleepQuality: {
            value: recovery === 'confirmedNormal' ? 'average' as const : 'poor' as const,
            date,
            provenance: recovery === 'legacyConcern' ? 'legacyUnknown' as const : 'userReported' as const,
            confidence: recovery === 'legacyConcern' ? 'unknown' as const : 'confirmed' as const,
          },
        };

    return {
      date,
      ...(index % 2 === 0
        ? {
            weight: {
              value: 70 + weightTrend / 7 * index,
              date,
              provenance: weightProvenance,
              confidence: weightConfidence,
            },
          }
        : {}),
      ...(scenario.waistTrendCmPerWeek !== undefined && index % 7 === 0
        ? { waistCm: 82 + scenario.waistTrendCmPerWeek / 7 * index }
        : {}),
      consumedCaloriesKcal: 2_000,
      targetCaloriesKcal: 2_000,
      proteinTargetMet: true,
      journalComplete: index < (scenario.completeFoodDays ?? dayCount),
      expectedSteps: {
        value: 8_000,
        source: expectedConfidence === 'fallback' ? 'profileFallback' : 'recentHistory',
        confidence: expectedConfidence,
      },
      actualSteps: { value: scenario.actualSteps ?? 8_000, source: 'manual' },
      ...recoverySignals,
      hasTemporaryContext: scenario.contextDays?.includes(index) ?? false,
      strengthSessionCount: scenario.strengthEnabled && index % 5 === 0 ? 1 : 0,
    };
  });
}

function resolve(
  scenario: Scenario = {},
  goal: WeightGoal = 'loss',
  targetWeeklyWeightChangeKg = goal === 'loss' ? -0.35 : goal === 'gain' ? 0.35 : 0,
) {
  return resolveCoachState({
    observations: observations(scenario),
    goal,
    targetWeeklyWeightChangeKg,
  });
}

describe('resolveCoachState', () => {
  it.each([
    ['insufficientData', { dayCount: 7 } satisfies Scenario, 'loss', -0.35],
    ['insufficientFoodTracking', { completeFoodDays: 7 } satisfies Scenario, 'loss', -0.35],
    ['onTrack', {} satisfies Scenario, 'loss', -0.35],
    ['temporaryWaterVariation', { weightTrendKgPerWeek: 0, contextDays: [10, 11] } satisfies Scenario, 'loss', -0.35],
    ['possibleRecomposition', { weightTrendKgPerWeek: 0, waistTrendCmPerWeek: -0.3, strengthEnabled: true } satisfies Scenario, 'loss', -0.35],
    ['conflictingSignals', { weightTrendKgPerWeek: 0.25, waistTrendCmPerWeek: -0.25 } satisfies Scenario, 'loss', -0.35],
    ['truePlateau', { weightTrendKgPerWeek: 0 } satisfies Scenario, 'loss', -0.35],
    ['targetTooHigh', { weightTrendKgPerWeek: 0.25 } satisfies Scenario, 'loss', -0.35],
    ['targetTooLow', { weightTrendKgPerWeek: -0.25 } satisfies Scenario, 'gain', 0.35],
    ['excessiveLoss', { weightTrendKgPerWeek: -0.8 } satisfies Scenario, 'loss', -0.35],
    ['excessiveGain', { weightTrendKgPerWeek: 0.8 } satisfies Scenario, 'gain', 0.35],
    ['activityBelowExpected', { actualSteps: 4_000 } satisfies Scenario, 'loss', -0.35],
    ['degradedRecovery', { recovery: 'confirmedConcern' } satisfies Scenario, 'maintenance', 0],
  ] as const)('résout %s selon l’ordre déterministe', (state, scenario, goal, target) => {
    expect(resolve(scenario, goal, target).state).toBe(state);
  });

  it.each([
    ['legacyUnknown', 'unknown'],
    ['profileInitialization', 'fallback'],
  ] as const)('exclut les poids %s des pesées confirmées', (provenance, confidence) => {
    const result = resolve({
      weightProvenance: provenance,
      weightConfidence: confidence,
    });

    expect(result.state).toBe('insufficientData');
    expect(result.blockingFactors.some((factor) => factor.includes('6 pesées confirmées')))
      .toBe(true);
  });

  it('ignore les subjectifs legacy préoccupants', () => {
    expect(resolve({ recovery: 'legacyConcern' }).state).toBe('onTrack');
    expect(resolve({ recovery: 'legacyConcern' }).confidence.recovery).toBe(0);
  });

  it('résout la récupération dégradée sans dépendre d’un objectif de perte', () => {
    expect(resolve({ recovery: 'confirmedConcern' }, 'maintenance', 0).state)
      .toBe('degradedRecovery');
  });

  it('refuse une conclusion d’activité depuis une baseline fallback seule', () => {
    expect(resolve({ actualSteps: 4_000, expectedStepsConfidence: 'fallback' }).state)
      .toBe('onTrack');
    expect(resolve({ actualSteps: 4_000, expectedStepsConfidence: 'emerging' }).state)
      .toBe('activityBelowExpected');
  });

  it('ne laisse pas une journée legacy isolée modifier l’état', () => {
    const baseline = observations({ recovery: 'absent' });
    const withLegacyConcern = baseline.map((observation, index) => index === 10
      ? {
          ...observation,
          hunger: {
            value: 'high' as const,
            date: observation.date,
            provenance: 'legacyUnknown' as const,
            confidence: 'unknown' as const,
          },
        }
      : observation);

    expect(resolveCoachState({ observations: withLegacyConcern, goal: 'loss', targetWeeklyWeightChangeKg: -0.35 }))
      .toEqual(resolveCoachState({ observations: baseline, goal: 'loss', targetWeeklyWeightChangeKg: -0.35 }));
  });

  it('est strictement déterministe et ne calcule aucun ajustement calorique', () => {
    const input = {
      observations: observations(),
      goal: 'loss' as const,
      targetWeeklyWeightChangeKg: -0.35,
    };
    const first = resolveCoachState(input);

    expect(resolveCoachState(input)).toEqual(first);
    expect(first).not.toHaveProperty('proposedAdjustmentKcal');
    expect(first).not.toHaveProperty('calculationVersion');
    expect(Object.keys(first)).toEqual([
      'state',
      'confidence',
      'reasons',
      'blockingFactors',
    ]);
  });
});
