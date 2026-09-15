import { describe, expect, it } from 'vitest';
import { resolveCoachSafety } from '@/domain/coach/coachSafety';
import type { CoachReviewAnalysis } from '@/domain/coach/coachReview';
import { resolveIntegratedCoachDecision } from '@/domain/coach/integratedCoachDecision';
import {
  OBSERVED_STRATEGY_RULES, resolveObservedStrategyCoherence,
  type ObservedStrategyCoherenceInput, type StrategyObservationEvidence,
} from '@/domain/coach/observedStrategyCoherence';
import { createCalorieAdaptationAssessment } from '@/test/factories/weeklyReviewFactory';

const date = '2026-06-14';
function fixture(): ObservedStrategyCoherenceInput {
  const assessment = createCalorieAdaptationAssessment({ detectedState: 'onTrack', proposedAdjustmentKcal: 0 });
  const analysis: CoachReviewAnalysis = {
    calorieAssessment: assessment,
    coachStateResult: { state: 'onTrack', confidence: assessment.confidence, reasons: ['C1'], blockingFactors: [],
      priority: 'low', recommendedAction: { type: 'maintainPlan' }, nextReview: { type: 'date', date: '2026-06-21' } },
    strengthPerformance: { referenceDate: date, exercises: [], schedule: {
      completedPlannedCount: 0, skippedCount: 0, overdueCount: 0, abandonedCount: 0,
    } },
    safetyAssessment: resolveCoachSafety({ referenceDate: date, contextFlags: [] }),
    decision: undefined!,
  };
  analysis.decision = resolveIntegratedCoachDecision({ referenceDate: date, ...analysis });
  const evidence: StrategyObservationEvidence[] = (['bodyTrend', 'nutrition'] as const).map((domain) => ({
    domain, origin: 'c1c4', freshness: 'canonicalWindow', interpretation: 'qualifiedObservation',
    sourceReferences: [{ collection: domain, id: `${domain}-row`, date, provenance: 'confirmed', fields: ['value'] }],
    dependentSourceReferences: [], reasons: [],
  }));
  return { referenceDate: date, strategyRevision: 2,
    strategy: { status: 'accepted', strategy: 'stabilization', objective: 'maintenance', origin: 'userAcceptance',
      proposalId: 'proposal', acceptanceId: 'acceptance', acceptedAt: '2026-06-14T18:00:00.000Z' },
    currentObjective: 'maintenance', analysis, evidence,
    safety: { status: 'available', origin: 'integratedC8', scope: 'c8CalorieDecreaseOnly', assessment: analysis.safetyAssessment },
  };
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}

