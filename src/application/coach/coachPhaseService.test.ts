import { describe, expect, it } from 'vitest';
import { resolveCurrentCoachPhase } from '@/application/coach/coachPhaseService';

describe('resolveCurrentCoachPhase', () => {
  it('résout la phase depuis le seul objectif sans muter la source', () => {
    const profile = Object.freeze({ goal: 'gain' as const });

    expect(resolveCurrentCoachPhase(profile)).toEqual({
      id: 'construction',
      label: 'Construction',
      description: 'L’objectif actuel place le plan dans une période de prise de poids.',
      objective: 'gain',
    });
    expect(profile).toEqual({ goal: 'gain' });
  });

  it('reste sans phase quand les données ne fournissent aucun objectif', () => {
    expect(resolveCurrentCoachPhase(undefined)).toBeUndefined();
  });
});
