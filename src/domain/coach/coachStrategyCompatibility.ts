import { resolveCoachPhase } from '@/domain/coach/coachPhase';
import {
  COACH_STRATEGY_CONTRACT_VERSION,
  type CoachStrategyKind,
  type CoachStrategyLegacyContext,
} from '@/domain/coach/coachStrategy';
import type { UserProfile, WeightGoal } from '@/domain/models/profile';

const LEGACY_STRATEGY: Record<WeightGoal, CoachStrategyKind> = {
  loss: 'activeDeficit',
  maintenance: 'stabilization',
  gain: 'activeConstruction',
};

/** Preserves C7 provenance without manufacturing a proposal, consent or episode. */
export function projectLegacyCoachStrategy(
  profile: Readonly<Pick<UserProfile, 'id' | 'goal'>> | undefined,
): CoachStrategyLegacyContext {
  const contractVersion = COACH_STRATEGY_CONTRACT_VERSION;
  const goal = profile?.goal;
  const known = goal === 'loss' || goal === 'maintenance' || goal === 'gain';
  return {
    objective: profile && known
      ? { contractVersion, status: 'available', objective: goal,
          origin: 'userProfile', profileId: profile.id }
      : { contractVersion, status: 'unavailable', origin: profile ? 'invalid' : 'missing' },
    strategy: known
      ? { contractVersion, status: 'legacyProjected', strategy: LEGACY_STRATEGY[goal],
          origin: 'c7ObjectiveProjection' }
      : { contractVersion, status: 'unavailable', origin: 'missingObjective' },
    phase: { contractVersion, status: 'unavailable', origin: 'noExplicitEpisode' },
    legacyPhase: known ? resolveCoachPhase(goal) : undefined,
  };
}
