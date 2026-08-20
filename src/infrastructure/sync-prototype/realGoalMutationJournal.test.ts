import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import { createRestoredDeletionRecord } from '@/domain/models/deletion';
import {
  appendRealGoalMutation,
  compareRealGoalMutationOrder,
  resolveRealGoalMutationJournal,
  type RealGoalMutationClockState,
  type RealGoalMutationRecord,
} from '@/infrastructure/sync-prototype/realGoalMutationJournal';

class JournalTestDatabase extends Dexie {
  declare realGoalMutations: Table<RealGoalMutationRecord, string>;
  declare realGoalMutationClocks: Table<RealGoalMutationClockState, string>;

  constructor(databaseName = `sportpilot-goal-journal-${crypto.randomUUID()}`) {
    super(databaseName);
    this.version(1).stores({
      realGoalMutations:
        'id, accountUserId, entityId, orderedAtMs, [accountUserId+entityId]',
      realGoalMutationClocks: 'id, accountUserId, actorId',
    });
  }
}

const ACCOUNT = 'account-user';

function goal(targetValue: number, updatedAt: string): Goal {
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

function mutation(input: {
  id: string;
  actorId: string;
  targetValue: number;
  orderedAtMs: number;
  rawOccurredAt: string;
}): RealGoalMutationRecord {
  const value = goal(input.targetValue, input.rawOccurredAt);
  return {
    id: input.id,
    accountUserId: ACCOUNT,
    entityId: value.id,
    operation: 'update',
    goal: value,
    marker: createRestoredDeletionRecord(
      { entityType: 'goal', entityId: value.id },
      value.updatedAt,
      value.createdAt,
    ),
    orderedAtMs: input.orderedAtMs,
    orderCounter: 0,
    actorId: input.actorId,
    actorSequence: 1,
    rawOccurredAt: input.rawOccurredAt,
    clockSource: 'dexie-auth-session-v1',
    clockUncertaintyMs: 1_000,
  };
}

describe('journal immuable des mutations Goals', () => {
  it('choisit le temps calibré plus récent malgré un Date.now brut inversé', () => {
    const olderA = mutation({
      id: '#a',
      actorId: 'A',
      targetValue: 8_000,
      orderedAtMs: 20_000,
      rawOccurredAt: '2026-08-20T12:30:00.000Z',
    });
    const laterB = mutation({
      id: '#b',
      actorId: 'B',
      targetValue: 55_000,
      orderedAtMs: 21_000,
      rawOccurredAt: '2026-08-20T12:00:01.000Z',
    });

    expect(olderA.rawOccurredAt > laterB.rawOccurredAt).toBe(true);
    expect(compareRealGoalMutationOrder(laterB, olderA)).toBe(1);
    expect(
      resolveRealGoalMutationJournal([laterB, olderA], ACCOUNT)
        .winners.get('goal-1')?.goal?.targetValue,
    ).toBe(55_000);
  });

  it('calibre deux appareils sur la session Dexie et conserve chaque entité', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const olderA = await appendRealGoalMutation({
        mutationTable: database.realGoalMutations,
        clockTable: database.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'A',
        session: {
          lastLogin: new Date('2026-08-20T12:30:00.000Z'),
          accessTokenExpiration: new Date('2026-08-20T14:00:00.000Z'),
        },
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(8_000, '2026-08-20T12:30:00.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:30:00.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2026-08-20T12:30:00.000Z').getTime(),
      });

      const laterB = await appendRealGoalMutation({
        mutationTable: database.realGoalMutations,
        clockTable: database.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'B',
        session: {
          lastLogin: new Date('2026-08-20T12:00:00.000Z'),
          accessTokenExpiration: new Date('2026-08-20T14:00:00.000Z'),
        },
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(55_000, '2026-08-20T12:00:01.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:00:01.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2026-08-20T12:00:01.000Z').getTime(),
      });

      expect(olderA.rawOccurredAt > laterB.rawOccurredAt).toBe(true);
      expect(laterB.orderedAtMs).toBeGreaterThan(olderA.orderedAtMs);
      expect(await database.realGoalMutations.count()).toBe(2);
      expect(
        resolveRealGoalMutationJournal(
          await database.realGoalMutations.toArray(),
          ACCOUNT,
        ).winners.get('goal-1')?.goal?.targetValue,
      ).toBe(55_000);
    } finally {
      await database.delete();
    }
  });

  it('ignore strictement les mutations d’un autre compte', () => {
    const foreign = {
      ...mutation({
        id: '#foreign',
        actorId: 'foreign-device',
        targetValue: 99_000,
        orderedAtMs: 99_000,
        rawOccurredAt: '2026-08-20T12:00:00.000Z',
      }),
      accountUserId: 'foreign-account',
      owner: 'foreign-account',
    };
    expect(
      resolveRealGoalMutationJournal([foreign], ACCOUNT)
        .authoritativeEntityIds.size,
    ).toBe(0);
  });

  it('conserve HLC et séquence après reload, fermeture et reprise offline', async () => {
    const databaseName = `sportpilot-goal-journal-reload-${crypto.randomUUID()}`;
    const firstDatabase = new JournalTestDatabase(databaseName);
    await firstDatabase.open();
    const onlineSession = {
      lastLogin: new Date('2026-08-20T12:30:00.000Z'),
      accessTokenExpiration: new Date('2026-08-20T14:00:00.000Z'),
    };
    const first = await appendRealGoalMutation({
      mutationTable: firstDatabase.realGoalMutations,
      clockTable: firstDatabase.realGoalMutationClocks,
      accountUserId: ACCOUNT,
      actorId: 'persistent-device',
      session: onlineSession,
      operation: 'update',
      entityId: 'goal-1',
      goal: goal(11_000, '2026-08-20T12:30:01.000Z'),
      marker: createRestoredDeletionRecord(
        { entityType: 'goal', entityId: 'goal-1' },
        '2026-08-20T12:30:01.000Z',
        '2026-08-20T08:00:00.000Z',
      ),
      now: () => new Date('2026-08-20T12:30:01.000Z').getTime(),
    });
    firstDatabase.close();

    const reopenedDatabase = new JournalTestDatabase(databaseName);
    await reopenedDatabase.open();
    try {
      const offlinePersistedSession = {
        lastLogin: new Date(Number.NaN),
      };
      const second = await appendRealGoalMutation({
        mutationTable: reopenedDatabase.realGoalMutations,
        clockTable: reopenedDatabase.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'persistent-device',
        session: offlinePersistedSession,
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(12_000, '2026-08-20T12:30:01.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:30:01.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2026-08-20T12:30:01.000Z').getTime(),
      });
      const third = await appendRealGoalMutation({
        mutationTable: reopenedDatabase.realGoalMutations,
        clockTable: reopenedDatabase.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'persistent-device',
        session: offlinePersistedSession,
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(13_000, '2026-08-20T12:30:01.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:30:01.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2026-08-20T12:30:01.000Z').getTime(),
      });

      expect(second.orderedAtMs).toBe(first.orderedAtMs);
      expect(second.orderCounter).toBe(first.orderCounter + 1);
      expect(third.orderCounter).toBe(second.orderCounter + 1);
      expect([first.actorSequence, second.actorSequence, third.actorSequence])
        .toEqual([1, 2, 3]);
    } finally {
      await reopenedDatabase.delete();
    }
  });

  it('renouvelle la calibration publique sans retour HLC lors d’un refresh token', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const first = await appendRealGoalMutation({
        mutationTable: database.realGoalMutations,
        clockTable: database.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'refresh-device',
        session: {
          lastLogin: new Date('2026-08-20T12:30:00.000Z'),
          accessTokenExpiration: new Date('2026-08-20T14:00:00.000Z'),
        },
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(10_000, '2026-08-20T12:30:10.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:30:10.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2026-08-20T12:30:10.000Z').getTime(),
      });
      const refreshed = await appendRealGoalMutation({
        mutationTable: database.realGoalMutations,
        clockTable: database.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'refresh-device',
        session: {
          lastLogin: new Date('2026-08-20T12:00:20.000Z'),
          accessTokenExpiration: new Date('2026-08-20T14:00:20.000Z'),
        },
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(20_000, '2026-08-20T12:00:20.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:00:20.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2026-08-20T12:00:20.000Z').getTime(),
      });
      const clock = await database.realGoalMutationClocks.toCollection().first();

      expect(compareRealGoalMutationOrder(refreshed, first)).toBe(1);
      expect(refreshed.orderedAtMs).toBeGreaterThanOrEqual(first.orderedAtMs);
      expect(clock?.calibratedFromLoginAt).toBe('2026-08-20T12:00:20.000Z');
      expect(clock?.actorSequence).toBe(2);
    } finally {
      await database.delete();
    }
  });

  it('reste monotone si l’horloge système avance puis recule fortement', async () => {
    const database = new JournalTestDatabase();
    await database.open();
    try {
      const common = {
        mutationTable: database.realGoalMutations,
        clockTable: database.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'clock-change-device',
        session: {
          lastLogin: new Date('2026-08-20T12:00:00.000Z'),
          accessTokenExpiration: new Date('2026-08-20T14:00:00.000Z'),
        },
        operation: 'update' as const,
        entityId: 'goal-1',
      };
      const forward = await appendRealGoalMutation({
        ...common,
        goal: goal(10_000, '2027-08-20T12:00:00.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2027-08-20T12:00:00.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2027-08-20T12:00:00.000Z').getTime(),
      });
      const backward = await appendRealGoalMutation({
        ...common,
        goal: goal(20_000, '2025-08-20T12:00:00.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2025-08-20T12:00:00.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
        now: () => new Date('2025-08-20T12:00:00.000Z').getTime(),
      });

      expect(backward.orderedAtMs).toBe(forward.orderedAtMs);
      expect(backward.orderCounter).toBe(forward.orderCounter + 1);
      expect(compareRealGoalMutationOrder(backward, forward)).toBe(1);
    } finally {
      await database.delete();
    }
  });

  it('départage une égalité entre acteurs et refuse sûrement toute première mutation non calibrée', async () => {
    const left = mutation({
      id: '#left',
      actorId: 'actor-a',
      targetValue: 10_000,
      orderedAtMs: 42,
      rawOccurredAt: '2026-08-20T12:00:00.000Z',
    });
    const right = mutation({
      id: '#right',
      actorId: 'actor-b',
      targetValue: 20_000,
      orderedAtMs: 42,
      rawOccurredAt: '2026-08-20T12:00:00.000Z',
    });
    expect(compareRealGoalMutationOrder(right, left)).toBe(1);
    expect(compareRealGoalMutationOrder(left, right)).toBe(-1);

    const database = new JournalTestDatabase();
    await database.open();
    try {
      await expect(appendRealGoalMutation({
        mutationTable: database.realGoalMutations,
        clockTable: database.realGoalMutationClocks,
        accountUserId: ACCOUNT,
        actorId: 'uncalibrated-device',
        session: {
          lastLogin: new Date(Number.NaN),
        },
        operation: 'update',
        entityId: 'goal-1',
        goal: goal(10_000, '2026-08-20T12:00:00.000Z'),
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: 'goal-1' },
          '2026-08-20T12:00:00.000Z',
          '2026-08-20T08:00:00.000Z',
        ),
      })).rejects.toThrow('calibration temporelle Dexie Goals');
      expect(await database.realGoalMutations.count()).toBe(0);
      expect(await database.realGoalMutationClocks.count()).toBe(0);
    } finally {
      await database.delete();
    }
  });
});
