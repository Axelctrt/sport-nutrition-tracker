import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
} from '@/domain/models/deletion';
import {
  appendRealGoalMutation,
  bootstrapRealGoalMutationHead,
  realGoalMutationHeadId,
  resolveRealGoalMutationJournal,
  uniqueLegacyMutationState,
  type RealGoalMutationHead,
  type RealGoalMutationRecord,
} from '@/infrastructure/sync-prototype/realGoalMutationJournal';

class JournalTestDatabase extends Dexie {
  declare realGoalMutations: Table<RealGoalMutationRecord, string>;
  declare realGoalMutationHeads: Table<RealGoalMutationHead, string>;

  constructor() {
    super(`sportpilot-goal-causal-journal-${crypto.randomUUID()}`);
    this.version(1).stores({
      realGoalMutations:
        'id, accountUserId, entityId, parentMutationId, [accountUserId+entityId]',
      realGoalMutationHeads:
        'id, accountUserId, entityId, mutationId, [entityId+mutationId], [accountUserId+entityId]',
    });
  }
}

const ACCOUNT = 'account-user';

function goal(targetValue: number, updatedAt = '2026-08-20T12:00:00.000Z'): Goal {
  return {
    id: 'goal-1',
    title: 'Pas',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-20',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt,
  };
}

function restored(value: Goal) {
  return createRestoredDeletionRecord(
    { entityType: 'goal', entityId: value.id },
    value.updatedAt,
    value.createdAt,
  );
}

async function bootstrap(database: JournalTestDatabase, value = goal(10_000)) {
  return bootstrapRealGoalMutationHead({
    database,
    mutationTable: database.realGoalMutations,
    headTable: database.realGoalMutationHeads,
    accountUserId: ACCOUNT,
    entityId: value.id,
    goal: value,
    marker: restored(value),
  });
}

async function update(
  database: JournalTestDatabase,
  parentMutationId: string,
  targetValue: number,
) {
  const value = goal(targetValue);
  return appendRealGoalMutation({
    database,
    mutationTable: database.realGoalMutations,
    headTable: database.realGoalMutationHeads,
    accountUserId: ACCOUNT,
    operation: 'update',
    entityId: value.id,
    parentMutationId,
    goal: value,
    marker: restored(value),
  });
}

