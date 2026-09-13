import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachStrategyStateService } from '@/application/coach/coachStrategyStateService';
import { createDefaultUserSettings, createDefaultDeviceSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import { COACH_STRATEGY_STATE_ID } from '@/domain/coach/coachStrategyState';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { COACH_STRATEGY_SOURCE_TABLES, DexieCoachStrategyRepository } from '@/infrastructure/repositories/dexie/DexieCoachStrategyRepository';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createEntity } from '@/shared/utils/entities';

describe('Strategy acceptance local transaction', () => {
  let db: AppDatabase;
  let service: CoachStrategyStateService;
  const date = '2026-09-12';
  const propose = { id: 'proposal', strategy: 'activeDeficit' as const, expectedRevision: 0,
    referenceDate: date, referenceWeightKg: 80 };
  const accept = { id: 'action', proposalId: 'proposal', proposalVersion: 1 as const,
    response: 'accepted' as const, expectedRevision: 1, referenceDate: date };
  const snapshot = () => Promise.all(COACH_STRATEGY_SOURCE_TABLES.map((name) => db.table(name).toArray()));
  const checkIn = () => ({ id: `daily-check-in:${date}`, date, contextFlags: ['painOrInjury' as const],
    contextSyncPreference: 'localOnly' as const, completedAt: `${date}T08:00:00.000Z`,
    createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` });
  beforeEach(async () => {
    const { webcrypto } = await vi.importActual<{ webcrypto: Crypto }>('node:crypto');
    vi.stubGlobal('crypto', webcrypto);
    db = new AppDatabase(`strategy-${crypto.randomUUID()}`);
    await db.open();
    await db.userProfile.put(createEntity(createProfileInput({ goal: 'loss' }), LOCAL_USER_PROFILE_ID));
    await db.userSettings.put(createDefaultUserSettings());
    await db.deviceSettings.put(createDefaultDeviceSettings());
    service = new CoachStrategyStateService(new DexieCoachStrategyRepository(db, () => true), () => `${date}T12:00:00.000Z`);
  });
  afterEach(async () => { await db.delete(); vi.unstubAllGlobals(); });

  it('lecture sans écriture ; proposition C4/C5, explication C10.1, acceptation et reload sans effets C5/C9', async () => {
    const before = await snapshot();
    expect(await service.project()).toEqual({ status: 'unavailable' });
    expect(await db.coachStrategyStates.count()).toBe(0);
    const result = await service.propose(propose);
    expect(result.explanation).toBeDefined();
    expect(result.state.proposals[0]?.context.primaryAction).toBe('collectMoreData');
    expect((await service.project()).status).toBe('legacy');
    const accepted = await service.respond(accept);
    expect(accepted.activeAcceptanceId).toBe('action');
    db.close(); await db.open();
    expect((await service.project()).status).toBe('accepted');
    expect(await snapshot()).toEqual(before);
    expect(await db.weeklyReviews.count()).toBe(0);
    expect(await db.coachDecisionMemories.count()).toBe(0);
    expect(await service.respond(accept)).toEqual(accepted);
  });
  it('rejette une révision périmée, sans lost update ni réponse partielle', async () => {
    await service.propose(propose);
    const responses = await Promise.allSettled([
      service.respond(accept), service.respond({ ...accept, id: 'other', response: 'rejected' }),
    ]);
    expect(responses.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const state = await db.coachStrategyStates.get(COACH_STRATEGY_STATE_ID);
    expect(state?.revision).toBe(2);
    expect(state?.acceptances).toHaveLength(1);
  });
  it('un double envoi simultané du même consentement ne crée qu’un reçu', async () => {
    await service.propose(propose);
    const [first, retry] = await Promise.all([service.respond(accept), service.respond(accept)]);
    expect(retry).toEqual(first);
    expect(first.revision).toBe(2);
    expect(first.acceptances).toHaveLength(1);
  });
  it.each(['goal', 'settings', 'checkin'])('revalide %s dans la transaction, même avec une horloge ancienne', async (change) => {
    await service.propose(propose);
    const previous = await db.coachStrategyStates.toArray();
    if (change === 'goal') await db.userProfile.update(LOCAL_USER_PROFILE_ID, { goal: 'gain', updatedAt: '2020-01-01T00:00:00Z' });
    if (change === 'settings') await db.userSettings.toCollection().modify({ maximumWeeklyAdjustmentKcal: 50 });
    if (change === 'checkin') await db.dailyCheckIns.put(checkIn());
    await expect(service.respond(accept)).rejects.toThrow();
    expect(await db.coachStrategyStates.toArray()).toEqual(previous);
    // Refusal remains possible without applying a stale proposal.
    expect((await service.respond({ ...accept, response: 'rejected' })).activeAcceptanceId).toBeUndefined();
  });
  it('une erreur de persistance annule la réponse entière', async () => {
    await service.propose(propose);
    const before = await db.coachStrategyStates.toArray();
    const hook = () => { throw new Error('simulated disk failure'); };
    db.coachStrategyStates.hook('updating', hook);
    await expect(service.respond(accept)).rejects.toThrow('simulated disk failure');
    db.coachStrategyStates.hook('updating').unsubscribe(hook);
    expect(await db.coachStrategyStates.toArray()).toEqual(before);
  });
  it('réutilise la Safety actuelle sans inventer de veto Strategy ni modifier son contexte local-only', async () => {
    await db.dailyCheckIns.put(checkIn());
    const before = await snapshot();
    const result = await service.propose(propose);
    expect(result.state.proposals[0]?.context.safetyStatus).toBe('doNotIntensify');
    expect((await service.respond(accept)).activeAcceptanceId).toBe('action');
    expect(await snapshot()).toEqual(before);
    expect(await db.acceptedCalorieAdjustments.count()).toBe(0);
  });
  it('annule une acceptation si le compte change pendant la commande', async () => {
    await service.propose(propose);
    let current = true;
    const guarded = new CoachStrategyStateService(new DexieCoachStrategyRepository(db, () => current), () => {
      current = false;
      return `${date}T12:00:00.000Z`;
    });
    await expect(guarded.respond(accept)).rejects.toThrow(/espace/);
    expect((await db.coachStrategyStates.get(COACH_STRATEGY_STATE_ID))?.revision).toBe(1);
  });
  it('isole deux espaces et interdit une opération après changement de compte', async () => {
    await service.propose(propose);
    const other = new AppDatabase(`strategy-other-${crypto.randomUUID()}`);
    try {
      const otherService = new CoachStrategyStateService(new DexieCoachStrategyRepository(other, () => true));
      expect(await otherService.project()).toEqual({ status: 'unavailable' });
      await expect(otherService.respond(accept)).rejects.toThrow(/absente/);
      const staleService = new CoachStrategyStateService(new DexieCoachStrategyRepository(db, () => false));
      await expect(staleService.respond(accept)).rejects.toThrow(/espace/);
      expect((await db.coachStrategyStates.get(COACH_STRATEGY_STATE_ID))?.revision).toBe(1);
    } finally { await other.delete(); }
  });
});
