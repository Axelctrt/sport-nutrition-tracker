import { afterEach, describe, expect, it, vi } from 'vitest';
import { assembleStrategySignalQuality, type StrategySignalQualityInput } from '@/application/coach/strategySignalQualityService';
import type { SignalQualitySource } from '@/domain/coach/strategySignalQuality';

const { forbiddenIO } = vi.hoisted(() => ({ forbiddenIO: vi.fn(() => { throw new Error('Forbidden I/O'); }) }));
vi.mock('@/infrastructure/repositories/repositories', () => ({
  repositories: new Proxy({}, { get: () => forbiddenIO }),
}));
const date = '2026-06-21';
function source(snapshotId = 'weight'): SignalQualitySource {
  return { scopeKey: 'user-A', snapshotId,
    snapshot: { kind: 'c0', signal: 'weight', value: { value: 70, date, provenance: 'userMeasured', confidence: 'confirmed' } },
    observationPeriod: { start: date, end: date },
    references: [{ collection: 'weights', id: 'weight-1', date, provenance: 'userMeasurement', fields: ['weightKg'] }],
    derivedFrom: [], eventIds: [] };
}
function input(): StrategySignalQualityInput {
  return { scopeKey: 'user-A', referenceDate: date, temporalContext: { scopeKey: 'user-A', value: { strategy: { status: 'unavailable' } } },
    requests: [{ source: source(), intendedUses: ['recordedObservation', 'longitudinalConclusion'] }] };
}
function freezeDeep(value: unknown): void {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
}
afterEach(() => { expect(forbiddenIO).not.toHaveBeenCalled(); vi.restoreAllMocks(); });

