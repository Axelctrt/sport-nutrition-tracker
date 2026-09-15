import type { StrategyReadonly } from '@/domain/coach/coachStrategy';
import type { StrategySourceReference } from '@/domain/coach/observedStrategyCoherence';
import {
  qualifyStrategySignal, type SignalIntendedUse, type SignalQualityAssessment,
  type SignalQualitySource, type SignalTemporalContext,
} from '@/domain/coach/strategySignalQuality';
import type { LocalDate } from '@/domain/models/common';
import { isValidLocalDate } from '@/shared/validation/localDate';

export interface StrategySignalQualityInput {
  scopeKey: string;
  referenceDate: LocalDate;
  temporalContext: { scopeKey: string; value: SignalTemporalContext };
  requests: { source: SignalQualitySource; intendedUses: SignalIntendedUse[] }[];
}
export interface StrategySignalQualityReport {
  referenceDate: LocalDate;
  assessments: SignalQualityAssessment[];
  scope: 'suppliedSnapshotsOnly';
  evidenceRole: 'sourceLineage';
  attribution: 'notAssessed';
  independence: 'notEstablished';
}

/** Stable structural equality, not an identity hash or a timestamp winner. */
function fingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${fingerprint(entry)}`).join(',')}}`;
  }
  return typeof value === 'string' ? JSON.stringify(value) : `${typeof value}:${String(value)}`;
}
function sharesSource(a: StrategySourceReference[], b: StrategySourceReference[]): boolean {
  return a.some((left) => b.some((right) => left.collection === right.collection && left.id === right.id));
}
function contradictsSameObservation(a: StrategyReadonly<SignalQualitySource>, b: StrategyReadonly<SignalQualitySource>): boolean {
  if (a.snapshot.kind !== b.snapshot.kind || fingerprint(a.observationPeriod) !== fingerprint(b.observationPeriod)) return false;
  if (a.snapshot.kind === 'c0' && b.snapshot.kind === 'c0' && a.snapshot.signal !== b.snapshot.signal) return false;
  return a.references.some((left) => b.references.some((right) => left.collection === right.collection && left.id === right.id
    && left.fields.some((field) => right.fields.includes(field))))
    && fingerprint(a.snapshot) !== fingerprint(b.snapshot);
}

/** Caller supplies already isolated snapshots. No loading, normalization or hidden engine invocation. */
export function assembleStrategySignalQuality(
  input: StrategyReadonly<StrategySignalQualityInput>,
): StrategySignalQualityReport {
  if (!input.scopeKey || input.temporalContext.scopeKey !== input.scopeKey
    || input.requests.some(({ source }) => source.scopeKey !== input.scopeKey)) {
    throw new Error('Signal Quality: snapshots from different data spaces.');
  }
  if (!isValidLocalDate(input.referenceDate)) throw new Error('Signal Quality: invalid reference date.');
  if (input.requests.some(({ source }) => !source.snapshotId)) throw new Error('Signal Quality: missing snapshot identity.');
  const identities = new Map<string, Set<string>>();
  for (const { source } of input.requests) {
    const contents = identities.get(source.snapshotId) ?? new Set<string>();
    contents.add(fingerprint(source)); identities.set(source.snapshotId, contents);
  }
  const assessments: SignalQualityAssessment[] = [];
  const seen = new Set<string>();
  for (const { source, intendedUses } of input.requests) {
    const contradictoryObservation = input.requests.some((other) => contradictsSameObservation(source, other.source));
    for (const intendedUse of intendedUses) {
      const result = qualifyStrategySignal({ source, intendedUse, referenceDate: input.referenceDate,
        temporalContext: input.temporalContext.value });
      const key = fingerprint([source, intendedUse]);
      if (seen.has(key)) continue;
      seen.add(key);
      if ((identities.get(source.snapshotId)?.size ?? 0) > 1 || contradictoryObservation) {
        result.availability = 'invalid'; result.usability = 'unusable';
        result.reasonCodes.push(contradictoryObservation ? 'contradictorySourceObservation' : 'contradictorySnapshotIdentity');
        // Keep every contradictory variant, without choosing one by input order or clock.
        result.id = `${result.id}:conflict-${assessments.length}`;
      }
      assessments.push(result);
    }
  }
  for (const assessment of assessments) {
    for (const other of assessments) {
      if (assessment === other) continue;
      const a = assessment.source; const b = other.source;
      const link = (kind: SignalQualityAssessment['dependencies'][number]['kind']) => {
        assessment.dependencies.push({ kind, assessmentId: other.id });
      };
      if (a.snapshotId === b.snapshotId || sharesSource(a.references, b.references)) link('sameSource');
      if (sharesSource(a.derivedFrom, b.references) || sharesSource(b.derivedFrom, a.references)
        || sharesSource(a.derivedFrom, b.derivedFrom)) link('derivation');
      if (a.eventIds.some((id) => b.eventIds.includes(id))) link('sameEvent');
      const ap = a.observationPeriod; const bp = b.observationPeriod;
      if (ap && bp && [ap.start, ap.end, bp.start, bp.end].every(isValidLocalDate)
        && ap.start <= ap.end && bp.start <= bp.end && ap.start <= bp.end && bp.start <= ap.end) link('commonWindow');
    }
  }
  return { referenceDate: input.referenceDate, assessments, scope: 'suppliedSnapshotsOnly',
    evidenceRole: 'sourceLineage', attribution: 'notAssessed', independence: 'notEstablished' };
}
