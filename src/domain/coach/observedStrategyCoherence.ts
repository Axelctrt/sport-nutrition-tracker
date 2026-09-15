import type { CoachReviewAnalysis } from '@/domain/coach/coachReview';
import type { CoachStrategyKind, StrategyReadonly, StrategySafetyContext } from '@/domain/coach/coachStrategy';
import type { ActiveStrategyProjection } from '@/domain/coach/coachStrategyState';
import type { IntegratedCoachDecision } from '@/domain/coach/integratedCoachDecision';
import type { LocalDate } from '@/domain/models/common';
import type { WeightGoal } from '@/domain/models/profile';
import { isValidLocalDate } from '@/shared/validation/localDate';

export const OBSERVED_STRATEGY_RULES = {
  activeDeficit: { id: 'strategy-active-deficit-observed-coherence', version: 1, objective: 'loss' },
  stabilization: { id: 'strategy-stabilization-observed-coherence', version: 1, objective: 'maintenance' },
  activeConstruction: { id: 'strategy-active-construction-observed-coherence', version: 1, objective: 'gain' },
} as const satisfies Record<CoachStrategyKind, { id: string; version: 1; objective: WeightGoal }>;

export const STRATEGY_OBSERVATION_DOMAINS = [
  'bodyTrend', 'nutrition', 'activity', 'recovery', 'performance', 'acuteContext', 'eligibility',
] as const;
export type StrategyObservationDomain = (typeof STRATEGY_OBSERVATION_DOMAINS)[number];
export type StrategyCoherenceStatus = 'compatible' | 'reviewRecommended' | 'insufficientData' | 'blocked';

/** One source may occur in several domains: its identity and dependencies remain the same. */
export interface StrategySourceReference {
  collection: string;
  id: string;
  date: LocalDate;
  provenance: string;
  fields: string[];
}

export interface StrategyObservationEvidence {
  domain: StrategyObservationDomain;
  origin: 'c1c4' | 'c3' | 'c8';
  sourceReferences: StrategySourceReference[];
  dependentSourceReferences: StrategySourceReference[];
  interpretation: 'qualifiedObservation' | 'existingConcern' | 'contextOnly';
  freshness: 'canonicalWindow' | 'referenceDate' | 'notContracted';
  reasons: string[];
}

export interface ObservedStrategyCoherenceInput {
  referenceDate: LocalDate;
  strategy: ActiveStrategyProjection | { status: 'invalid' };
  strategyRevision?: number;
  currentObjective?: WeightGoal;
  analysis?: StrategyReadonly<CoachReviewAnalysis>;
  safety: StrategyReadonly<StrategySafetyContext>;
  evidence: StrategyReadonly<StrategyObservationEvidence[]>;
}

/** This is a description of the source decision, deliberately without its applicable candidate. */
type SourceDecision = StrategyReadonly<Pick<IntegratedCoachDecision,
  'referenceDate' | 'primaryAction' | 'priority' | 'coachState' | 'strengthContext'
  | 'reasons' | 'blockingFactors' | 'nextReview'>>;

export interface ObservedStrategyCoherence {
  status: StrategyCoherenceStatus;
  strategy: ObservedStrategyCoherenceInput['strategy'];
  strategyRevision: number | undefined;
  currentObjective: WeightGoal | undefined;
  rule: { id: string; version: 1 } | undefined;
  referenceDate: LocalDate;
  sourcePeriod: { start: LocalDate; end: LocalDate } | undefined;
  scope: 'coveredObservationsOnly';
  attribution: 'notAssessed';
  evidenceRole: 'sourceLineage';
  evaluatedDomains: StrategyObservationDomain[];
  nonEvaluableDomains: { domain: StrategyObservationDomain; reason: string }[];
  reasons: string[];
  evidence: StrategyObservationEvidence[];
  unknowns: string[];
  contradictions: string[];
  reviewDomains: StrategyObservationDomain[];
  c4Decision: SourceDecision | undefined;
  safety: StrategySafetyContext;
}

function unique<T>(values: readonly T[]): T[] { return [...new Set(values)]; }