describe('observed Strategy coherence — pure bounded contract', () => {
  it.each(['activeDeficit', 'stabilization', 'activeConstruction'] as const)('versions %s, not a global success assessment', (strategy) => {
    const input = fixture();
    const rule = OBSERVED_STRATEGY_RULES[strategy];
    input.strategy = { ...input.strategy as Extract<typeof input.strategy, { status: 'accepted' }>, strategy, objective: rule.objective };
    input.currentObjective = rule.objective;
    const result = resolveObservedStrategyCoherence(input);
    expect(result.status).toBe('compatible');
    expect(result.rule).toEqual({ id: rule.id, version: 1 });
    expect(result.evaluatedDomains).toEqual(['bodyTrend', 'nutrition']);
    expect(result.nonEvaluableDomains.map(({ domain }) => domain)).toEqual(['activity', 'recovery', 'performance', 'acuteContext', 'eligibility']);
    expect(result.scope).toBe('coveredObservationsOnly');
    expect(result.attribution).toBe('notAssessed');
    expect(result.sourcePeriod).toEqual({ start: '2026-05-25', end: date });
    expect(result.c4Decision).not.toHaveProperty('proposedNutritionAdjustmentKcal');
    expect(result).not.toHaveProperty('confidence');
    expect(result).not.toHaveProperty('effects');
  });

  it('does not equate legacy continuity, unavailable state or missing objective with acceptance', () => {
    for (const strategy of [{ status: 'unavailable' }, { status: 'legacy', objective: 'maintenance', strategy: 'stabilization', origin: 'migration' }] as const) {
      const result = resolveObservedStrategyCoherence({ ...fixture(), strategy });
      expect(result.status).toBe('insufficientData');
      expect(result.rule).toBeUndefined();
    }
    const missingObjective = fixture();
    delete missingObjective.currentObjective;
    expect(resolveObservedStrategyCoherence(missingObjective).status).toBe('insufficientData');
  });

  it('blocks incompatible objectives and structurally invalid state without reconciling it', () => {
    expect(resolveObservedStrategyCoherence({ ...fixture(), currentObjective: 'gain' })).toMatchObject({
      status: 'blocked', contradictions: ['currentObjectiveDiffersFromAcceptedStrategy'],
    });
    expect(resolveObservedStrategyCoherence({ ...fixture(), strategy: { status: 'invalid' } }).status).toBe('blocked');
    const input = fixture();
    if (input.strategy.status === 'accepted') input.strategy = { ...input.strategy, objective: 'loss' };
    expect(resolveObservedStrategyCoherence(input).status).toBe('blocked');
  });

  it('onTrack, maintainPlan and Safety clear do not replace evidence', () => {
    for (const evidence of [[], fixture().evidence.filter(({ domain }) => domain === 'bodyTrend')]) {
      const result = resolveObservedStrategyCoherence({ ...fixture(), evidence });
      expect(result.status).toBe('insufficientData');
      expect(result.safety).toMatchObject({ assessment: { status: 'clear' } });
    }
    const missingAnalysis = fixture();
    delete missingAnalysis.analysis;
    expect(resolveObservedStrategyCoherence(missingAnalysis).status).toBe('insufficientData');
  });

  it('blocks future evidence and stale evidence masquerading as canonical', () => {
    for (const [sourceDate, reason] of [['2026-06-15', 'futureOrInvalidEvidence'], ['2025-01-01', 'evidenceOutsideCanonicalWindow']]) {
      const input = fixture();
      input.evidence = [{ ...input.evidence[0]!, sourceReferences: [{ ...input.evidence[0]!.sourceReferences[0]!, date: sourceDate! }] }];
      expect(resolveObservedStrategyCoherence(input)).toMatchObject({ status: 'blocked', contradictions: [reason] });
    }
    expect(resolveObservedStrategyCoherence({ ...fixture(), referenceDate: 'invalid' }).status).toBe('blocked');
  });

  it('rejects inconsistent analysis periods and does not upgrade stale Safety', () => {
    const input = fixture();
    input.analysis = { ...input.analysis!, calorieAssessment: { ...input.analysis!.calorieAssessment, analysisEnd: '2026-06-13' } };
    expect(resolveObservedStrategyCoherence(input).status).toBe('blocked');
    const stale = fixture();
    stale.safety = { status: 'available', origin: 'integratedC8', scope: 'c8CalorieDecreaseOnly',
      assessment: resolveCoachSafety({ referenceDate: '2025-01-01', contextFlags: [] }) };
    expect(resolveObservedStrategyCoherence(stale)).toMatchObject({ status: 'insufficientData', unknowns: expect.arrayContaining(['safetyIsNotCurrent']) });
  });

  it('does not attribute a pre-acceptance window to Strategy, even with historical progressing C3', () => {
    const input = fixture();
    input.evidence = [...input.evidence, { domain: 'performance', origin: 'c3', freshness: 'notContracted', interpretation: 'contextOnly',
      sourceReferences: [{ collection: 'strengthSets', id: 'old', date: '2020-01-01', provenance: 'completedSet', fields: ['bestSet'] }],
      dependentSourceReferences: [], reasons: ['trend:progressing'] }];
    const result = resolveObservedStrategyCoherence(input);
    expect(result.attribution).toBe('notAssessed');
    expect(result.evaluatedDomains).not.toContain('performance');
    expect(result.unknowns).toContain('performance:currentPerformanceFreshnessNotContracted');
    expect(result.evidence.at(-1)?.sourceReferences[0]?.date).toBe('2020-01-01');
  });

  it.each([['excessiveLoss', 'caution'], ['degradedRecovery', 'caution']] as const)('retains %s as one C8 domain, not independent votes', (state, safetyStatus) => {
    const input = fixture();
    const safety = resolveCoachSafety({ referenceDate: date, contextFlags: [], coachState: state });
    input.safety = { status: 'available', origin: 'integratedC8', scope: 'c8CalorieDecreaseOnly', assessment: safety };
    const domain = safety.concerns[0]!.domain;
    input.evidence = [...input.evidence, ...Array.from({ length: 4 }, () => ({ ...input.evidence[0]!, domain, origin: 'c8' as const }))];
    const result = resolveObservedStrategyCoherence(input);
    expect(result.status).toBe('reviewRecommended');
    expect(result.reviewDomains).toEqual([domain]);
    expect(result.safety).toMatchObject({ scope: 'c8CalorieDecreaseOnly', assessment: { status: safetyStatus } });
  });

  it('retains acute veto with insufficient longitudinal data, without blocking or selecting another Strategy', () => {
    const input = fixture();
    delete input.analysis;
    input.evidence = [];
    input.safety = { status: 'available', origin: 'immediateC8', scope: 'c8CalorieDecreaseOnly',
      assessment: resolveCoachSafety({ referenceDate: date, contextFlags: ['painOrInjury'] }) };
    const result = resolveObservedStrategyCoherence(input);
    expect(result).toMatchObject({ status: 'reviewRecommended', reviewDomains: ['acuteContext'], strategy: input.strategy,
      safety: { origin: 'immediateC8', assessment: { status: 'doNotIntensify' } } });
  });

  it('is deterministic on frozen input, returns detached data and never produces applicable effects', () => {
    const input = deepFreeze(fixture());
    const before = JSON.stringify(input);
    const a = resolveObservedStrategyCoherence(input);
    const b = resolveObservedStrategyCoherence(input);
    expect(a).toEqual(b);
    a.evidence[0]!.sourceReferences[0]!.fields.push('consumer-change');
    expect(JSON.stringify(input)).toBe(before);
    expect(b.evidence[0]!.sourceReferences[0]!.fields).toEqual(['value']);
    for (const forbidden of ['proposal', 'phase', 'memory', 'plan', 'calories', 'macros', 'transition', 'activeState']) {
      expect(a).not.toHaveProperty(forbidden);
    }
  });
});
