import { describe, expect, it } from 'vitest';
import {
  projectDailyCoach,
  type DailyCoachResult,
} from '@/domain/coach/dailyCoach';
import type {
  CoachPriority,
  CoachState,
  CoachStateResult,
} from '@/domain/coach/coachState';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';

const confidence = {
  weight: 80,
  food: 80,
  activity: 80,
  recovery: 80,
  overall: 80,
  level: 'reliable' as const,
};

function result(state: CoachState, priority: CoachPriority = 'low'): CoachStateResult {
  return {
    state,
    confidence,
    reasons: [],
    blockingFactors: [],
    priority,
    recommendedAction: { type: 'maintainPlan' },
    nextReview: { type: 'condition', condition: 'moreData' },
  };
}

function observation(
  signal: 'readiness' | 'sleepQuality' | 'hunger' | 'energy',
  value: string,
  confirmed = true,
): CoachStateObservation {
  return {
    date: '2026-08-25',
    journalComplete: false,
    expectedSteps: { value: 10_000, source: 'profileFallback', confidence: 'fallback' },
    hasTemporaryContext: false,
    strengthSessionCount: 0,
    [signal]: {
      value,
      date: '2026-08-25',
      provenance: confirmed ? 'userReported' : 'legacyUnknown',
      confidence: confirmed ? 'confirmed' : 'unknown',
    },
  } as CoachStateObservation;
}

describe('projectDailyCoach', () => {
  it.each([
    ['onTrack', 'planMaintained', 'Plan maintenu'],
    ['possibleRecomposition', 'planMaintained', 'Plan maintenu'],
    ['temporaryWaterVariation', 'temporaryVariation', 'Variation temporaire probable'],
    ['insufficientData', 'insufficientData', 'Données encore insuffisantes'],
    ['insufficientFoodTracking', 'insufficientData', 'Suivi à compléter'],
    ['degradedRecovery', 'attentionRequired', 'Récupération à prioriser'],
    ['activityBelowExpected', 'attentionRequired', 'Activité à revoir'],
    ['excessiveLoss', 'attentionRequired', 'Rythme à réévaluer'],
    ['excessiveGain', 'attentionRequired', 'Rythme à réévaluer'],
  ] satisfies Array<[CoachState, DailyCoachResult['verdict'], string]>) (
    'projette %s vers %s',
    (state, verdict, title) => {
      expect(projectDailyCoach({ coachStateResult: result(state) })).toMatchObject({
        verdict,
        title,
        coachState: state,
      });
    },
  );

  it.each([
    ['readiness', 'low'],
    ['sleepQuality', 'poor'],
    ['hunger', 'high'],
    ['energy', 'low'],
  ] as const)('surveille un signal quotidien confirmé %s=%s', (signal, value) => {
    const coachStateResult = result('onTrack');
    const projected = projectDailyCoach({
      coachStateResult,
      todayObservation: observation(signal, value),
    });

    expect(projected).toMatchObject({
      verdict: 'recoveryToWatch',
      priority: 'low',
      coachState: 'onTrack',
    });
    expect(coachStateResult.state).toBe('onTrack');
  });

  it.each([
    ['readiness', 'low'],
    ['sleepQuality', 'poor'],
    ['hunger', 'high'],
    ['energy', 'low'],
  ] as const)('ignore la même valeur legacyUnknown pour %s', (signal, value) => {
    expect(projectDailyCoach({
      coachStateResult: result('onTrack'),
      todayObservation: observation(signal, value, false),
    }).verdict).toBe('planMaintained');
  });

  it.each([
    ['readiness', 'normal'],
    ['sleepQuality', 'average'],
    ['hunger', 'normal'],
    ['energy', 'normal'],
  ] as const)('ne sur-réagit pas au signal confirmé normal %s', (signal, value) => {
    expect(projectDailyCoach({
      coachStateResult: result('onTrack'),
      todayObservation: observation(signal, value),
    }).verdict).toBe('planMaintained');
  });

  it('ne masque pas un état high par une préoccupation quotidienne', () => {
    expect(projectDailyCoach({
      coachStateResult: result('excessiveLoss', 'high'),
      todayObservation: observation('readiness', 'low'),
    })).toMatchObject({
      verdict: 'attentionRequired',
      coachState: 'excessiveLoss',
      priority: 'high',
    });
  });

  it('préserve les conclusions longitudinales récupération et variation temporaire', () => {
    const todayObservation = observation('sleepQuality', 'poor');
    expect(projectDailyCoach({
      coachStateResult: result('degradedRecovery', 'high'),
      todayObservation,
    }).title).toBe('Récupération à prioriser');
    expect(projectDailyCoach({
      coachStateResult: result('temporaryWaterVariation'),
      todayObservation,
    }).verdict).toBe('temporaryVariation');
  });

  it('projette une entrée identique de manière strictement déterministe', () => {
    const input = {
      coachStateResult: result('conflictingSignals', 'medium'),
      todayObservation: observation('readiness', 'low'),
    };
    expect(projectDailyCoach(input)).toStrictEqual(projectDailyCoach(input));
  });
});