/** No votes, no new thresholds, no I/O. A missing contract bounds the assertion. */
export function resolveObservedStrategyCoherence(
  input: StrategyReadonly<ObservedStrategyCoherenceInput>,
): ObservedStrategyCoherence {
  const analysis = input.analysis;
  const assessment = analysis?.calorieAssessment;
  const decision = analysis?.decision;
  const strategy = structuredClone(input.strategy) as ObservedStrategyCoherenceInput['strategy'];
  const rule = strategy.status === 'accepted' ? OBSERVED_STRATEGY_RULES[strategy.strategy] : undefined;
  const result: ObservedStrategyCoherence = {
    status: 'insufficientData', strategy, strategyRevision: input.strategyRevision,
    currentObjective: input.currentObjective,
    rule: rule ? { id: rule.id, version: rule.version } : undefined,
    referenceDate: input.referenceDate,
    sourcePeriod: assessment ? { start: assessment.analysisStart, end: assessment.analysisEnd } : undefined,
    scope: 'coveredObservationsOnly', attribution: 'notAssessed', evidenceRole: 'sourceLineage', evaluatedDomains: [],
    nonEvaluableDomains: [], reasons: [], evidence: structuredClone(input.evidence) as StrategyObservationEvidence[],
    unknowns: [], contradictions: [], reviewDomains: [],
    c4Decision: decision ? structuredClone({
      referenceDate: decision.referenceDate, primaryAction: decision.primaryAction,
      priority: decision.priority, coachState: decision.coachState, strengthContext: decision.strengthContext,
      reasons: decision.reasons, blockingFactors: decision.blockingFactors, nextReview: decision.nextReview,
    }) : undefined,
    safety: structuredClone(input.safety) as StrategySafetyContext,
  };
  const evaluated = new Set<StrategyObservationDomain>();
  const review = new Set<StrategyObservationDomain>();
  const finish = () => {
    result.evaluatedDomains = STRATEGY_OBSERVATION_DOMAINS.filter((domain) => evaluated.has(domain));
    result.reviewDomains = STRATEGY_OBSERVATION_DOMAINS.filter((domain) => review.has(domain));
    result.nonEvaluableDomains = STRATEGY_OBSERVATION_DOMAINS.filter((domain) => !evaluated.has(domain))
      .map((domain) => ({ domain, reason: domain === 'performance'
        ? 'currentPerformanceFreshnessNotContracted' : 'noQualifiedConclusionForDomain' }));
    result.unknowns = unique([...result.unknowns, ...result.nonEvaluableDomains.map(({ domain, reason }) => `${domain}:${reason}`)]);
    result.reasons = unique(result.reasons);
    return result;
  };
  const block = (reason: string) => {
    result.status = 'blocked'; result.contradictions.push(reason); return finish();
  };

  if (!isValidLocalDate(input.referenceDate)) return block('invalidReferenceDate');
  if (strategy.status === 'invalid') return block('invalidStrategyState');
  if (strategy.status === 'accepted' && (!rule || rule.objective !== strategy.objective)) {
    return block('invalidAcceptedStrategy');
  }
  if (strategy.status === 'accepted' && input.currentObjective && input.currentObjective !== strategy.objective) {
    return block('currentObjectiveDiffersFromAcceptedStrategy');
  }
  if (assessment && (!isValidLocalDate(assessment.analysisStart) || !isValidLocalDate(assessment.analysisEnd)
    || assessment.analysisStart > assessment.analysisEnd || assessment.analysisEnd !== input.referenceDate
    || decision?.referenceDate !== input.referenceDate || decision.coachState !== analysis?.coachStateResult.state
    || analysis?.strengthPerformance.referenceDate !== input.referenceDate)) {
    return block('inconsistentAnalysisPeriodOrState');
  }
  if (result.evidence.some((item) => [...item.sourceReferences, ...item.dependentSourceReferences]
    .some(({ date }) => !isValidLocalDate(date) || date > input.referenceDate))) {
    return block('futureOrInvalidEvidence');
  }
  if (assessment && result.evidence.some((item) => item.freshness === 'canonicalWindow'
    && item.sourceReferences.some(({ date }) => date < assessment.analysisStart || date > assessment.analysisEnd))) {
    return block('evidenceOutsideCanonicalWindow');
  }
  if (input.safety.status === 'available' && input.safety.assessment.referenceDate !== input.referenceDate) {
    result.unknowns.push('safetyIsNotCurrent');
  }
  const qualified = (domain: StrategyObservationDomain) => result.evidence.some((item) => (
    item.domain === domain && item.interpretation === 'qualifiedObservation'
    && item.freshness === 'canonicalWindow' && item.sourceReferences.length > 0
  ));

  // Safety is retained even without accepted Strategy or adequate longitudinal data.
  // A concern is not a new Strategy veto; performance concerns retain C3's freshness limit.
  if (input.safety.status === 'available' && input.safety.assessment.referenceDate === input.referenceDate) {
    for (const concern of input.safety.assessment.concerns) {
      review.add(concern.domain);
      result.reasons.push(...concern.reasons);
      if (concern.domain !== 'performance') evaluated.add(concern.domain);
    }
  } else if (input.safety.status === 'unavailable') result.unknowns.push('safetyUnavailable');

  if (strategy.status !== 'accepted' || !input.currentObjective) {
    result.unknowns.push(strategy.status === 'legacy' ? 'legacyIsNotAcceptance' : 'acceptedStrategyOrObjectiveUnavailable');
    return finish();
  }
  if (!analysis || !assessment || !decision) {
    result.unknowns.push('integratedAnalysisUnavailable');
    if (review.size > 0) result.status = 'reviewRecommended';
    return finish();
  }

  const state = analysis.coachStateResult;
  const interpretable = (state.confidence.level === 'usable' || state.confidence.level === 'reliable')
    && state.blockingFactors.length === 0 && assessment.blockingFactors.length === 0;
  if (!interpretable) {
    result.unknowns.push('longitudinalInterpretationInsufficient');
    result.reasons.push(...state.blockingFactors, ...assessment.blockingFactors);
  }
  if (state.state !== assessment.detectedState) result.contradictions.push('sourceStatesDiffer');
  if (state.state === 'conflictingSignals') result.contradictions.push('existingConflictingBodySignals');
  if (decision.strengthContext === 'mixed') result.contradictions.push('existingMixedStrengthSignals');

  if (interpretable) {
    if (qualified('bodyTrend')) evaluated.add('bodyTrend');
    if (qualified('nutrition')) evaluated.add('nutrition');
    const action = decision.primaryAction;
    if (action === 'reviewActivity' && qualified('activity')) {
      evaluated.add('activity'); review.add('activity');
    }
    if (action === 'prioritizeRecovery' && state.state === 'degradedRecovery' && qualified('recovery')) {
      evaluated.add('recovery'); review.add('recovery');
    }
    if (action === 'reviewNutritionTarget' && qualified('bodyTrend') && qualified('nutrition')) {
      review.add('bodyTrend'); review.add('nutrition');
    }
    // Restate an existing targeted review, never pronounce current performance effective.
    if ((action === 'reviewTraining' || action === 'monitorTrend')
      && (decision.strengthContext === 'degrading' || decision.strengthContext === 'mixed')
      && result.evidence.some((item) => item.origin === 'c3' && item.sourceReferences.length > 0)) {
      review.add('performance');
    }
    if (review.size > 0) result.reasons.push(...decision.reasons);
  }
  if (review.size > 0) result.status = 'reviewRecommended';
  else if (interpretable && evaluated.has('bodyTrend') && evaluated.has('nutrition')
    && state.state === 'onTrack' && assessment.detectedState === 'onTrack'
    && decision.primaryAction === 'maintainPlan'
    && result.contradictions.length === 0 && !result.unknowns.includes('safetyIsNotCurrent')) {
    result.status = 'compatible';
    result.reasons.push('Les observations corporelles qualifiées, avec un suivi alimentaire interprétable, ne montrent pas d’incohérence avec la stratégie acceptée.');
  } else result.unknowns.push('noQualifiedCoherenceConclusion');
  result.reasons.push('Cette lecture porte sur les observations couvertes, sans évaluer l’efficacité causale de la stratégie ni les domaines non évaluables.');
  return finish();
}