describe('pure Signal Quality snapshot assembly', () => {
  it('is deterministic, detached and read-only, with no clock or network', () => {
    const snapshots = input(); const before = structuredClone(snapshots); freezeDeep(snapshots);
    const clock = vi.spyOn(Date, 'now').mockImplementation(forbiddenIO);
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(forbiddenIO);
    const result = assembleStrategySignalQuality(snapshots);
    expect(result).toEqual(assembleStrategySignalQuality(snapshots));
    expect(result.assessments.map(({ usability }) => usability)).toEqual(['usable', 'limited']);
    result.assessments[0]!.source.references[0]!.fields.push('changed-copy');
    expect(snapshots).toEqual(before);
    expect(result.assessments[1]!.source.references[0]!.fields).toEqual(['weightKg']);
    expect(clock).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  });
  it('does not remember sources between calls or fill absent sources from another user', () => {
    assembleStrategySignalQuality(input());
    const other = input(); other.scopeKey = other.temporalContext.scopeKey = 'user-B';
    other.requests[0]!.source.scopeKey = 'user-B';
    other.requests[0]!.source.snapshot = { kind: 'c0', signal: 'weight', value: undefined };
    expect(assembleStrategySignalQuality(other).assessments.every(({ availability }) => availability === 'absent')).toBe(true);
    expect(assembleStrategySignalQuality({ ...other, requests: [] }).assessments).toEqual([]);
  });
  it('rejects cross-user snapshots and Strategy context, even if record IDs coincide', () => {
    const mixed = input(); mixed.requests[0]!.source.scopeKey = 'user-B';
    expect(() => assembleStrategySignalQuality(mixed)).toThrow('different data spaces');
    const context = input(); context.temporalContext.scopeKey = 'guest';
    expect(() => assembleStrategySignalQuality(context)).toThrow('different data spaces');
  });
  it('deduplicates identical requests but preserves contradictory snapshots without a winner', () => {
    const snapshots = input(); snapshots.requests.push(structuredClone(snapshots.requests[0]!));
    expect(assembleStrategySignalQuality(snapshots).assessments).toHaveLength(2);
    const changed = snapshots.requests[1]!.source.snapshot;
    if (changed.kind === 'c0' && changed.value) changed.value.value = 99;
    const result = assembleStrategySignalQuality(snapshots);
    expect(result.assessments).toHaveLength(4);
    expect(new Set(result.assessments.map(({ id }) => id)).size).toBe(4);
    expect(result.assessments.every(({ availability, usability, reasonCodes }) =>
      availability === 'invalid' && usability === 'unusable' && reasonCodes.some((reason) => reason.startsWith('contradictory')))).toBe(true);
  });
  it('detects different snapshots claiming contradictory values for the same source field and period', () => {
    const snapshots = input(); const other = source('other-view');
    if (other.snapshot.kind === 'c0' && other.snapshot.value) other.snapshot.value.value = 99;
    snapshots.requests.push({ source: other, intendedUses: ['recordedObservation'] });
    expect(assembleStrategySignalQuality(snapshots).assessments.every(({ usability, reasonCodes }) =>
      usability === 'unusable' && reasonCodes.includes('contradictorySourceObservation'))).toBe(true);
  });
  it('retains same-source, derivation, factual event and shared-window dependencies without votes', () => {
    const snapshots = input();
    const derived = source('derived'); derived.references = [];
    derived.derivedFrom = source().references;
    derived.snapshot = { kind: 'c0', signal: 'weight', value: { value: 70, date, provenance: 'derived', confidence: 'derived' } };
    snapshots.requests.push({ source: derived, intendedUses: ['recordedObservation'] });
    for (const signal of ['sleepQuality', 'readiness', 'energy'] as const) {
      snapshots.requests.push({ source: { ...source(signal), eventIds: ['explicit-daily-event'],
        references: [{ collection: 'dailyCheckIns', id: 'check-in-1', date, provenance: 'userReported', fields: [signal] }],
        snapshot: { kind: 'c0', signal, value: { value: signal === 'sleepQuality' ? 'poor' : 'low', date, provenance: 'userReported', confidence: 'confirmed' } } },
      intendedUses: ['recordedObservation'] });
    }
    const report = assembleStrategySignalQuality(snapshots);
    expect(report).toMatchObject({ independence: 'notEstablished', evidenceRole: 'sourceLineage', attribution: 'notAssessed' });
    expect(report.assessments[0]!.dependencies).toEqual(expect.arrayContaining([
      { kind: 'sameSource', assessmentId: 'weight:longitudinalConclusion' },
      { kind: 'derivation', assessmentId: 'derived:recordedObservation' },
      { kind: 'commonWindow', assessmentId: 'derived:recordedObservation' },
    ]));
    const sleep = report.assessments.find(({ signal }) => signal === 'sleepQuality')!;
    expect(sleep.dependencies).toContainEqual({ kind: 'sameEvent', assessmentId: 'readiness:recordedObservation' });
    expect(sleep.dependencies).not.toContainEqual({ kind: 'sameEvent', assessmentId: 'weight:recordedObservation' });
    expect(report).not.toHaveProperty('score'); expect(report).not.toHaveProperty('isReliable');
    expect(report).not.toHaveProperty('recommendation');
  });
  it('retains the age and identity of a derived dependency outside the observation window', () => {
    const snapshots = input(); snapshots.requests[0]!.source.derivedFrom = [{ collection: 'weights', id: 'old-bodyweight',
      date: '2020-01-01', provenance: 'userMeasurement', fields: ['weightKg'] }];
    expect(assembleStrategySignalQuality(snapshots).assessments[0]!.source.derivedFrom[0]!.date).toBe('2020-01-01');
  });
  it('does not turn C4 and C1 referring to the same inputs into independent evidence', () => {
    const snapshots = input(); const c4 = source('c4');
    c4.derivedFrom = c4.references; c4.references = [{ collection: 'weeklyReviews', id: 'review', date, provenance: 'c4', fields: ['decision'] }];
    c4.snapshot = { kind: 'c4', value: { referenceDate: date, primaryAction: 'maintainPlan', priority: 'low',
      coachState: 'onTrack', strengthContext: 'progressing', reasons: ['original'], blockingFactors: [],
      nextReview: { type: 'condition', condition: 'moreData' } } };
    snapshots.requests.push({ source: c4, intendedUses: ['sourceContext'] });
    const result = assembleStrategySignalQuality(snapshots);
    expect(result.assessments[2]!.source).toEqual(c4);
    expect(result.assessments[2]!.dependencies).toContainEqual({ kind: 'derivation', assessmentId: 'weight:recordedObservation' });
    expect(result.assessments[2]!.reasonCodes).toContain('existingConclusionNotIndependentEvidence');
  });
});
