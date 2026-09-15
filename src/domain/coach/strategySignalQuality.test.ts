import { describe, expect, it } from 'vitest';
import type { CoachSignalEvidence } from '@/domain/coach/coachSignalEvidence';
import type { CoachStateResult } from '@/domain/coach/coachState';
import type { StrengthExercisePerformance } from '@/domain/coach/strengthPerformance';
import {
  describeSignalStrategyPeriod, qualifyStrategySignal, type SignalIntendedUse,
  type SignalQualitySource, type SignalSnapshot, type SignalTemporalContext,
} from '@/domain/coach/strategySignalQuality';

const date = '2026-06-21';
const temporalContext: SignalTemporalContext = { strategy: { status: 'unavailable' } };
function source(snapshot: SignalSnapshot): SignalQualitySource {
  return { scopeKey: 'local-A', snapshotId: 'snapshot', snapshot,
    observationPeriod: { start: '2020-01-01', end: date }, references: [], derivedFrom: [], eventIds: [] };
}
function qualify(snapshot: SignalSnapshot, intendedUse: SignalIntendedUse = 'recordedObservation') {
  return qualifyStrategySignal({ source: source(snapshot), intendedUse, referenceDate: date, temporalContext });
}
const weight = (overrides: Partial<CoachSignalEvidence<number>> = {}): SignalSnapshot => ({
  kind: 'c0', signal: 'weight', value: { value: 70, date, provenance: 'userMeasured', confidence: 'confirmed', ...overrides },
});
function performance(overrides: Partial<StrengthExercisePerformance> = {}): StrengthExercisePerformance {
  return { exerciseDefinitionId: 'squat', exerciseName: 'Squat', trackingMode: 'loadRepetitions',
    exposureCount: 2, comparableExposureCount: 2, trend: 'progressing', reasons: ['C3 source reason'],
    exposures: ['2020-01-01', '2020-01-02'].map((day, i) => ({ sessionId: `s${i}`,
      sessionExerciseId: `e${i}`, date: day, occurredAt: `${day}T12:00:00Z`, trackingMode: 'loadRepetitions',
      completedPlannedWorkingSetCount: 1, completedTrainingSetCount: 1,
      bestSet: { setId: `set${i}`, setNumber: 1, repetitions: 10 + i, weightKg: 50 },
      bodyWeightTrendConfirmed: false, progressionEligible: true,
      relationToPrevious: i ? 'improved' : 'notComparable' })), ...overrides };
}

describe('Signal Quality: one signal and one precise use', () => {
  it('allows a confirmed weight record, never infers a trend from that record', () => {
    expect(qualify(weight())).toMatchObject({ usability: 'usable', availability: 'present',
      freshness: 'datedObservation', coverage: 'notContracted', attribution: 'notAssessed' });
    expect(qualify(weight(), 'longitudinalConclusion')).toMatchObject({ usability: 'limited',
      reasonCodes: ['singleObservationNotLongitudinal'] });
  });
  it.each([
    ['derived', 'derived'], ['profileFallback', 'fallback'], ['profileInitialization', 'fallback'],
    ['legacyUnknown', 'unknown'], ['derived', 'confirmed'],
  ] as const)('keeps %s/%s as context, never a confirmed independent measurement', (provenance, confidence) => {
    const input = weight({ provenance, confidence });
    const result = qualify(input);
    expect(result.usability).toBe('limited');
    expect(result.source.snapshot).toEqual(input);
    expect(result.reasonCodes).toContain('notIndependentConfirmedObservation');
  });
  it('keeps a punctual subjective statement, without a recovery diagnosis', () => {
    const snapshot: SignalSnapshot = { kind: 'c0', signal: 'readiness',
      value: { value: 'low', date, confidence: 'confirmed', provenance: 'userReported' } };
    expect(qualify(snapshot)).toMatchObject({ domain: 'recovery', usability: 'usable' });
    expect(qualify(snapshot, 'longitudinalConclusion').usability).toBe('limited');
    expect(qualify(snapshot, 'safetyContext').usability).toBe('unusable');
  });
  it('distinguishes absent, invalid and contradictory dates without substituting data', () => {
    expect(qualify({ kind: 'c0', signal: 'weight', value: undefined })).toMatchObject({
      availability: 'absent', usability: 'unusable' });
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0]) {
      expect(qualify(weight({ value })).availability).toBe('invalid');
    }
    for (const day of ['2026-02-30', '2027-01-01']) {
      expect(qualify(weight({ date: day })).availability).toBe('invalid');
    }
    const row = source(weight()); row.observationPeriod = { start: '2026-06-01', end: '2026-06-20' };
    expect(qualifyStrategySignal({ source: row, intendedUse: 'recordedObservation', referenceDate: date, temporalContext }))
      .toMatchObject({ availability: 'invalid', reasonCodes: ['contradictoryPeriod'] });
  });
  it('does not copy C1 minima or interpret global confidence as per-domain confidence', () => {
    const state: CoachStateResult = { state: 'onTrack', confidence: { weight: 100, food: 100,
      activity: 100, recovery: 0, overall: 90, level: 'reliable' }, reasons: ['C1'], blockingFactors: [],
      priority: 'low', recommendedAction: { type: 'maintainPlan' }, nextReview: { type: 'condition', condition: 'moreData' } };
    const result = qualify({ kind: 'c1', value: state }, 'sourceContext');
    expect(result.source.snapshot).toEqual({ kind: 'c1', value: state });
    expect(result).toMatchObject({ domain: 'coachContext', usability: 'usable', coverage: 'notContracted' });
    expect(result.limitations).toContain('globalConfidenceNotDomainQualification');
    expect(qualify({ kind: 'c1', value: state }, 'longitudinalConclusion').usability).toBe('unusable');
    expect(qualify({ kind: 'c1', value: { ...state, state: 'insufficientData' } }, 'sourceContext').source.snapshot)
      .toEqual({ kind: 'c1', value: { ...state, state: 'insufficientData' } });
  });
});

