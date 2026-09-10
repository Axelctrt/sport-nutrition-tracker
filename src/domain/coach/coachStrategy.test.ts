import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  COACH_STRATEGY_CONTRACT_VERSION,
  COACH_STRATEGY_KINDS,
  type CoachStrategyKind,
  type ObjectiveContext,
  type PhaseContext,
  type StrategyContext,
  type StrategyDecisionSnapshot,
} from '@/domain/coach/coachStrategy';
import type { WeightGoal } from '@/domain/models/profile';

describe('Coach Strategy contracts', () => {
  it('limite les approches aux trois stratégies sans étendre les objectifs', () => {
    expect(COACH_STRATEGY_CONTRACT_VERSION).toBe(1);
    expect(COACH_STRATEGY_KINDS).toEqual(['activeDeficit', 'stabilization', 'activeConstruction']);
    expectTypeOf<WeightGoal>().toEqualTypeOf<'loss' | 'maintenance' | 'gain'>();
    expectTypeOf<CoachStrategyKind>().not.toEqualTypeOf<WeightGoal>();
    expectTypeOf<ObjectiveContext>().not.toEqualTypeOf<StrategyContext>();
    expectTypeOf<StrategyContext>().not.toEqualTypeOf<PhaseContext>();
  });

  it('distingue une proposition explicite du consentement et de la phase active', () => {
    const proposal = {
      contractVersion: 1, status: 'proposed', strategy: 'stabilization',
      strategyRef: 'strategy-proposal', proposalRef: 'proposal-1', origin: 'explicit',
    } as const satisfies StrategyContext;
    expect(proposal).not.toHaveProperty('acceptanceRef');
    expect(proposal).not.toHaveProperty('phaseId');
    // @ts-expect-error A proposal is not an accepted temporal episode.
    const phase: PhaseContext = proposal;
    expect(phase).toBe(proposal);
    expectTypeOf<Extract<StrategyContext, { status: 'active' }>['acceptanceRef']>()
      .toEqualTypeOf<string>();
  });

  it('exige une identité parent distincte et conserve les dates inconnues', () => {
    const phase = {
      contractVersion: 1, status: 'available', origin: 'explicit', state: 'active',
      phaseId: 'episode-1', parentStrategyRef: 'strategy-1', acceptanceRef: 'consent-1',
      temporal: {},
    } as const satisfies PhaseContext;
    expect(phase.phaseId).not.toBe(phase.parentStrategyRef);
    expect(phase.temporal).not.toHaveProperty('startedOn');
    expectTypeOf<StrategyDecisionSnapshot['memories']>().toEqualTypeOf<
      Readonly<StrategyDecisionSnapshot['memories']>
    >();
  });
});
