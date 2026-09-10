import { describe, expect, it } from 'vitest';
import { resolveCoachPhase } from '@/domain/coach/coachPhase';
import { projectLegacyCoachStrategy } from '@/domain/coach/coachStrategyCompatibility';
import type { WeightGoal } from '@/domain/models/profile';

describe('projectLegacyCoachStrategy', () => {
  it.each([
    ['loss', 'activeDeficit'],
    ['maintenance', 'stabilization'],
    ['gain', 'activeConstruction'],
  ] as const)('projette %s sans proposition, acceptation ou épisode', (goal, strategy) => {
    const profile = Object.freeze({ id: 'profile-a', goal });
    const result = projectLegacyCoachStrategy(profile);
    expect(result).toStrictEqual({
      objective: { contractVersion: 1, status: 'available', objective: goal,
        origin: 'userProfile', profileId: 'profile-a' },
      strategy: { contractVersion: 1, status: 'legacyProjected', strategy,
        origin: 'c7ObjectiveProjection' },
      phase: { contractVersion: 1, status: 'unavailable', origin: 'noExplicitEpisode' },
      legacyPhase: resolveCoachPhase(goal),
    });
    expect(result.objective).not.toHaveProperty('sourceVersion');
    expect(result.strategy).not.toHaveProperty('acceptanceRef');
    expect(result.phase).not.toHaveProperty('phaseId');
    expect(result.phase).not.toHaveProperty('temporal');
    expect(profile).toEqual({ id: 'profile-a', goal });
  });

  it('préserve un objectif absent sans valeur de confort', () => {
    expect(projectLegacyCoachStrategy(undefined)).toStrictEqual({
      objective: { contractVersion: 1, status: 'unavailable', origin: 'missing' },
      strategy: { contractVersion: 1, status: 'unavailable', origin: 'missingObjective' },
      phase: { contractVersion: 1, status: 'unavailable', origin: 'noExplicitEpisode' },
      legacyPhase: undefined,
    });
  });

  it.each(['recomposition', 'competition', 'miniCut', 'toString', '__proto__', undefined])(
    'ne transforme pas une valeur externe invalide %s en objectif ou stratégie', (goal) => {
      const result = projectLegacyCoachStrategy({ id: 'profile', goal: goal as WeightGoal });
      expect(result.objective).toMatchObject({ status: 'unavailable', origin: 'invalid' });
      expect(result.strategy.status).toBe('unavailable');
      expect(result.phase.status).toBe('unavailable');
      expect(result.legacyPhase).toBeUndefined();
    },
  );

  it('ne convertit pas updatedAt en version et ne garde aucun état entre profils', () => {
    const first = projectLegacyCoachStrategy({ id: 'a', goal: 'loss',
      updatedAt: '2099-01-01T00:00:00Z' } as { id: string; goal: WeightGoal });
    const second = projectLegacyCoachStrategy({ id: 'b', goal: 'gain' });
    expect(first.objective).not.toHaveProperty('sourceVersion');
    expect(second.objective).toMatchObject({ profileId: 'b', objective: 'gain' });
    expect(first.legacyPhase).not.toBe(projectLegacyCoachStrategy({ id: 'a', goal: 'loss' }).legacyPhase);
  });
});