describe('journal causal append-only des mutations Goals', () => {
  it('crée un anchor déterministe et un head explicitement non privé', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const first = await bootstrap(database);
      const second = await bootstrap(database);

      expect(first).toEqual(second);
      expect(first.id).toBe(realGoalMutationHeadId(ACCOUNT, 'goal-1'));
      expect(first.id.startsWith('#')).toBe(false);
      expect(first.mutationId.startsWith('#goal-anchor-')).toBe(true);
      expect(await database.realGoalMutations.count()).toBe(1);
      expect(await database.realGoalMutationHeads.count()).toBe(1);
    } finally {
      await database.delete();
    }
  });

  it('persiste la chaîne causale séquentielle X -> A1 -> A2', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const a1 = await update(database, anchor.mutationId, 20_000);
      const a2 = await update(database, a1.mutation.id, 30_000);

      expect(a1.headAdvanced).toBe(true);
      expect(a2.headAdvanced).toBe(true);
      expect(a1.mutation.parentMutationId).toBe(anchor.mutationId);
      expect(a2.mutation.parentMutationId).toBe(a1.mutation.id);
      expect(await database.realGoalMutationHeads.get(anchor.id))
        .toMatchObject({ mutationId: a2.mutation.id });
    } finally {
      await database.delete();
    }
  });

  it('conserve parent, mutation et head après fermeture puis réouverture', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const a1 = await update(database, anchor.mutationId, 20_000);
      database.close();
      await database.open();

      expect(await database.realGoalMutations.get(a1.mutation.id))
        .toMatchObject({ parentMutationId: anchor.mutationId });
      expect(await database.realGoalMutationHeads.get(anchor.id))
        .toMatchObject({ mutationId: a1.mutation.id });
    } finally {
      await database.delete();
    }
  });

  it('conserve une mutation stale lorsque le CAS refuse le head', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const accepted = await update(database, anchor.mutationId, 55_000);
      const stale = await update(database, anchor.mutationId, 8_000);

      expect(accepted.headAdvanced).toBe(true);
      expect(stale.headAdvanced).toBe(false);
      expect(await database.realGoalMutations.get(stale.mutation.id))
        .toEqual(stale.mutation);
      expect(await database.realGoalMutationHeads.get(anchor.id))
        .toMatchObject({ mutationId: accepted.mutation.id });
    } finally {
      await database.delete();
    }
  });

  it('bloque A1/A2/A3 si une branche B1 a avancé depuis X', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const b1 = await update(database, anchor.mutationId, 55_000);
      const a1 = await update(database, anchor.mutationId, 8_000);
      const a2 = await update(database, a1.mutation.id, 8_001);
      const a3 = await update(database, a2.mutation.id, 8_002);

      expect([a1, a2, a3].map((entry) => entry.headAdvanced))
        .toEqual([false, false, false]);
      expect(await database.realGoalMutations.count()).toBe(5);
      expect(await database.realGoalMutationHeads.get(anchor.id))
        .toMatchObject({ mutationId: b1.mutation.id });
    } finally {
      await database.delete();
    }
  });

  it('ignore totalement les timestamps contradictoires pour le winner', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const accepted = await update(database, anchor.mutationId, 55_000);
      await database.realGoalMutations.update(accepted.mutation.id, {
        orderedAtMs: 1,
        rawOccurredAt: '1990-01-01T00:00:00.000Z',
      });
      await database.realGoalMutations.update(anchor.mutationId, {
        orderedAtMs: Number.MAX_SAFE_INTEGER,
        rawOccurredAt: '2099-01-01T00:00:00.000Z',
      });

      const resolved = resolveRealGoalMutationJournal(
        await database.realGoalMutations.toArray(),
        await database.realGoalMutationHeads.toArray(),
        ACCOUNT,
      );
      expect(resolved.winners.get('goal-1')?.goal?.targetValue).toBe(55_000);
    } finally {
      await database.delete();
    }
  });

  it('applique delete puis restore seulement avec le vrai parent causal', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const deletion = await appendRealGoalMutation({
        database,
        mutationTable: database.realGoalMutations,
        headTable: database.realGoalMutationHeads,
        accountUserId: ACCOUNT,
        operation: 'delete',
        entityId: 'goal-1',
        parentMutationId: anchor.mutationId,
        marker: createDeletedDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T13:00:00.000Z',
        ),
      });
      const value = goal(12_000);
      const restoration = await appendRealGoalMutation({
        database,
        mutationTable: database.realGoalMutations,
        headTable: database.realGoalMutationHeads,
        accountUserId: ACCOUNT,
        operation: 'restore',
        entityId: value.id,
        parentMutationId: deletion.mutation.id,
        goal: value,
        marker: restored(value),
      });

      expect(deletion.headAdvanced).toBe(true);
      expect(restoration.headAdvanced).toBe(true);
      expect(await database.realGoalMutationHeads.get(anchor.id))
        .toMatchObject({ mutationId: restoration.mutation.id });
    } finally {
      await database.delete();
    }
  });

  it('refuse un delete et un restore basés sur un parent stale', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const anchor = await bootstrap(database);
      const accepted = await update(database, anchor.mutationId, 55_000);
      const staleDelete = await appendRealGoalMutation({
        database,
        mutationTable: database.realGoalMutations,
        headTable: database.realGoalMutationHeads,
        accountUserId: ACCOUNT,
        operation: 'delete',
        entityId: 'goal-1',
        parentMutationId: anchor.mutationId,
        marker: createDeletedDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2099-01-01T00:00:00.000Z',
        ),
      });
      const staleValue = goal(12_000, '2100-01-01T00:00:00.000Z');
      const staleRestore = await appendRealGoalMutation({
        database,
        mutationTable: database.realGoalMutations,
        headTable: database.realGoalMutationHeads,
        accountUserId: ACCOUNT,
        operation: 'restore',
        entityId: staleValue.id,
        parentMutationId: staleDelete.mutation.id,
        goal: staleValue,
        marker: restored(staleValue),
      });

      expect(staleDelete.headAdvanced).toBe(false);
      expect(staleRestore.headAdvanced).toBe(false);
      expect(await database.realGoalMutationHeads.get(anchor.id))
        .toMatchObject({ mutationId: accepted.mutation.id });
      expect(await database.realGoalMutations.get(staleDelete.mutation.id))
        .toBeDefined();
      expect(await database.realGoalMutations.get(staleRestore.mutation.id))
        .toBeDefined();
    } finally {
      await database.delete();
    }
  });

  it('refuse de rendre autoritaire un head privé ou appartenant à un autre compte', () => {
    const value = goal(10_000);
    const mutation: RealGoalMutationRecord = {
      id: '#mutation',
      accountUserId: ACCOUNT,
      entityId: value.id,
      operation: 'update',
      goal: value,
      marker: restored(value),
      parentMutationId: '#parent',
      causalVersion: 1,
    };
    const resolved = resolveRealGoalMutationJournal(
      [mutation],
      [{
        id: '#private-head',
        accountUserId: ACCOUNT,
        entityId: value.id,
        mutationId: mutation.id,
      }],
      ACCOUNT,
    );

    expect(resolved.authoritativeEntityIds.size).toBe(0);
    expect(resolved.winners.size).toBe(0);
  });

  it('échoue fermé devant deux états v17 divergents sans head', () => {
    const first = goal(8_000);
    const second = goal(55_000);
    const legacy = [first, second].map((value, index): RealGoalMutationRecord => ({
      id: `#legacy-${index}`,
      accountUserId: ACCOUNT,
      entityId: value.id,
      operation: 'update',
      goal: value,
      marker: restored(value),
      orderedAtMs: index,
      orderCounter: 0,
      actorId: String(index),
      actorSequence: 1,
      rawOccurredAt: value.updatedAt,
      clockSource: 'dexie-auth-session-v1',
      clockUncertaintyMs: 1_000,
    }));

    expect(() => uniqueLegacyMutationState(legacy, ACCOUNT, 'goal-1'))
      .toThrow('réconciliation explicite');
  });
});
