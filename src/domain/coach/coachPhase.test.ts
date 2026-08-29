import { describe, expect, it } from 'vitest';
import { resolveCoachPhase } from '@/domain/coach/coachPhase';
import type { WeightGoal } from '@/domain/models/profile';

describe('resolveCoachPhase', () => {
  it.each([
    ['loss', 'deficit', 'Déficit actif'],
    ['maintenance', 'stabilization', 'Stabilisation'],
    ['gain', 'construction', 'Construction'],
  ] as const)('mappe %s vers la phase %s', (objective, id, label) => {
    expect(resolveCoachPhase(objective)).toMatchObject({
      id,
      label,
      objective,
    });
  });

  it('ne crée aucune phase quand l’objectif est absent', () => {
    expect(resolveCoachPhase(undefined)).toBeUndefined();
  });

  it('ne crée aucune phase pour un objectif hors contrat', () => {
    expect(resolveCoachPhase('recomposition' as WeightGoal)).toBeUndefined();
  });
});
