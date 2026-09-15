import type { CoachSignalEvidence } from '@/domain/coach/coachSignalEvidence';
import type { CoachStateResult } from '@/domain/coach/coachState';
import type { CoachStateObservation } from '@/domain/coach/coachStateObservations';
import type { StrategyReadonly, StrategySafetyContext } from '@/domain/coach/coachStrategy';
import type { ActiveStrategyProjection } from '@/domain/coach/coachStrategyState';
import type { IntegratedCoachDecision } from '@/domain/coach/integratedCoachDecision';
import type { StrategySourceReference } from '@/domain/coach/observedStrategyCoherence';
import type { StrengthExercisePerformance } from '@/domain/coach/strengthPerformance';
import type { LocalDate } from '@/domain/models/common';
import { isValidLocalDate } from '@/shared/validation/localDate';

export type SignalIntendedUse = 'recordedObservation' | 'recordedComparison'
  | 'longitudinalConclusion' | 'historicalPerformance' | 'currentPerformance'
  | 'sourceContext' | 'safetyContext';
export type SignalDomain = 'body' | 'nutrition' | 'activity' | 'recovery'
  | 'performance' | 'coachContext' | 'safety';
export interface SignalObservationPeriod { start: LocalDate; end: LocalDate }
export type StrategyTemporalRelation = 'beforeAcceptance' | 'overlapsAcceptance'
  | 'afterAcceptance' | 'boundaryUncertain' | 'unknown';

/** Existing outputs only. No raw-to-trend engine or applicable Strategy command. */
export type SignalSnapshot =
  | { kind: 'c0'; signal: 'weight' | 'sleepQuality' | 'readiness' | 'hunger' | 'energy';
      value: CoachSignalEvidence<number | string> | undefined }
  | { kind: 'nutrition'; value: Pick<CoachStateObservation, 'date' | 'journalComplete'
      | 'consumedCaloriesKcal' | 'targetCaloriesKcal' | 'proteinTargetMet'> | undefined }
  | { kind: 'activity'; value: Pick<CoachStateObservation, 'date' | 'actualSteps' | 'expectedSteps'> | undefined }
  | { kind: 'c1'; value: CoachStateResult | undefined }
  | { kind: 'c3'; value: StrengthExercisePerformance | undefined }
  | { kind: 'c4'; value: Pick<IntegratedCoachDecision, 'referenceDate' | 'primaryAction' | 'priority'
      | 'coachState' | 'strengthContext' | 'reasons' | 'blockingFactors' | 'nextReview'> | undefined }
  | { kind: 'c8'; value: StrategySafetyContext };

export interface SignalQualitySource {
  /** Opaque account/data-space key, not an email. All inputs must share it. */
  scopeKey: string;
  snapshotId: string;
  snapshot: SignalSnapshot;
  observationPeriod: SignalObservationPeriod | undefined;
  references: StrategySourceReference[];
  derivedFrom: StrategySourceReference[];
  /** Only factual event identities; a common day is not an event identity. */
  eventIds: string[];
}
export type SignalDependency = {
  kind: 'sameSource' | 'derivation' | 'sameEvent' | 'commonWindow';
  assessmentId: string;
};
export interface SignalQualityAssessment {
  id: string;
  signal: string;
  domain: SignalDomain;
  intendedUse: SignalIntendedUse;
  source: SignalQualitySource;
  availability: 'absent' | 'partial' | 'present' | 'invalid';
  usability: 'usable' | 'limited' | 'unusable';
  reasonCodes: string[];
  freshness: 'datedObservation' | 'notContracted';
  comparability: 'notApplicable' | 'available' | 'notComparable' | 'unknown';
  coverage: 'notContracted';
  dependencies: SignalDependency[];
  observationPeriod: SignalObservationPeriod | undefined;
  strategyTemporalContext: StrategyTemporalRelation;
  limitations: string[];
  attribution: 'notAssessed';
}
export interface SignalTemporalContext {
  strategy: ActiveStrategyProjection;
  /** Explicit conversion in the observation calendar, never inferred from legacy/C9. */
  acceptanceBoundary?: { acceptanceId: string; localDate: LocalDate };
}

export function describeSignalStrategyPeriod(
  period: SignalObservationPeriod | undefined, context: StrategyReadonly<SignalTemporalContext>,
): StrategyTemporalRelation {
  const { strategy, acceptanceBoundary: boundary } = context;
  if (!period || !validPeriod(period) || strategy.status !== 'accepted' || !boundary
    || boundary.acceptanceId !== strategy.acceptanceId || !isValidLocalDate(boundary.localDate)
    || !Number.isFinite(Date.parse(strategy.acceptedAt))) return 'unknown';
  if (period.end < boundary.localDate) return 'beforeAcceptance';
  if (period.start > boundary.localDate) return 'afterAcceptance';
  if (period.start < boundary.localDate && period.end > boundary.localDate) return 'overlapsAcceptance';
  return 'boundaryUncertain';
}

