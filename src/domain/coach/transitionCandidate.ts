import { z } from 'zod';
import { COACH_STRATEGY_KINDS, type StrategyReadonly } from '@/domain/coach/coachStrategy';
import { isValidLocalDate } from '@/shared/validation/localDate';

// Reject malformed identities instead of silently normalizing their references.
const referenceId = z.string().min(1).refine((value) => value.trim() === value);
const version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const strategy = z.enum(COACH_STRATEGY_KINDS);
const sourceReference = z.strictObject({
  collection: referenceId,
  id: referenceId,
  date: z.string().refine(isValidLocalDate),
  provenance: referenceId,
  fields: z.array(referenceId).min(1),
});

const common = {
  contractVersion: z.literal(1),
  id: referenceId,
  currentStrategy: strategy,
  // Supplied factual references, never inferred from a date or legacy projection.
  currentAcceptanceReference: z.strictObject({ acceptanceId: referenceId, proposalId: referenceId }),
  objectiveContext: z.strictObject({
    contractVersion: z.literal(1), status: z.literal('available'),
    objective: z.enum(['loss', 'maintenance', 'gain']),
    origin: z.literal('userProfile'), profileId: referenceId,
    sourceVersion: referenceId.optional(),
  }),
  ruleReference: z.strictObject({ id: referenceId, version }),
  reasons: z.array(referenceId).min(1),
  unknowns: z.array(referenceId),
  blockingReasons: z.array(referenceId),
  evidenceReferences: z.array(sourceReference),
  signalQualityReferences: z.array(z.strictObject({ assessmentId: referenceId })),
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  validityConditions: z.strictObject({
    status: z.literal('notEvaluated'), requirements: z.array(referenceId).min(1),
  }),
  // A structurally valid description never constitutes permission to apply it.
  applicability: z.literal('notEvaluated'),
};

const transitionCandidateSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...common, kind: z.literal('strategyReview'),
    requiredUserDecision: z.literal('reviewOnly'),
    effectsContract: z.strictObject({ status: z.literal('none') }),
  }),
  z.strictObject({
    ...common, kind: z.literal('strategyTransition'), candidateStrategy: strategy,
    requiredUserDecision: z.literal('explicitAcceptance'),
    effectsContract: z.strictObject({ status: z.literal('notContracted'), reason: referenceId }),
  }),
]);

/** Non-persisted description only; no resolver, score, acceptance or application. */
export type TransitionCandidate = StrategyReadonly<z.infer<typeof transitionCandidateSchema>>;

/**
 * Validates shape and returns detached data. Does not verify referenced records,
 * rule eligibility, current context, expiry or effects; those require future contracts.
 * IDs, revision and fingerprint are supplied, never generated or read here.
 */
export function createTransitionCandidate(input: unknown): TransitionCandidate {
  return transitionCandidateSchema.parse(input);
}