describe('food and activity comparisons without recalculation', () => {
  const complete: SignalSnapshot = { kind: 'nutrition', value: { date, journalComplete: true,
    consumedCaloriesKcal: 2000, targetCaloriesKcal: 2100, proteinTargetMet: true } };
  it('qualifies a complete day and its recorded comparison, not a longitudinal claim', () => {
    expect(qualify(complete).usability).toBe('usable');
    expect(qualify(complete, 'recordedComparison')).toMatchObject({ usability: 'usable', comparability: 'available' });
    expect(qualify(complete, 'longitudinalConclusion').usability).toBe('limited');
    expect(qualify(complete).source.snapshot).toEqual(complete);
  });
  it('requires a complete journal, consumption and positive target for comparison', () => {
    for (const value of [undefined, { date, journalComplete: false }, { date, journalComplete: true },
      { date, journalComplete: true, consumedCaloriesKcal: 2000 },
      { date, journalComplete: true, consumedCaloriesKcal: 2000, targetCaloriesKcal: 0 }]) {
      expect(qualify({ kind: 'nutrition', value }, 'recordedComparison').usability).not.toBe('usable');
    }
    expect(qualify({ kind: 'nutrition', value: { date, journalComplete: false } }).availability).toBe('partial');
    expect(qualify({ kind: 'nutrition', value: { date, journalComplete: true,
      consumedCaloriesKcal: Number.NaN } }).availability).toBe('invalid');
  });
  it('preserves activity expectation provenance, without certifying fallback or adherence', () => {
    const snapshot: SignalSnapshot = { kind: 'activity', value: { date, actualSteps: { value: 7000, source: 'manual' },
      expectedSteps: { value: 8000, source: 'profileFallback', confidence: 'fallback' } } };
    expect(qualify(snapshot).usability).toBe('usable');
    expect(qualify(snapshot, 'recordedComparison').usability).toBe('limited');
    expect(qualify(snapshot, 'longitudinalConclusion').usability).toBe('limited');
    expect(qualify(snapshot).source.snapshot).toEqual(snapshot);
    expect(qualify({ kind: 'activity', value: { date,
      expectedSteps: { value: 8000, source: 'recentHistory', confidence: 'established' } } }).availability).toBe('partial');
  });
});