function validPeriod(period: SignalObservationPeriod): boolean {
  return isValidLocalDate(period.start) && isValidLocalDate(period.end) && period.start <= period.end;
}
function finiteNonNegative(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}
function domainOf(snapshot: SignalSnapshot): SignalDomain {
  if (snapshot.kind === 'c0') return snapshot.signal === 'weight' ? 'body' : 'recovery';
  if (snapshot.kind === 'c3') return 'performance';
  if (snapshot.kind === 'c8') return 'safety';
  if (snapshot.kind === 'c1' || snapshot.kind === 'c4') return 'coachContext';
  return snapshot.kind;
}

/** Qualifies one requested use. Does not decide if a Strategy is good or applicable. */
export function qualifyStrategySignal(input: StrategyReadonly<{
  source: SignalQualitySource; intendedUse: SignalIntendedUse; referenceDate: LocalDate;
  temporalContext: SignalTemporalContext;
}>): SignalQualityAssessment {
  // structuredClone detaches readonly caller-owned arrays into an owned report.
  const source = structuredClone(input.source) as SignalQualitySource;
  const snapshot = source.snapshot;
  if (snapshot.kind === 'c4' && snapshot.value) {
    // Structural typing also accepts a full C4 decision: keep only its descriptive contract.
    const { referenceDate, primaryAction, priority, coachState, strengthContext, reasons, blockingFactors, nextReview } = snapshot.value;
    snapshot.value = { referenceDate, primaryAction, priority, coachState, strengthContext, reasons, blockingFactors, nextReview };
  }
  const { intendedUse, referenceDate } = input;
  const result: SignalQualityAssessment = {
    id: `${source.snapshotId}:${intendedUse}`, signal: snapshot.kind === 'c0' ? snapshot.signal : snapshot.kind,
    domain: domainOf(snapshot), intendedUse, source, availability: 'present', usability: 'limited',
    reasonCodes: [], freshness: 'notContracted', comparability: 'unknown', coverage: 'notContracted',
    dependencies: [], observationPeriod: structuredClone(source.observationPeriod),
    strategyTemporalContext: describeSignalStrategyPeriod(source.observationPeriod, input.temporalContext),
    limitations: ['noIndependentEvidenceClaim', 'noCausalAttribution', 'coverageNotContracted'],
    attribution: 'notAssessed',
  };
  const invalidate = (reason: string) => {
    result.availability = 'invalid'; result.usability = 'unusable'; result.reasonCodes.push(reason);
  };
  const period = source.observationPeriod;
  const dates: string[] = [...source.references, ...source.derivedFrom].map(({ date }) => date);
  if (snapshot.kind === 'c0' || snapshot.kind === 'nutrition' || snapshot.kind === 'activity') {
    if (snapshot.value) dates.push(snapshot.value.date);
  }
  if (snapshot.kind === 'c3') dates.push(...(snapshot.value?.exposures.map(({ date }) => date) ?? []));
  if (snapshot.kind === 'c4' && snapshot.value) dates.push(snapshot.value.referenceDate);
  if (snapshot.kind === 'c8' && snapshot.value.status === 'available') dates.push(snapshot.value.assessment.referenceDate);
  if (!isValidLocalDate(referenceDate) || (period && (!validPeriod(period) || period.end > referenceDate))
    || dates.some((date) => !isValidLocalDate(date) || date > referenceDate)) invalidate('invalidOrFutureDate');
  // Dependencies may precede the observation window; never erase their actual age.
  const observationDates = snapshot.kind === 'c3' ? snapshot.value?.exposures.map(({ date }) => date) ?? []
    : (snapshot.kind === 'c0' || snapshot.kind === 'nutrition' || snapshot.kind === 'activity') && snapshot.value
      ? [snapshot.value.date] : [];
  if (period && observationDates.some((date) => date < period.start || date > period.end)) invalidate('contradictoryPeriod');
  if (period && snapshot.kind === 'c4' && snapshot.value && period.end > snapshot.value.referenceDate) invalidate('contradictoryPeriod');
  if (result.availability === 'invalid') return result;
  if (snapshot.value === undefined || (snapshot.kind === 'c8' && snapshot.value.status === 'unavailable')) {
    result.availability = 'absent'; result.usability = 'unusable'; result.reasonCodes.push('sourceAbsent');
    return result;
  }
  const allow = (...uses: SignalIntendedUse[]) => {
    if (uses.includes(intendedUse)) return true;
    result.usability = 'unusable'; result.reasonCodes.push('unsupportedUse'); return false;
  };
  if (snapshot.kind === 'c0' && snapshot.value) {
    const evidence = snapshot.value;
    const validValue = snapshot.signal === 'weight'
      ? typeof evidence.value === 'number' && finiteNonNegative(evidence.value) && evidence.value > 0
      : typeof evidence.value === 'string' && (snapshot.signal === 'sleepQuality'
        ? ['poor', 'average', 'good'] : ['low', 'normal', 'high']).includes(evidence.value);
    if (!validValue) { invalidate('invalidValue'); return result; }
    if (!allow('recordedObservation', 'longitudinalConclusion')) return result;
    result.freshness = 'datedObservation'; result.comparability = 'notApplicable';
    const confirmed = evidence.confidence === 'confirmed'
      && evidence.provenance === (snapshot.signal === 'weight' ? 'userMeasured' : 'userReported');
    result.usability = confirmed && intendedUse === 'recordedObservation' ? 'usable' : 'limited';
    if (!confirmed) result.reasonCodes.push('notIndependentConfirmedObservation');
    if (intendedUse === 'longitudinalConclusion') result.reasonCodes.push('singleObservationNotLongitudinal');
  } else if (snapshot.kind === 'nutrition' && snapshot.value) {
    const day = snapshot.value;
    if ([day.consumedCaloriesKcal, day.targetCaloriesKcal].some((n) => n !== undefined && !finiteNonNegative(n))) {
      invalidate('invalidValue'); return result;
    }
    if (!allow('recordedObservation', 'recordedComparison', 'longitudinalConclusion')) return result;
    result.freshness = 'datedObservation';
    if (!day.journalComplete || day.consumedCaloriesKcal === undefined) {
      result.availability = 'partial'; result.reasonCodes.push('incompleteFoodObservation');
    } else if (intendedUse === 'recordedObservation') result.usability = 'usable';
    const comparable = day.journalComplete && day.consumedCaloriesKcal !== undefined && (day.targetCaloriesKcal ?? 0) > 0;
    result.comparability = comparable ? 'available' : 'notComparable';
    if (intendedUse === 'recordedComparison' && comparable) result.usability = 'usable';
    if (!comparable) result.reasonCodes.push('foodComparisonUnavailable');
    if (intendedUse === 'longitudinalConclusion') result.reasonCodes.push('longitudinalContractOwnedByC1');
  } else if (snapshot.kind === 'activity' && snapshot.value) {
    const day = snapshot.value;
    if (!finiteNonNegative(day.expectedSteps.value)
      || (day.actualSteps && !finiteNonNegative(day.actualSteps.value))) { invalidate('invalidValue'); return result; }
    if (!allow('recordedObservation', 'recordedComparison', 'longitudinalConclusion')) return result;
    result.freshness = 'datedObservation';
    result.comparability = day.actualSteps && day.expectedSteps.value > 0 ? 'available' : 'notComparable';
    if (!day.actualSteps) { result.availability = 'partial'; result.reasonCodes.push('actualStepsAbsent'); }
    else if (intendedUse === 'recordedObservation') result.usability = 'usable';
    // A fallback expected value is context, not a confirmed independent comparator.
    if (intendedUse === 'recordedComparison') result.reasonCodes.push('expectedStepsQualificationRetained');
    if (intendedUse === 'longitudinalConclusion') result.reasonCodes.push('longitudinalContractOwnedByC1');
  } else if (snapshot.kind === 'c3' && snapshot.value) {
    const performance = snapshot.value;
    if (performance.exposureCount !== performance.exposures.length
      || !Number.isInteger(performance.comparableExposureCount) || performance.comparableExposureCount < 0
      || performance.comparableExposureCount > performance.exposureCount
      || performance.exposures.some((entry, index) => index > 0 && entry.date < performance.exposures[index - 1]!.date)) {
      invalidate('contradictoryC3Snapshot'); return result;
    }
    if (!allow('historicalPerformance', 'currentPerformance')) return result;
    const latest = performance.exposures.at(-1);
    result.comparability = latest?.relationToPrevious === 'notComparable' ? 'notComparable'
      : latest ? 'available' : 'unknown';
    if (performance.trend === 'insufficientData' || !latest) {
      result.availability = 'partial'; result.reasonCodes.push('c3InsufficientData');
    } else if (intendedUse === 'historicalPerformance' && result.comparability === 'available') result.usability = 'usable';
    if (result.comparability === 'notComparable') result.reasonCodes.push('c3ComparisonBreak');
    if (intendedUse === 'currentPerformance') result.reasonCodes.push('currentPerformanceFreshnessNotContracted');
    result.limitations.push('historicalTrendOnly', 'bodyWeightDependencyAgeNotContracted');
  } else if (snapshot.kind === 'c1' || snapshot.kind === 'c4') {
    if (!allow('sourceContext')) return result;
    result.usability = period ? 'usable' : 'limited';
    result.reasonCodes.push('existingConclusionNotIndependentEvidence');
    if (!period) result.reasonCodes.push('sourcePeriodUnknown');
    result.limitations.push('sourceLineageNotRetainedContributors', 'globalConfidenceNotDomainQualification');
  } else if (snapshot.kind === 'c8') {
    if (!allow('safetyContext')) return result;
    result.usability = 'usable';
    result.reasonCodes.push('preserveC8ScopeAndVeto');
    result.limitations.push('clearNotGlobalCertification', 'qualificationCannotRelaxSafety');
  }
  return result;
}
