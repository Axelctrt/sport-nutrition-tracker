import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createLegacyCoachStrategyState, appendStrategyProposal, respondToStrategyProposal } from '@/domain/coach/coachStrategyState';
import { createDefaultUserSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { schemaVersion13 } from '@/infrastructure/database/schema';
import { createBackupEnvelope, parseBackupText, replaceDatabaseFromBackup, clearAllUserData } from '@/infrastructure/backup/backupService';
import { applySelectiveBackupRestore, prepareSelectiveBackupRestore } from '@/infrastructure/backup/selectiveBackupRestoreService';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

const opened: Dexie[] = [];
const makeDb = () => { const db = new AppDatabase(`strategy-backup-${crypto.randomUUID()}`); opened.push(db); return db; };
const acceptedState = () => respondToStrategyProposal(appendStrategyProposal(
  createLegacyCoachStrategyState('loss', 'legacyCompatibility')!, {
    id: 'proposal', version: 1, objective: 'loss', strategy: 'activeDeficit', status: 'pending', reasons: [],
    context: { origin: 'c4c5', referenceDate: '2026-09-12', referenceWeightKg: 80,
      sourceFingerprint: 'a'.repeat(64), primaryAction: 'collectMoreData', safetyStatus: 'clear' },
  }), { id: 'acceptance', proposalId: 'proposal', proposalVersion: 1, response: 'accepted', decidedAt: '2026-09-12T12:00:00.000Z' });

afterEach(async () => { for (const db of opened.splice(0)) await db.delete(); });

describe('Strategy migration and backup continuity', () => {
  it.each(['loss', 'maintenance', 'gain', undefined])('migre AppDB 13 → 14 avec objectif %s sans historique fabriqué', async (goal) => {
    const db = makeDb();
    const legacy = new Dexie(db.name);
    legacy.version(13).stores(schemaVersion13);
    await legacy.open();
    if (goal) await legacy.table('userProfile').put(createEntity(createProfileInput({ goal: goal as 'loss' }), LOCAL_USER_PROFILE_ID));
    const before = await legacy.table('userProfile').toArray();
    legacy.close();
    await db.open();
    expect(db.verno).toBe(14);
    expect(await db.userProfile.toArray()).toEqual(before);
    expect(await db.coachStrategyStates.toArray()).toEqual(goal ? [createLegacyCoachStrategyState(goal, 'migration')] : []);
    expect(await db.weeklyReviews.count()).toBe(0);
    expect(await db.coachDecisionMemories.count()).toBe(0);
    db.close(); await db.open();
    expect(await db.coachStrategyStates.count()).toBe(goal ? 1 : 0);
  });
  it('migre le backup 12 → 13 sans acceptation, même si une fausse table future était incluse', async () => {
    const db = makeDb();
    await db.userProfile.put(createEntity(createProfileInput({ goal: 'loss' }), LOCAL_USER_PROFILE_ID));
    await db.userSettings.put(createDefaultUserSettings());
    const envelope = await createBackupEnvelope(db);
    envelope.schemaVersion = 12;
    envelope.data.coachStrategyStates = [acceptedState()];
    const migrated = parseBackupText(JSON.stringify(envelope));
    expect(migrated.schemaVersion).toBe(13);
    expect(migrated.data.coachStrategyStates).toEqual([createLegacyCoachStrategyState('loss', 'migration')]);
  });
  it('aller-retour backup accepté, restore sélectif et suppression complète', async () => {
    const db = makeDb();
    await db.userProfile.put(createEntity(createProfileInput({ goal: 'loss' }), LOCAL_USER_PROFILE_ID));
    await db.userSettings.put(createDefaultUserSettings());
    const state = acceptedState();
    await db.coachStrategyStates.put(state);
    const envelope = parseBackupText(JSON.stringify(await createBackupEnvelope(db)));
    await db.coachStrategyStates.clear();
    await replaceDatabaseFromBackup(envelope, db);
    expect(await db.coachStrategyStates.toArray()).toEqual([state]);
    const legacy = { ...envelope, schemaVersion: 12 };
    const prepared = await prepareSelectiveBackupRestore(JSON.stringify(legacy), db);
    await applySelectiveBackupRestore(prepared, ['nutrition'], db);
    expect(await db.coachStrategyStates.toArray()).toEqual([state]);
    await applySelectiveBackupRestore(prepared, ['profileSettings'], db);
    expect(await db.coachStrategyStates.toArray()).toEqual([createLegacyCoachStrategyState('loss', 'migration')]);
    await clearAllUserData(db);
    expect(await db.coachStrategyStates.count()).toBe(0);
  });
  it('rejette un backup ambigu ou une acceptation orpheline avant toute restauration', async () => {
    const db = makeDb();
    const envelope = await createBackupEnvelope(db);
    envelope.data.coachStrategyStates = [acceptedState(), acceptedState()];
    expect(() => parseBackupText(JSON.stringify(envelope))).toThrow();
    envelope.data.coachStrategyStates = [{ ...acceptedState(), activeAcceptanceId: 'missing' }];
    expect(() => parseBackupText(JSON.stringify(envelope))).toThrow();
    expect(await db.coachStrategyStates.count()).toBe(0);
  });
});