describe('existing C3/C4/C8 conclusions remain owned by their source', () => {
  it('can describe old C3 progression but cannot certify current freshness or coverage', () => {
    const value = performance();
    const history = qualify({ kind: 'c3', value }, 'historicalPerformance');
    expect(history).toMatchObject({ usability: 'usable', freshness: 'notContracted', coverage: 'notContracted' });
    expect(history.source.snapshot).toEqual({ kind: 'c3', value });
    expect(qualify({ kind: 'c3', value }, 'currentPerformance').usability).toBe('limited');
  });
  it('preserves comparison breaks and insufficient data', () => {
    const value = performance(); value.exposures[1]!.relationToPrevious = 'notComparable';
    expect(qualify({ kind: 'c3', value }, 'historicalPerformance'))
      .toMatchObject({ usability: 'limited', comparability: 'notComparable' });
    expect(qualify({ kind: 'c3', value: performance({ trend: 'insufficientData', exposures: [], exposureCount: 0,
      comparableExposureCount: 0 }) }, 'historicalPerformance')).toMatchObject({ availability: 'partial', usability: 'limited' });
    expect(qualify({ kind: 'c3', value: performance({ exposureCount: 99 }) }, 'historicalPerformance').availability).toBe('invalid');
  });
  it('retains C4 decision, reasons, source period and references without an actionable candidate', () => {
    const snapshot: SignalSnapshot = { kind: 'c4', value: { referenceDate: date, primaryAction: 'prioritizeRecovery',
      priority: 'high', coachState: 'degradedRecovery', strengthContext: 'stable', reasons: ['C4 exact'],
      blockingFactors: ['C4 blocker'], nextReview: { type: 'condition', condition: 'recoveryReassessed' } } };
    const result = qualify(snapshot, 'sourceContext');
    expect(result.source.snapshot).toEqual(snapshot);
    expect(result.observationPeriod).toEqual(source(snapshot).observationPeriod);
    expect(result.reasonCodes).toContain('existingConclusionNotIndependentEvidence');
    expect(qualify(snapshot, 'longitudinalConclusion').usability).toBe('unusable');
    const fullDecision = { ...snapshot.value!, proposedNutritionAdjustmentKcal: -100, requiresUserAcceptance: true };
    const description = qualify({ kind: 'c4', value: fullDecision }, 'sourceContext').source.snapshot;
    expect(description).not.toHaveProperty('value.proposedNutritionAdjustmentKcal');
    expect(description).not.toHaveProperty('value.requiresUserAcceptance');
  });
  it.each(['clear', 'caution', 'doNotIntensify'] as const)('never rewrites C8 %s or relaxes a veto', (status) => {
    const snapshot: SignalSnapshot = { kind: 'c8', value: { status: 'available', origin: 'immediateC8',
      scope: 'c8CalorieDecreaseOnly', assessment: { referenceDate: date, status, reasons: ['original'],
        blockingFactors: ['unchanged'], concerns: status === 'clear' ? []
          : [{ domain: 'acuteContext', immediateVeto: true, reasons: ['pain'] }] } } };
    const result = qualify(snapshot, 'safetyContext');
    expect(result.source.snapshot).toEqual(snapshot);
    expect(result.limitations).toEqual(expect.arrayContaining(['clearNotGlobalCertification', 'qualificationCannotRelaxSafety']));
    const invalid = qualifyStrategySignal({ source: source(snapshot), intendedUse: 'safetyContext',
      referenceDate: '2020-01-01', temporalContext });
    expect(invalid.usability).toBe('unusable');
    expect(invalid.source.snapshot).toEqual(snapshot); // Even invalid annotation cannot erase Safety.
  });
});

describe('descriptive Strategy temporal boundary', () => {
  const accepted: SignalTemporalContext = { strategy: { status: 'accepted', objective: 'maintenance',
    strategy: 'stabilization', origin: 'userAcceptance', proposalId: 'proposal', acceptanceId: 'acceptance',
    acceptedAt: '2026-06-10T12:00:00.000Z' }, acceptanceBoundary: { acceptanceId: 'acceptance', localDate: '2026-06-10' } };
  it.each([
    ['2026-06-01', '2026-06-09', 'beforeAcceptance'], ['2026-06-11', '2026-06-21', 'afterAcceptance'],
    ['2026-06-01', '2026-06-21', 'overlapsAcceptance'], ['2026-06-10', '2026-06-10', 'boundaryUncertain'],
    ['2026-06-10', '2026-06-21', 'boundaryUncertain'],
  ] as const)('%s to %s is %s, not causal attribution', (start, end, expected) => {
    expect(describeSignalStrategyPeriod({ start, end }, accepted)).toBe(expected);
  });
  it('does not infer calendar, missing dates, rejected proposals or legacy bounds', () => {
    const period = { start: date, end: date };
    expect(describeSignalStrategyPeriod(undefined, accepted)).toBe('unknown');
    expect(describeSignalStrategyPeriod(period, { strategy: accepted.strategy })).toBe('unknown');
    expect(describeSignalStrategyPeriod(period, { ...accepted, acceptanceBoundary: { acceptanceId: 'other', localDate: date } })).toBe('unknown');
    expect(describeSignalStrategyPeriod(period, { ...accepted, strategy: { status: 'legacy', objective: 'loss',
      strategy: 'activeDeficit', origin: 'migration' } })).toBe('unknown');
    expect(describeSignalStrategyPeriod({ start: 'invalid', end: date }, accepted)).toBe('unknown');
  });
});
