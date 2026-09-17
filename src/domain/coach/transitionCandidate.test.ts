import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createTransitionCandidate, type TransitionCandidate } from '@/domain/coach/transitionCandidate';
import { createLegacyCoachStrategyState, projectActiveStrategy } from '@/domain/coach/coachStrategyState';

const common = () => ({
  contractVersion: 1, id: 'candidate', currentStrategy: 'activeDeficit',
  currentAcceptanceReference: { acceptanceId: 'acceptance', proposalId: 'proposal' },
  objectiveContext: { contractVersion: 1, status: 'available', objective: 'loss',
    origin: 'userProfile', profileId: 'profile' },
  ruleReference: { id: 'descriptive-fixture-only', version: 1 },
  reasons: ['Revue à examiner, sans conclusion de transition'], unknowns: ['effectsNotContracted'],
  blockingReasons: [],
  evidenceReferences: [{ collection: 'weights', id: 'weight', date: '2026-09-16',
    provenance: 'userMeasurement', fields: ['weightKg'] }],
  signalQualityReferences: [{ assessmentId: 'quality:weight:recordedObservation' }],
  expectedRevision: 2, contextFingerprint: 'a'.repeat(64),
  validityConditions: { status: 'notEvaluated', requirements: ['Revalider le contexte et la règle'] },
  applicability: 'notEvaluated',
});
const review = () => ({ ...common(), kind: 'strategyReview', requiredUserDecision: 'reviewOnly',
  effectsContract: { status: 'none' } });
const transition = () => ({ ...common(), kind: 'strategyTransition', candidateStrategy: 'stabilization',
  requiredUserDecision: 'explicitAcceptance', effectsContract: { status: 'notContracted', reason: 'Plan non contractualisé' } });

describe('TransitionCandidate — descriptive contracts only', () => {
  it('crée une revue sans cible, sans effet ni permission d’application', () => {
    const result = createTransitionCandidate(review());
    expect(result.kind).toBe('strategyReview');
    expect(result).not.toHaveProperty('candidateStrategy');
    expect(result.effectsContract).toEqual({ status: 'none' });
    expect(result.applicability).toBe('notEvaluated');
    expectTypeOf(result).toEqualTypeOf<TransitionCandidate>();
  });
  it('décrit une transition vers une stratégie existante sans la rendre applicable', () => {
    const result = createTransitionCandidate(transition());
    expect(result).toMatchObject({ kind: 'strategyTransition', candidateStrategy: 'stabilization',
      currentStrategy: 'activeDeficit', objectiveContext: { objective: 'loss' },
      requiredUserDecision: 'explicitAcceptance', applicability: 'notEvaluated' });
    expect(result.effectsContract.status).toBe('notContracted');
  });
  it('distingue une liste vide de sources d’une évaluation suffisante', () => {
    const result = createTransitionCandidate({ ...review(), evidenceReferences: [], signalQualityReferences: [] });
    expect(result.applicability).toBe('notEvaluated');
    expect(result.unknowns).toEqual(['effectsNotContracted']);
  });
  it.each(Object.keys(transition()))('rejette le champ obligatoire absent : %s', (key) => {
    const input: Record<string, unknown> = transition();
    delete input[key];
    expect(() => createTransitionCandidate(input)).toThrow();
  });
  it.each(['miniCut', 'dietBreak', 'reverseDiet', 'refeed', 'competition', '', null])(
    'ne fabrique pas de stratégie cible %s', (candidateStrategy) => {
      expect(() => createTransitionCandidate({ ...transition(), candidateStrategy })).toThrow();
    },
  );
  it.each([
    { currentAcceptanceReference: { acceptanceId: '', proposalId: 'proposal' } },
    { currentAcceptanceReference: { acceptanceId: ' acceptance ', proposalId: 'proposal' } },
    { currentAcceptanceReference: { acceptedAt: '2026-09-16' } },
    { ruleReference: { id: 'rule', version: 0 } },
    { ruleReference: { id: ' ', version: 1 } },
    { signalQualityReferences: [{ assessmentId: '' }] },
    { evidenceReferences: [{ ...common().evidenceReferences[0], date: '2026-02-30' }] },
    { evidenceReferences: [{ ...common().evidenceReferences[0], fields: [] }] },
    { expectedRevision: -1 }, { expectedRevision: 1.5 }, { expectedRevision: Infinity },
    { contextFingerprint: '2026-09-16' },
    { objectiveContext: { ...common().objectiveContext, objective: 'recomposition' } },
    { reasons: [] }, { validityConditions: { status: 'valid', requirements: ['ready'] } },
    { effectsContract: undefined }, { effectsContract: {} },
    { effectsContract: { status: 'none', calories: -100 } },
    { applicability: 'applicable' }, { requiredUserDecision: 'automatic' },
  ])('rejette références, obligations et permissions invalides : %j', (patch) => {
    expect(() => createTransitionCandidate({ ...review(), ...patch })).toThrow();
  });
  it('ne confond pas revue et transition dans leurs effets ou choix utilisateur', () => {
    expect(() => createTransitionCandidate({ ...review(), candidateStrategy: 'stabilization' })).toThrow();
    expect(() => createTransitionCandidate({ ...transition(), effectsContract: { status: 'none' } })).toThrow();
    expect(() => createTransitionCandidate({ ...transition(), requiredUserDecision: 'reviewOnly' })).toThrow();
  });
  it.each(['score', 'confidenceScore', 'ranking', 'priority', 'probability', 'acceptedAt', 'activeAcceptanceId'])(
    'rejette le champ hors contrat %s', (field) => {
      expect(() => createTransitionCandidate({ ...review(), [field]: 1 })).toThrow();
    },
  );
  it('est déterministe, détaché, sans horloge, identifiant généré, réseau ou stockage', () => {
    const input = transition();
    const before = structuredClone(input);
    const state = createLegacyCoachStrategyState('loss', 'migration')!;
    const stateBefore = structuredClone(state);
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('clock forbidden'); });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('random forbidden'); });
    const fetch = vi.spyOn(globalThis, 'fetch');
    const database = vi.spyOn(indexedDB, 'open');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    try {
      Object.freeze(input);
      const first = createTransitionCandidate(input);
      expect(createTransitionCandidate(input)).toEqual(first);
      expect(input).toEqual(before);
      expect(first).not.toBe(input);
      expect(first.objectiveContext).not.toBe(input.objectiveContext);
      expect(first.evidenceReferences[0]?.fields).not.toBe(input.evidenceReferences[0]?.fields);
      input.reasons.push('Changement externe');
      expect(first.reasons).toEqual(before.reasons);
      expect(first).not.toHaveProperty('acceptances');
      expect(first).not.toHaveProperty('phase');
      expect(state).toEqual(stateBefore);
      expect(projectActiveStrategy(state).status).toBe('legacy');
      expect(now).not.toHaveBeenCalled();
      expect(random).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(database).not.toHaveBeenCalled();
      expect(storage).not.toHaveBeenCalled();
    } finally { vi.restoreAllMocks(); }
  });
});
