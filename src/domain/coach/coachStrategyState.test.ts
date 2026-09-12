import { describe, expect, it } from 'vitest';
import {
  appendStrategyProposal, createLegacyCoachStrategyState, emptyCoachStrategyState,
  projectActiveStrategy, respondToStrategyProposal, type StrategyProposal,
} from '@/domain/coach/coachStrategyState';
import { coachStrategyStateSchema } from '@/shared/validation/coachStrategyStateSchema';

const proposal: StrategyProposal = {
  id: 'proposal', version: 1, objective: 'loss', strategy: 'activeDeficit', status: 'pending',
  reasons: ['Données à compléter'], context: { origin: 'c4c5', referenceDate: '2026-09-12',
    referenceWeightKg: 80, sourceFingerprint: 'a'.repeat(64), primaryAction: 'collectMoreData', safetyStatus: 'clear' },
};
const action = { id: 'action', proposalId: 'proposal', proposalVersion: 1 as const,
  response: 'accepted' as const, decidedAt: '2026-09-12T12:00:00.000Z' };

describe('Strategy State domain', () => {
  it.each([
    ['loss', 'activeDeficit'], ['maintenance', 'stabilization'], ['gain', 'activeConstruction'],
  ])('adopte %s sans créer de consentement ou épisode', (goal, strategy) => {
    const state = createLegacyCoachStrategyState(goal, 'migration')!;
    expect(projectActiveStrategy(state)).toEqual({ status: 'legacy', origin: 'migration', objective: goal, strategy });
    expect(state.acceptances).toEqual([]);
    expect(state.proposals).toEqual([]);
    expect(JSON.stringify(state)).not.toMatch(/acceptedAt|activatedAt|decidedAt|phase/);
    expect(coachStrategyStateSchema.safeParse(state).success).toBe(true);
  });
  it.each([undefined, null, '', 'recomposition'])('ne crée rien pour %s', (goal) => {
    expect(createLegacyCoachStrategyState(goal, 'migration')).toBeUndefined();
  });
  it('distingue proposition, acceptation et état actif sans phase ni effets de plan', () => {
    const initial = emptyCoachStrategyState();
    const pending = appendStrategyProposal(initial, proposal);
    expect(projectActiveStrategy(pending)).toEqual({ status: 'unavailable' });
    const accepted = respondToStrategyProposal(pending, action);
    expect(projectActiveStrategy(accepted)).toEqual({ status: 'accepted', objective: 'loss',
      strategy: 'activeDeficit', origin: 'userAcceptance', proposalId: 'proposal', acceptanceId: 'action',
      acceptedAt: action.decidedAt });
    expect(initial.proposals).toEqual([]);
    expect(pending.proposals[0]?.status).toBe('pending');
    expect(coachStrategyStateSchema.safeParse(accepted).success).toBe(true);
    expect(() => appendStrategyProposal(accepted, { ...proposal, id: 'transition' })).toThrow(/transitions/);
  });
  it('refuse sans activation et sans changer la continuité legacy', () => {
    const legacy = createLegacyCoachStrategyState('loss', 'legacyCompatibility')!;
    const rejected = respondToStrategyProposal(appendStrategyProposal(legacy, proposal), { ...action, response: 'rejected' });
    expect(projectActiveStrategy(rejected)).toEqual(projectActiveStrategy(legacy));
    expect(rejected.acceptances[0]?.response).toBe('rejected');
  });
  it('garantit idempotence sans arbitrage de dates, rejette la réutilisation de clé', () => {
    const accepted = respondToStrategyProposal(appendStrategyProposal(emptyCoachStrategyState(), proposal), action);
    expect(respondToStrategyProposal(accepted, { ...action, decidedAt: '2020-01-01T00:00:00Z' })).toEqual(accepted);
    expect(() => respondToStrategyProposal(accepted, { ...action, response: 'rejected' })).toThrow(/idempotence/);
    expect(() => respondToStrategyProposal(accepted, { ...action, id: 'second' })).toThrow(/attente/);
  });
  it('rejette stratégie incompatible, état forgé, référence orpheline et acceptation legacy inventée', () => {
    expect(() => appendStrategyProposal(emptyCoachStrategyState(), { ...proposal, strategy: 'stabilization' })).toThrow(/objectif/);
    const accepted = respondToStrategyProposal(appendStrategyProposal(emptyCoachStrategyState(), proposal), action);
    for (const invalid of [
      { ...accepted, activeAcceptanceId: 'missing' }, { ...accepted, acceptances: [] },
      { ...accepted, revision: 999 }, { ...accepted, proposals: [proposal] },
      { ...accepted, phase: 'invented' }, { ...accepted, acceptances: [action, { ...action, id: 'duplicate' }] },
    ]) expect(coachStrategyStateSchema.safeParse(invalid).success).toBe(false);
  });
});
