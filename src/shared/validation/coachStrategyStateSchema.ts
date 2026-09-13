import { z } from 'zod';
import { COACH_STRATEGY_KINDS } from '@/domain/coach/coachStrategy';
import { COACH_SAFETY_STATUSES } from '@/domain/coach/coachSafety';
import { INTEGRATED_COACH_ACTIONS } from '@/domain/coach/integratedCoachDecision';
import { assertStrategyMatchesObjective, COACH_STRATEGY_STATE_ID } from '@/domain/coach/coachStrategyState';
import { isValidLocalDate } from '@/shared/validation/localDate';

const identifier = z.string().trim().min(1);
const objective = z.enum(['loss', 'maintenance', 'gain']);
const strategy = z.enum(COACH_STRATEGY_KINDS);

export const coachStrategyStateSchema = z.object({
  id: z.literal(COACH_STRATEGY_STATE_ID),
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  legacy: z.object({ objective, strategy,
    origin: z.enum(['migration', 'legacyCompatibility']) }).strict().optional(),
  proposals: z.array(z.object({
    id: identifier, version: z.literal(1), objective, strategy,
    status: z.enum(['pending', 'accepted', 'rejected']),
    reasons: z.array(z.string().min(1)),
    context: z.object({
      origin: z.literal('c4c5'), referenceDate: z.string().refine(isValidLocalDate),
      referenceWeightKg: z.number().finite().positive(),
      sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      primaryAction: z.enum(INTEGRATED_COACH_ACTIONS), safetyStatus: z.enum(COACH_SAFETY_STATUSES),
    }).strict(),
  }).strict()),
  acceptances: z.array(z.object({
    id: identifier, proposalId: identifier, proposalVersion: z.literal(1),
    response: z.enum(['accepted', 'rejected']), decidedAt: z.iso.datetime({ offset: true }),
  }).strict()),
  activeAcceptanceId: identifier.optional(),
}).strict().superRefine((state, ctx) => {
  const invalid = () => ctx.addIssue({ code: 'custom', message: 'État Strategy incohérent.' });
  if (new Set(state.proposals.map(({ id }) => id)).size !== state.proposals.length
    || new Set(state.acceptances.map(({ id }) => id)).size !== state.acceptances.length
    || new Set(state.acceptances.map(({ proposalId }) => proposalId)).size !== state.acceptances.length
    || state.revision !== state.proposals.length + state.acceptances.length) invalid();
  try {
    if (state.legacy) assertStrategyMatchesObjective(state.legacy.objective, state.legacy.strategy);
    for (const proposal of state.proposals) {
      assertStrategyMatchesObjective(proposal.objective, proposal.strategy);
      const response = state.acceptances.find(({ proposalId }) => proposalId === proposal.id);
      if (proposal.status !== (response?.response ?? 'pending')) invalid();
    }
  } catch { invalid(); }
  for (const acceptance of state.acceptances) {
    if (!state.proposals.some(({ id, version }) => id === acceptance.proposalId
      && version === acceptance.proposalVersion)) invalid();
  }
  const accepted = state.acceptances.filter(({ response }) => response === 'accepted');
  if (accepted.length > 1 || state.activeAcceptanceId !== accepted[0]?.id) invalid();
});
