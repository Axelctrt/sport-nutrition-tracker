import type { WeightGoal } from '@/domain/models/profile';

export const COACH_PHASE_IDS = [
  'deficit',
  'stabilization',
  'construction',
] as const;

export type CoachPhaseId = (typeof COACH_PHASE_IDS)[number];

export interface CoachPhase {
  id: CoachPhaseId;
  label: string;
  description: string;
  objective: WeightGoal;
}

const PHASE_BY_OBJECTIVE: Record<WeightGoal, CoachPhase> = {
  loss: {
    id: 'deficit',
    label: 'Déficit actif',
    description: 'L’objectif actuel place le plan dans une période de perte de poids.',
    objective: 'loss',
  },
  maintenance: {
    id: 'stabilization',
    label: 'Stabilisation',
    description: 'L’objectif actuel place le plan dans une période de maintien.',
    objective: 'maintenance',
  },
  gain: {
    id: 'construction',
    label: 'Construction',
    description: 'L’objectif actuel place le plan dans une période de prise de poids.',
    objective: 'gain',
  },
};

export function resolveCoachPhase(
  objective: WeightGoal | undefined,
): CoachPhase | undefined {
  if (!objective) return undefined;
  const phase = PHASE_BY_OBJECTIVE[objective];
  return phase ? { ...phase } : undefined;
}
