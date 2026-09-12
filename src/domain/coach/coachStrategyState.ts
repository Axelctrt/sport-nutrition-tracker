import type { CoachStrategyKind, StrategyReadonly } from '@/domain/coach/coachStrategy';
import { projectLegacyCoachStrategy } from '@/domain/coach/coachStrategyCompatibility';
import type { CoachSafetyStatus } from '@/domain/coach/coachSafety';
import type { IntegratedCoachAction } from '@/domain/coach/integratedCoachDecision';
import type { WeightGoal } from '@/domain/models/profile';

export const COACH_STRATEGY_STATE_ID = 'coach-strategy-state' as const;

/** Evidence of the supplied proposal, not a new strategy recommendation engine. */
export interface StrategyProposal {
  id: string;
  version: 1;
  objective: WeightGoal;
  strategy: CoachStrategyKind;
  status: 'pending' | 'accepted' | 'rejected';
  reasons: string[];
  context: {
    origin: 'c4c5';
    referenceDate: string;
    referenceWeightKg: number;
    sourceFingerprint: string;
    primaryAction: IntegratedCoachAction;
    safetyStatus: CoachSafetyStatus;
  };
}

export interface StrategyAcceptance {
  /** Caller-owned idempotency key for this one explicit user action. */
  id: string;
  proposalId: string;
  proposalVersion: 1;
  response: 'accepted' | 'rejected';
  decidedAt: string;
}

export interface CoachStrategyState {
  id: typeof COACH_STRATEGY_STATE_ID;
  schemaVersion: 1;
  /** Local CAS revision only. No multi-device or timestamp arbitration. */
  revision: number;
  legacy?: {
    objective: WeightGoal;
    strategy: CoachStrategyKind;
    origin: 'migration' | 'legacyCompatibility';
  } | undefined;
  proposals: StrategyProposal[];
  acceptances: StrategyAcceptance[];
  /** Active facts are obtained through the accepted proposal, not duplicated. */
  activeAcceptanceId?: string | undefined;
}

export type ActiveStrategyProjection = StrategyReadonly<
  | { status: 'unavailable' }
  | { status: 'legacy'; objective: WeightGoal; strategy: CoachStrategyKind;
      origin: 'migration' | 'legacyCompatibility' }
  | { status: 'accepted'; objective: WeightGoal; strategy: CoachStrategyKind;
      origin: 'userAcceptance'; proposalId: string; acceptanceId: string; acceptedAt: string }
>;

export function emptyCoachStrategyState(): CoachStrategyState {
  return { id: COACH_STRATEGY_STATE_ID, schemaVersion: 1, revision: 0,
    proposals: [], acceptances: [] };
}

export function createLegacyCoachStrategyState(
  goal: unknown,
  origin: 'migration' | 'legacyCompatibility',
): CoachStrategyState | undefined {
  if (goal !== 'loss' && goal !== 'maintenance' && goal !== 'gain') return undefined;
  const projection = projectLegacyCoachStrategy({ id: 'legacy', goal });
  if (projection.strategy.status !== 'legacyProjected') return undefined;
  return { ...emptyCoachStrategyState(), legacy: {
    objective: goal, strategy: projection.strategy.strategy, origin,
  } };
}

export function assertStrategyMatchesObjective(objective: WeightGoal, strategy: CoachStrategyKind): void {
  if (createLegacyCoachStrategyState(objective, 'legacyCompatibility')?.legacy?.strategy !== strategy) {
    throw new Error('La stratégie ne correspond pas à l’objectif existant.');
  }
}

export function appendStrategyProposal(
  state: CoachStrategyState, proposal: StrategyProposal,
): CoachStrategyState {
  assertStrategyMatchesObjective(proposal.objective, proposal.strategy);
  if (state.activeAcceptanceId) throw new Error('Les transitions de stratégie sont hors périmètre.');
  if (state.proposals.some(({ id }) => id === proposal.id)) throw new Error('Proposition déjà enregistrée.');
  if (proposal.status !== 'pending') throw new Error('Une nouvelle proposition doit rester en attente.');
  return { ...structuredClone(state), revision: state.revision + 1,
    proposals: [...structuredClone(state.proposals), structuredClone(proposal)] };
}

/** Exact retries preserve the original factual date and do not advance revision. */
export function findStrategyResponseRetry(
  state: CoachStrategyState, action: Omit<StrategyAcceptance, 'decidedAt'>,
): StrategyAcceptance | undefined {
  const existing = state.acceptances.find(({ id }) => id === action.id);
  if (existing && (existing.proposalId !== action.proposalId
    || existing.proposalVersion !== action.proposalVersion || existing.response !== action.response)) {
    throw new Error('Clé d’idempotence déjà utilisée pour une autre réponse.');
  }
  return existing;
}

export function respondToStrategyProposal(
  state: CoachStrategyState, acceptance: StrategyAcceptance,
): CoachStrategyState {
  if (findStrategyResponseRetry(state, acceptance)) return structuredClone(state);
  const proposal = state.proposals.find(({ id }) => id === acceptance.proposalId);
  if (!proposal || proposal.version !== acceptance.proposalVersion || proposal.status !== 'pending') {
    throw new Error('La proposition n’est plus en attente dans cette version.');
  }
  if (acceptance.response === 'accepted' && state.activeAcceptanceId) {
    throw new Error('Les transitions de stratégie sont hors périmètre.');
  }
  return {
    ...structuredClone(state), revision: state.revision + 1,
    proposals: state.proposals.map((value) => ({ ...structuredClone(value),
      status: value.id === proposal.id ? acceptance.response : value.status })),
    acceptances: [...structuredClone(state.acceptances), structuredClone(acceptance)],
    ...(acceptance.response === 'accepted' ? { activeAcceptanceId: acceptance.id } : {}),
  };
}

/** No profile/C7/C9 fallback, no clock, no IDs, no phase episode creation. */
export function projectActiveStrategy(state?: CoachStrategyState): ActiveStrategyProjection {
  if (!state) return { status: 'unavailable' };
  if (state.activeAcceptanceId) {
    const acceptance = state.acceptances.find(({ id }) => id === state.activeAcceptanceId);
    const proposal = state.proposals.find(({ id }) => id === acceptance?.proposalId);
    if (!acceptance || acceptance.response !== 'accepted' || proposal?.status !== 'accepted') {
      throw new Error('État Strategy incohérent.');
    }
    return { status: 'accepted', objective: proposal.objective, strategy: proposal.strategy,
      origin: 'userAcceptance', proposalId: proposal.id, acceptanceId: acceptance.id,
      acceptedAt: acceptance.decidedAt };
  }
  return state.legacy ? { status: 'legacy', ...state.legacy } : { status: 'unavailable' };
}
