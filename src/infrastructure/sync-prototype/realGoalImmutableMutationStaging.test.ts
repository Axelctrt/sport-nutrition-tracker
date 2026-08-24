import Dexie, { type Table } from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { LogicalSyncBaseline } from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  appendRealGoalMutation,
  realGoalMutationHeadId,
  resolveRealGoalMutationJournal,
  type RealGoalMutationClockState,
  type RealGoalMutationHead,
  type RealGoalMutationRecord,
} from '@/infrastructure/sync-prototype/realGoalMutationJournal';
import {
  applyInitialRealGoalReconciliation,
  prepareInitialRealGoalReconciliation,
  previewRealGoalSync,
  stageRealGoalsMutationInLocalCloudReplica,
  synchronizeRealGoals,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

const ACCOUNT = 'account-user';

class JournalStagingCloudDatabase extends Dexie {
  declare realGoals: Table<Goal & { readonly owner?: string }, string>;
  declare realGoalDeletionRecords: Table<
    DeletionRecord & { readonly owner?: string },
    string
  >;
  declare realGoalMutations: Table<RealGoalMutationRecord, string>;
  declare realGoalMutationHeads: Table<RealGoalMutationHead, string>;
  declare realGoalMutationClocks: Table<RealGoalMutationClockState, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  readonly syncCloud = vi.fn(async () => undefined);

  constructor() {
    super(`sportpilot-goal-journal-staging-${crypto.randomUUID()}`);
    Object.defineProperty(this, 'cloud', {
      configurable: true,
      value: {
        currentUserId: ACCOUNT,
        currentUser: {
          value: {
            isLoggedIn: true,
            userId: ACCOUNT,
            lastLogin: new Date('2026-08-20T12:30:00.000Z'),
            accessTokenExpiration: new Date('2026-08-20T14:00:00.000Z'),
          },
        },
        sync: this.syncCloud,
      },
    });
    this.version(1).stores({
      realGoals: 'id, updatedAt',
      realGoalDeletionRecords: 'id, entityType, entityId, status',
      realGoalMutations:
        'id, accountUserId, entityId, parentMutationId, [accountUserId+entityId]',
      realGoalMutationHeads:
        'id, accountUserId, entityId, mutationId, [entityId+mutationId], [accountUserId+entityId]',
      realGoalMutationClocks: 'id, accountUserId, actorId',
      realSyncBaselines: 'id, accountUserId, domainId, entityId',
    });
  }
}

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

describe('staging local du journal immuable Goals', () => {
  it('stage create, delete et restore sans transport et sans écraser un événement', async () => {
    const local = new AppDatabase(
      `sportpilot-goal-journal-local-${crypto.randomUUID()}`,
    );
    const cloud = new JournalStagingCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
    try {
      const initial = goal(10_000, '2026-08-20T12:30:01.000Z');
      await local.goals.put(initial);
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [initial.id],
      );

      const markerId = deletionRecordId('goal', initial.id);
      await local.transaction(
        'rw',
        [local.goals, local.deletionRecords],
        async () => {
          await local.goals.delete(initial.id);
          await local.deletionRecords.put(createDeletedDeletionRecord(
            { entityType: 'goal', entityId: initial.id },
            '2026-08-20T12:30:02.000Z',
          ));
        },
      );
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [initial.id],
      );

      const restored = goal(12_000, '2026-08-20T12:30:03.000Z');
      const deleted = await local.deletionRecords.get(markerId);
      await local.transaction(
        'rw',
        [local.goals, local.deletionRecords],
        async () => {
          await local.goals.put(restored);
          await local.deletionRecords.put(createRestoredDeletionRecord(
            { entityType: 'goal', entityId: initial.id },
            restored.updatedAt,
            deleted?.deletedAt ?? restored.createdAt,
            deleted,
          ));
        },
      );
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [initial.id],
      );

      const mutations = await cloud.realGoalMutations.toArray();
      expect(mutations.map((mutation) => mutation.operation)).toEqual(
        expect.arrayContaining(['anchor', 'create', 'delete', 'restore']),
      );
      expect(cloud.syncCloud).not.toHaveBeenCalled();
      expect(await cloud.realGoals.count()).toBe(0);
      expect(await cloud.realGoalMutationClocks.count()).toBe(0);
      const heads = await cloud.realGoalMutationHeads.toArray();
      expect(heads).toHaveLength(1);
      expect(heads[0]?.id).toBe(realGoalMutationHeadId(ACCOUNT, initial.id));
      expect(heads[0]?.id.startsWith('#')).toBe(false);
      expect(await cloud.realSyncBaselines.count()).toBe(1);
      expect(
        resolveRealGoalMutationJournal(mutations, heads, ACCOUNT)
          .winners.get(initial.id),
      ).toMatchObject({
        operation: 'restore',
        goal: { targetValue: 12_000 },
      });
    } finally {
      await Promise.all([local.delete(), cloud.delete()]);
    }
  });

  it('reste idempotent sur replay, retry, reconnexion et double cycle', async () => {
    const local = new AppDatabase(
      `sportpilot-goal-journal-idempotence-local-${crypto.randomUUID()}`,
    );
    const cloud = new JournalStagingCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
    try {
      const first = goal(10_000, '2026-08-20T12:30:01.000Z');
      await local.goals.put(first);

      for (let replay = 0; replay < 3; replay += 1) {
        await stageRealGoalsMutationInLocalCloudReplica(
          local,
          cloud as unknown as SyncPrototypeDatabase,
          ACCOUNT,
          [first.id],
        );
      }
      expect(await cloud.realGoalMutations.count()).toBe(2);

      cloud.close();
      await cloud.open();
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [first.id],
      );
      expect(await cloud.realGoalMutations.count()).toBe(2);

      const second = goal(20_000, '2026-08-20T12:30:02.000Z');
      await local.goals.put(second);
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [second.id],
      );
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [second.id],
      );

      const mutations = await cloud.realGoalMutations.toArray();
      expect(mutations).toHaveLength(3);
      expect(new Set(mutations.map((mutation) => mutation.id)).size).toBe(3);
      expect(mutations.map((mutation) => mutation.operation)).toEqual(
        expect.arrayContaining(['anchor', 'create', 'update']),
      );
      expect(mutations.every((mutation) => mutation.orderedAtMs === undefined))
        .toBe(true);
      expect(cloud.syncCloud).not.toHaveBeenCalled();
    } finally {
      await Promise.all([local.delete(), cloud.delete()]);
    }
  });

  it('restage depuis AppDB après échec de session puis conserve le parent causal', async () => {
    const local = new AppDatabase(
      `sportpilot-goal-journal-reauth-local-${crypto.randomUUID()}`,
    );
    const cloud = new JournalStagingCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
    try {
      const first = goal(10_000, '2026-08-20T12:30:01.000Z');
      await local.goals.put(first);
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [first.id],
      );
      const firstHead = await cloud.realGoalMutationHeads.get(
        realGoalMutationHeadId(ACCOUNT, first.id),
      );
      expect(firstHead).toBeDefined();

      await local.goals.put(goal(20_000, '2026-08-20T12:30:02.000Z'));
      const currentUser = (cloud as unknown as {
        cloud: { currentUser: { value: { userId: string } } };
      }).cloud.currentUser.value;
      currentUser.userId = 'expired-session';
      await expect(stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [first.id],
      )).rejects.toThrow('compte Dexie a changé');
      expect(await cloud.realGoalMutations.count()).toBe(2);

      currentUser.userId = ACCOUNT;
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [first.id],
      );
      const mutations = await cloud.realGoalMutations.toArray();
      const retried = mutations.find((mutation) =>
        mutation.goal?.targetValue === 20_000);
      expect(retried?.parentMutationId).toBe(firstHead?.mutationId);
      expect(await cloud.realGoalMutationHeads.get(firstHead?.id ?? ''))
        .toMatchObject({ mutationId: retried?.id });
    } finally {
      await Promise.all([local.delete(), cloud.delete()]);
    }
  });

  it('ne transforme pas une intention stale en descendante lors du restaging global', async () => {
    const local = new AppDatabase(
      `sportpilot-goal-journal-stale-retry-${crypto.randomUUID()}`,
    );
    const cloud = new JournalStagingCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
    try {
      const initial = goal(10_000, '2026-08-20T12:30:01.000Z');
      await local.goals.put(initial);
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [initial.id],
      );
      const initialHead = await cloud.realGoalMutationHeads.get(
        realGoalMutationHeadId(ACCOUNT, initial.id),
      );
      expect(initialHead).toBeDefined();

      const stale = goal(8_000, '2099-01-01T00:00:00.000Z');
      await local.goals.put(stale);
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [initial.id],
      );
      const staleMutation = (await cloud.realGoalMutations.toArray())
        .find((mutation) => mutation.goal?.targetValue === 8_000);
      expect(staleMutation).toBeDefined();

      const fresh = goal(55_000, '2000-01-01T00:00:00.000Z');
      const freshMutation = await appendRealGoalMutation({
        database: cloud,
        mutationTable: cloud.realGoalMutations,
        headTable: cloud.realGoalMutationHeads,
        accountUserId: ACCOUNT,
        operation: 'update',
        entityId: initial.id,
        parentMutationId: initialHead?.mutationId ?? '',
        goal: fresh,
        marker: createRestoredDeletionRecord(
          { entityType: 'goal', entityId: initial.id },
          fresh.updatedAt,
          fresh.createdAt,
        ),
      });
      await cloud.realGoalMutationHeads.update(initialHead?.id ?? '', {
        mutationId: freshMutation.mutation.id,
      });
      const beforeRetryCount = await cloud.realGoalMutations.count();

      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
      );

      expect(await cloud.realGoalMutations.count()).toBe(beforeRetryCount);
      expect(await cloud.realGoalMutationHeads.get(initialHead?.id ?? ''))
        .toMatchObject({ mutationId: freshMutation.mutation.id });
      expect((await cloud.realGoalMutations.get(staleMutation?.id ?? ''))
        ?.parentMutationId).toBe(initialHead?.mutationId);
    } finally {
      await Promise.all([local.delete(), cloud.delete()]);
    }
  });

  it('bootstrappe les états legacy v16 sans créer de fausse mutation', async () => {
    const local = new AppDatabase(
      `sportpilot-goal-journal-legacy-local-${crypto.randomUUID()}`,
    );
    const cloud = new JournalStagingCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
    try {
      const active = goal(10_000, '2026-08-20T12:00:00.000Z');
      const restored = {
        ...goal(20_000, '2026-08-20T12:05:00.000Z'),
        id: 'goal-restored',
      };
      const restoredMarker = createRestoredDeletionRecord(
        { entityType: 'goal', entityId: restored.id },
        restored.updatedAt,
        '2026-08-20T12:04:00.000Z',
      );
      const deletedMarker = createDeletedDeletionRecord(
        { entityType: 'goal', entityId: 'goal-deleted' },
        '2026-08-20T12:06:00.000Z',
      );
      const shadowed = {
        ...goal(30_000, '2026-08-20T12:07:00.000Z'),
        id: 'goal-shadowed-by-tombstone',
      };
      const shadowedMarker = createDeletedDeletionRecord(
        { entityType: 'goal', entityId: shadowed.id },
        '2026-08-20T12:08:00.000Z',
      );
      await local.goals.bulkPut([active, restored, shadowed]);
      await local.deletionRecords.bulkPut([
        restoredMarker,
        deletedMarker,
        shadowedMarker,
      ]);
      await cloud.realGoals.bulkPut([
        { ...active, id: `#${active.id}`, owner: ACCOUNT },
        { ...restored, id: `#${restored.id}`, owner: ACCOUNT },
        { ...shadowed, id: `#${shadowed.id}`, owner: ACCOUNT },
      ]);
      await cloud.realGoalDeletionRecords.bulkPut([
        {
          ...restoredMarker,
          id: `#${restoredMarker.id}`,
          owner: ACCOUNT,
        },
        {
          ...deletedMarker,
          id: `#${deletedMarker.id}`,
          owner: ACCOUNT,
        },
        {
          ...shadowedMarker,
          id: `#${shadowedMarker.id}`,
          owner: ACCOUNT,
        },
      ]);

      const preview = await previewRealGoalSync(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
      );
      expect(preview.differingEntityCount).toBe(0);
      expect(await cloud.realGoalMutations.count()).toBe(0);
      expect(await cloud.realGoalMutationClocks.count()).toBe(0);
      expect(await local.goals.get(shadowed.id)).toMatchObject({
        targetValue: 30_000,
      });

      const updated = goal(55_000, '2026-08-20T12:10:00.000Z');
      await local.goals.put(updated);
      await stageRealGoalsMutationInLocalCloudReplica(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        [updated.id],
      );
      expect(await cloud.realGoalMutations.count()).toBe(2);
      expect(await cloud.realGoalMutations
        .where('entityId').equals(updated.id).toArray())
        .toContainEqual(expect.objectContaining({
          operation: 'update',
          goal: expect.objectContaining({ targetValue: 55_000 }),
        }));
    } finally {
      await Promise.all([local.delete(), cloud.delete()]);
    }
  });

  it('préserve les bootstraps historiques cloud-only et local-only', async () => {
    const cloudOnlyLocal = new AppDatabase(
      `sportpilot-goal-journal-cloud-only-local-${crypto.randomUUID()}`,
    );
    const cloudOnlyCloud = new JournalStagingCloudDatabase();
    const localOnlyLocal = new AppDatabase(
      `sportpilot-goal-journal-local-only-local-${crypto.randomUUID()}`,
    );
    const localOnlyCloud = new JournalStagingCloudDatabase();
    await Promise.all([
      cloudOnlyLocal.open(),
      cloudOnlyCloud.open(),
      localOnlyLocal.open(),
      localOnlyCloud.open(),
    ]);
    try {
      const cloudValue = goal(10_000, '2026-08-20T12:00:00.000Z');
      await cloudOnlyCloud.realGoals.put({
        ...cloudValue,
        id: `#${cloudValue.id}`,
        owner: ACCOUNT,
      });
      const restored = await synchronizeRealGoals(
        cloudOnlyLocal,
        cloudOnlyCloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        { writeCloud: false },
      );
      expect(restored.downloadedGoals).toBe(1);
      expect(await cloudOnlyLocal.goals.get(cloudValue.id))
        .toMatchObject({ targetValue: 10_000 });
      expect(await cloudOnlyCloud.realGoalMutations.count()).toBe(0);

      const localValue = goal(20_000, '2026-08-20T12:05:00.000Z');
      await localOnlyLocal.goals.put(localValue);
      const prepared = await prepareInitialRealGoalReconciliation(
        localOnlyLocal,
        localOnlyCloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
      );
      await applyInitialRealGoalReconciliation(
        localOnlyLocal,
        localOnlyCloud as unknown as SyncPrototypeDatabase,
        ACCOUNT,
        prepared,
        'keep-local',
      );
      expect(await localOnlyCloud.realGoals.get(`#${localValue.id}`))
        .toMatchObject({ targetValue: 20_000 });
      expect(await localOnlyCloud.realGoalMutations.count()).toBe(0);
    } finally {
      await Promise.all([
        cloudOnlyLocal.delete(),
        cloudOnlyCloud.delete(),
        localOnlyLocal.delete(),
        localOnlyCloud.delete(),
      ]);
    }
  });
});
