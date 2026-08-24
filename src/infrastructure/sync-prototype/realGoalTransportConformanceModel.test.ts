import Dexie from 'dexie';
import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  SyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  logicalSyncBaselineId,
  type LogicalSyncBaseline,
  type LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  stageRealGoalsMutationInLocalCloudReplica,
  synchronizeRealGoalsFromCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';

const USER_ID = 'axel.cottrant@example.test';
const GOAL_ID = 'goal-physical-failure';
const BASELINE_ACTOR_ID = 'device-baseline';

type CloudGoal = Goal & LogicalSyncFields & {
  readonly owner?: string;
};
type CloudMarker = DeletionRecord & LogicalSyncFields & {
  readonly owner?: string;
  readonly goalMutationState?: 1;
};

interface MutationJournalEntry<TValue = CloudGoal> {
  readonly type: 'insert' | 'upsert' | 'update' | 'modify' | 'delete';
  readonly keys: readonly string[];
  readonly values?: readonly TValue[];
  readonly changeSpecs?: readonly Record<string, unknown>[];
  readonly ts: number;
  readonly txid: string;
  readonly userId: string;
}

/**
 * Local conformance model only. `adjustedOperationOrder` is injected by the
 * test and must never be cited as evidence of Dexie Cloud server behaviour.
 * The real P0 gate lives under tests/integration-cloud.
 */
interface TransportTraceEntry {
  readonly source: 'A' | 'B';
  readonly operationType: MutationJournalEntry['type'];
  readonly rawClientTimestamp: number;
  readonly adjustedOperationOrder: number;
  readonly targetValue?: number;
  readonly syncRevision?: number;
  readonly syncActorId?: string;
}

function goal(targetValue: number, updatedAt: string): Goal {
  return {
    id: GOAL_ID,
    title: 'TEST PROD REEL MGL',
    metric: 'totalSteps',
    targetValue,
    startDate: '2026-08-18',
    status: 'active',
    reachedMilestones: [],
    createdAt: '2026-08-18T11:51:21.266Z',
    updatedAt,
  };
}

function cloudGoal(targetValue: number): CloudGoal {
  return {
    ...goal(targetValue, '2026-08-20T13:00:00.000Z'),
    id: `#${GOAL_ID}`,
    owner: USER_ID,
    syncRevision: 37,
    syncActorId: BASELINE_ACTOR_ID,
  };
}

function baseline(): LogicalSyncBaseline {
  return {
    id: logicalSyncBaselineId(USER_ID, 'goals', 'goals'),
    accountUserId: USER_ID,
    domainId: 'goals',
    entityId: 'goals',
    localDigest: 'baseline-local',
    cloudDigest: 'baseline-cloud',
    revision: 37,
    actorId: BASELINE_ACTOR_ID,
    updatedAt: '2026-08-20T13:00:00.000Z',
  };
}

function createCloudReplica(device: 'A' | 'B'): SyncPrototypeDatabase {
  const database = new SyncPrototypeDatabase(
    {
      enabled: true,
      databaseUrl: 'https://transport-test.dexie.cloud',
      realWeightSyncEnabled: false,
      realActivitySyncEnabled: false,
      realGoalSyncEnabled: true,
      realStrengthSyncEnabled: false,
      realNutritionJournalSyncEnabled: false,
      realNutritionLibrarySyncEnabled: false,
      realNutritionTrackingSyncEnabled: false,
      realAccountPreferencesSyncEnabled: false,
      realRewardsRoutinesSyncEnabled: false,
      realSocialCloudEnabled: false,
      diagnosticsEnabled: false,
    },
    `sportpilot-goal-transport-cloud-${device}-${crypto.randomUUID()}`,
  );

  // The harness exercises the installed addon's local operation journal only.
  // An empty runtime URL prevents initial sync and any external transport.
  (database.cloud.options as { databaseUrl?: string }).databaseUrl = '';
  return database;
}

async function authenticateLocalReplica(
  database: SyncPrototypeDatabase,
): Promise<void> {
  const currentUser = database.cloud.currentUser as unknown as {
    next(value: Record<string, unknown>): void;
  };
  currentUser.next({
    claims: {},
    lastLogin: new Date('2026-08-20T13:00:00.000Z'),
    isLoggedIn: true,
    isLoading: false,
    email: USER_ID,
    userId: USER_ID,
    accessToken: 'local-test-token',
    license: { type: 'prod', status: 'ok' },
  });
}

async function deauthenticateLocalReplica(
  database: SyncPrototypeDatabase,
): Promise<void> {
  const currentUser = database.cloud.currentUser as unknown as {
    next(value: Record<string, unknown>): void;
  };
  currentUser.next({
    claims: {},
    lastLogin: new Date('2026-08-20T13:00:00.000Z'),
    isLoggedIn: false,
    isLoading: false,
    userId: 'unauthorized',
  });
}

async function journal(
  database: SyncPrototypeDatabase,
): Promise<MutationJournalEntry[]> {
  return database
    .table<MutationJournalEntry, number>('$realGoals_mutations')
    .toArray();
}

async function markerJournal(
  database: SyncPrototypeDatabase,
): Promise<MutationJournalEntry<CloudMarker>[]> {
  return database
    .table<MutationJournalEntry<CloudMarker>, number>(
      '$realGoalDeletionRecords_mutations',
    )
    .toArray();
}

function replayTransportInArrivalOrder(
  initial: CloudGoal,
  batches: readonly {
    readonly source: 'A' | 'B';
    readonly adjustedOperationOrder: number;
    readonly operations: readonly MutationJournalEntry[];
  }[],
): { readonly canonical: CloudGoal; readonly trace: TransportTraceEntry[] } {
  let canonical = structuredClone(initial);
  const trace: TransportTraceEntry[] = [];
  const propertyOperationOrder = new Map<string, number>();

  const applyProperty = (
    keyPath: string,
    value: unknown,
    operationOrder: number,
  ) => {
    if (operationOrder < (propertyOperationOrder.get(keyPath) ?? 0)) return;
    (canonical as unknown as Record<string, unknown>)[keyPath] = value;
    propertyOperationOrder.set(keyPath, operationOrder);
  };

  for (const batch of batches) {
    for (const operation of batch.operations) {
      const index = operation.keys.indexOf(`#${GOAL_ID}`);
      if (index < 0) continue;

      const changeSpec = operation.changeSpecs?.[index];
      if (changeSpec) {
        for (const [keyPath, value] of Object.entries(changeSpec)) {
          applyProperty(keyPath, value, batch.adjustedOperationOrder);
        }
      } else if (operation.type === 'insert' || operation.type === 'upsert') {
        canonical = structuredClone(operation.values?.[index] ?? canonical);
      }

      trace.push({
        source: batch.source,
        operationType: operation.type,
        rawClientTimestamp: operation.ts,
        adjustedOperationOrder: batch.adjustedOperationOrder,
        targetValue: canonical.targetValue,
        ...(canonical.syncRevision !== undefined
          ? { syncRevision: canonical.syncRevision }
          : {}),
        ...(canonical.syncActorId !== undefined
          ? { syncActorId: canonical.syncActorId }
          : {}),
      });
    }
  }

  return { canonical, trace };
}

type TransportTable = 'goal' | 'marker';

class DexieOperationTransportHarness {
  private goalValue: CloudGoal | undefined;
  private markerValue: CloudMarker | undefined;
  private readonly existenceOrder = new Map<TransportTable, number>();
  private readonly propertyOrder = new Map<string, number>();

  constructor(input: {
    readonly goal?: CloudGoal;
    readonly marker?: CloudMarker;
  }) {
    this.goalValue = input.goal ? structuredClone(input.goal) : undefined;
    this.markerValue = input.marker ? structuredClone(input.marker) : undefined;
    this.existenceOrder.set('goal', input.goal ? 0 : -1);
    this.existenceOrder.set('marker', input.marker ? 0 : -1);
    for (const property of Object.keys(input.goal ?? {})) {
      this.propertyOrder.set(`goal:${property}`, 0);
    }
    for (const property of Object.keys(input.marker ?? {})) {
      this.propertyOrder.set(`marker:${property}`, 0);
    }
  }

  apply(
    table: TransportTable,
    operation: MutationJournalEntry<CloudGoal | CloudMarker>,
    adjustedOperationOrder: number,
  ): void {
    const key = table === 'goal'
      ? `#${GOAL_ID}`
      : `#${deletionRecordId('goal', GOAL_ID)}`;
    const index = operation.keys.indexOf(key);
    if (index < 0) return;

    const currentExistenceOrder = this.existenceOrder.get(table) ?? -1;
    if (operation.type === 'delete') {
      if (adjustedOperationOrder >= currentExistenceOrder) {
        this.setValue(table, undefined);
        this.existenceOrder.set(table, adjustedOperationOrder);
      }
      return;
    }

    const fallback = operation.values?.[index];
    const changeSpec = operation.changeSpecs?.[index];
    if (!changeSpec) {
      // A put() journal has no property intent: arrival replaces the object.
      if (fallback) this.setValue(table, structuredClone(fallback));
      return;
    }

    let current = this.value(table);
    if (!current && fallback) {
      if (adjustedOperationOrder < currentExistenceOrder) return;
      current = structuredClone(fallback);
      this.setValue(table, current);
      for (const property of Object.keys(current)) {
        this.propertyOrder.set(`${table}:${property}`, adjustedOperationOrder);
      }
    }
    if (!current) return;

    for (const [property, value] of Object.entries(changeSpec)) {
      const propertyKey = `${table}:${property}`;
      const previousOrder = this.propertyOrder.get(propertyKey) ?? -1;
      if (adjustedOperationOrder >= previousOrder) {
        (current as unknown as Record<string, unknown>)[property] = value;
        this.propertyOrder.set(propertyKey, adjustedOperationOrder);
      }
    }
    this.existenceOrder.set(
      table,
      Math.max(currentExistenceOrder, adjustedOperationOrder),
    );
  }

  applyBatch(input: {
    readonly adjustedOperationOrder: number;
    readonly goals: readonly MutationJournalEntry[];
    readonly markers: readonly MutationJournalEntry<CloudMarker>[];
  }): void {
    for (const operation of input.goals) {
      this.apply('goal', operation, input.adjustedOperationOrder);
    }
    for (const operation of input.markers) {
      this.apply('marker', operation, input.adjustedOperationOrder);
    }
  }

  goal(): CloudGoal | undefined {
    return this.goalValue ? structuredClone(this.goalValue) : undefined;
  }

  marker(): CloudMarker | undefined {
    return this.markerValue ? structuredClone(this.markerValue) : undefined;
  }

  effectiveGoal(): CloudGoal | undefined {
    return this.markerValue?.status === 'deleted' ? undefined : this.goal();
  }

  private value(table: TransportTable): CloudGoal | CloudMarker | undefined {
    return table === 'goal' ? this.goalValue : this.markerValue;
  }

  private setValue(
    table: TransportTable,
    value: CloudGoal | CloudMarker | undefined,
  ): void {
    if (table === 'goal') {
      this.goalValue = value as CloudGoal | undefined;
    } else {
      this.markerValue = value as CloudMarker | undefined;
    }
  }
}

async function stageGoalUpdate(
  local: AppDatabase,
  cloud: SyncPrototypeDatabase,
  targetValue: number,
  updatedAt: string,
): Promise<void> {
  await local.goals.put(goal(targetValue, updatedAt));
  await stageRealGoalsMutationInLocalCloudReplica(
    local,
    cloud,
    USER_ID,
    [GOAL_ID],
    { immutableJournal: false },
  );
}

async function stageGoalDeletion(
  local: AppDatabase,
  cloud: SyncPrototypeDatabase,
  deletedAt: string,
): Promise<void> {
  const markerId = deletionRecordId('goal', GOAL_ID);
  await local.transaction(
    'rw',
    [local.goals, local.deletionRecords],
    async () => {
      const existing = await local.deletionRecords.get(markerId);
      await local.deletionRecords.put(createDeletedDeletionRecord(
        { entityType: 'goal', entityId: GOAL_ID },
        deletedAt,
        existing,
      ));
      await local.goals.delete(GOAL_ID);
    },
  );
  await stageRealGoalsMutationInLocalCloudReplica(
    local,
    cloud,
    USER_ID,
    [GOAL_ID],
    { immutableJournal: false },
  );
}

async function stageGoalRestore(
  local: AppDatabase,
  cloud: SyncPrototypeDatabase,
  targetValue: number,
  restoredAt: string,
): Promise<void> {
  const markerId = deletionRecordId('goal', GOAL_ID);
  await local.transaction(
    'rw',
    [local.goals, local.deletionRecords],
    async () => {
      const existing = await local.deletionRecords.get(markerId);
      const restoredGoal = goal(targetValue, restoredAt);
      await local.goals.put(restoredGoal);
      await local.deletionRecords.put(createRestoredDeletionRecord(
        { entityType: 'goal', entityId: GOAL_ID },
        restoredAt,
        existing?.deletedAt ?? restoredGoal.createdAt,
        existing,
      ));
    },
  );
  await stageRealGoalsMutationInLocalCloudReplica(
    local,
    cloud,
    USER_ID,
    [GOAL_ID],
    { immutableJournal: false },
  );
}

async function clearGoalOperationJournals(
  database: SyncPrototypeDatabase,
): Promise<void> {
  await Promise.all([
    database.table('$realGoals_mutations').clear(),
    database.table('$realGoalDeletionRecords_mutations').clear(),
  ]);
}

async function seedDeletedReplica(
  local: AppDatabase,
  cloud: SyncPrototypeDatabase,
  deletedAt: string,
): Promise<CloudMarker> {
  const deleted = createDeletedDeletionRecord(
    { entityType: 'goal', entityId: GOAL_ID },
    deletedAt,
  );
  const cloudDeleted: CloudMarker = {
    ...deleted,
    id: `#${deleted.id}`,
    owner: USER_ID,
    syncRevision: 37,
    syncActorId: BASELINE_ACTOR_ID,
    goalMutationState: 1,
  };

  await Promise.all([
    local.goals.delete(GOAL_ID),
    local.deletionRecords.put(deleted),
    cloud.realGoals.delete(`#${GOAL_ID}`),
    cloud.realGoalDeletionRecords.put(cloudDeleted),
  ]);
  await clearGoalOperationJournals(cloud);
  return cloudDeleted;
}

describe('modèle local de conformance Goals (sans serveur Dexie Cloud)', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: SyncPrototypeDatabase;
  let cloudB: SyncPrototypeDatabase;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    localA = new AppDatabase(
      `sportpilot-goal-transport-app-a-${crypto.randomUUID()}`,
    );
    localB = new AppDatabase(
      `sportpilot-goal-transport-app-b-${crypto.randomUUID()}`,
    );
    cloudA = createCloudReplica('A');
    cloudB = createCloudReplica('B');
    await Promise.all([
      localA.open(),
      localB.open(),
      cloudA.open(),
      cloudB.open(),
    ]);

    await Promise.all([
      localA.goals.put(goal(10_000, '2026-08-20T13:00:00.000Z')),
      localB.goals.put(goal(10_000, '2026-08-20T13:00:00.000Z')),
      cloudA.realGoals.put(cloudGoal(10_000)),
      cloudB.realGoals.put(cloudGoal(10_000)),
      cloudA.realSyncBaselines.put(baseline()),
      cloudB.realSyncBaselines.put(baseline()),
    ]);
    await Promise.all([
      authenticateLocalReplica(cloudA),
      authenticateLocalReplica(cloudB),
    ]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const databases = [localA, localB, cloudA, cloudB];
    const names = databases.map((database) => database.name);
    databases.forEach((database) => database.close());
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('modélise 10000 -> A 8000 -> B 55000 avec un ordre ajusté injecté', async () => {
    const dateNow = vi.spyOn(Date, 'now');

    // A mutates first in real time with a correct wall clock, while offline.
    dateNow.mockReturnValue(new Date('2026-08-20T13:10:00.000Z').getTime());
    await localA.goals.put(goal(8_000, '2026-08-20T13:10:00.000Z'));
    await stageRealGoalsMutationInLocalCloudReplica(
      localA,
      cloudA,
      USER_ID,
      [GOAL_ID],
      { immutableJournal: false },
    );

    // B mutates later in real time, but its skewed wall clock is one hour behind.
    dateNow.mockReturnValue(new Date('2026-08-20T12:20:00.000Z').getTime());
    await localB.goals.put(goal(55_000, '2026-08-20T12:20:00.000Z'));
    await stageRealGoalsMutationInLocalCloudReplica(
      localB,
      cloudB,
      USER_ID,
      [GOAL_ID],
      { immutableJournal: false },
    );

    const [journalA, journalB, markerOperationsA, markerOperationsB] = await Promise.all([
      journal(cloudA),
      journal(cloudB),
      markerJournal(cloudA),
      markerJournal(cloudB),
    ]);
    expect(await localA.goals.get(GOAL_ID)).toMatchObject({ targetValue: 8_000 });
    expect(await localB.goals.get(GOAL_ID)).toMatchObject({ targetValue: 55_000 });
    expect(await cloudA.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 8_000,
      syncRevision: 38,
    });
    expect(await cloudB.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 55_000,
      syncRevision: 38,
    });
    expect(await cloudA.realSyncBaselines.get(baseline().id)).toMatchObject({
      revision: 38,
      actorId: `database:${localA.name}`,
    });
    expect(await cloudB.realSyncBaselines.get(baseline().id)).toMatchObject({
      revision: 38,
      actorId: `database:${localB.name}`,
    });
    expect(cloudA.name).not.toBe(cloudB.name);
    expect(journalA).toHaveLength(1);
    expect(journalB).toHaveLength(1);
    expect(markerOperationsA).toHaveLength(1);
    expect(markerOperationsB).toHaveLength(1);
    const operationA = journalA[0];
    const operationB = journalB[0];
    const markerOperationA = markerOperationsA[0];
    const markerOperationB = markerOperationsB[0];
    if (!operationA || !operationB || !markerOperationA || !markerOperationB) {
      throw new Error('Les deux journaux Dexie Goals doivent contenir une operation.');
    }
    expect(operationA).toMatchObject({
      type: 'upsert',
      userId: USER_ID,
      values: [{
        targetValue: 8_000,
        syncRevision: 38,
        syncActorId: `database:${localA.name}`,
      }],
      changeSpecs: [{
        targetValue: 8_000,
        updatedAt: '2026-08-20T13:10:00.000Z',
        syncRevision: 38,
        syncActorId: `database:${localA.name}`,
      }],
    });
    expect(operationB).toMatchObject({
      type: 'upsert',
      userId: USER_ID,
      values: [{
        targetValue: 55_000,
        syncRevision: 38,
        syncActorId: `database:${localB.name}`,
      }],
      changeSpecs: [{
        targetValue: 55_000,
        updatedAt: '2026-08-20T12:20:00.000Z',
        syncRevision: 38,
        syncActorId: `database:${localB.name}`,
      }],
    });
    expect(operationA.txid).not.toBe(operationB.txid);
    expect(operationA.ts).toBeGreaterThan(operationB.ts);
    expect(markerOperationA).toMatchObject({
      type: 'upsert',
      changeSpecs: [{ status: 'restored', goalMutationState: 1 }],
    });
    expect(markerOperationB).toMatchObject({
      type: 'upsert',
      changeSpecs: [{ status: 'restored', goalMutationState: 1 }],
    });

    // B reaches the server first; the older A operation is delivered later.
    const afterB = replayTransportInArrivalOrder(cloudGoal(10_000), [{
      source: 'B',
      adjustedOperationOrder: 2,
      operations: journalB,
    }]);
    expect(afterB.canonical).toMatchObject({
      targetValue: 55_000,
      syncRevision: 38,
      syncActorId: `database:${localB.name}`,
    });

    const converged = replayTransportInArrivalOrder(cloudGoal(10_000), [
      {
        source: 'B',
        adjustedOperationOrder: 2,
        operations: journalB,
      },
      {
        source: 'A',
        adjustedOperationOrder: 1,
        operations: journalA,
      },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(converged.trace).toEqual([
      expect.objectContaining({
        source: 'B',
        operationType: 'upsert',
        adjustedOperationOrder: 2,
        targetValue: 55_000,
        syncRevision: 38,
        syncActorId: `database:${localB.name}`,
      }),
      expect.objectContaining({
        source: 'A',
        operationType: 'upsert',
        adjustedOperationOrder: 1,
        targetValue: 55_000,
        syncRevision: 38,
        syncActorId: `database:${localB.name}`,
      }),
    ]);
    expect(converged.canonical).toMatchObject({
      targetValue: 55_000,
      syncRevision: 38,
      syncActorId: `database:${localB.name}`,
    });

    const canonicalMarker = markerOperationB.values?.[0];
    expect(canonicalMarker).toBeDefined();
    if (!canonicalMarker) {
      throw new Error('Le marqueur canonique B doit etre complet.');
    }
    await Promise.all([
      deauthenticateLocalReplica(cloudA),
      deauthenticateLocalReplica(cloudB),
    ]);
    await Promise.all([
      cloudA.realGoals.put(converged.canonical),
      cloudB.realGoals.put(converged.canonical),
      cloudA.realGoalDeletionRecords.put(canonicalMarker),
      cloudB.realGoalDeletionRecords.put(canonicalMarker),
    ]);
    await Promise.all([
      synchronizeRealGoalsFromCloud(localA, cloudA, USER_ID),
      synchronizeRealGoalsFromCloud(localB, cloudB, USER_ID),
    ]);
    expect(await localA.goals.get(GOAL_ID)).toMatchObject({ targetValue: 55_000 });
    expect(await localB.goals.get(GOAL_ID)).toMatchObject({ targetValue: 55_000 });

    // A normal mutation after convergence starts from the winner and cannot
    // resurrect its acknowledged 8,000 operation.
    await clearGoalOperationJournals(cloudA);
    await authenticateLocalReplica(cloudA);
    dateNow.mockReturnValue(new Date('2026-08-20T13:30:00.000Z').getTime());
    await stageGoalUpdate(
      localA,
      cloudA,
      60_000,
      '2026-08-20T11:30:00.000Z',
    );
    const [postConvergenceGoals, postConvergenceMarkers] = await Promise.all([
      journal(cloudA),
      markerJournal(cloudA),
    ]);
    const postConvergenceServer = new DexieOperationTransportHarness({
      goal: converged.canonical,
      marker: canonicalMarker,
    });
    postConvergenceServer.applyBatch({
      adjustedOperationOrder: 3,
      goals: postConvergenceGoals,
      markers: postConvergenceMarkers,
    });
    expect(postConvergenceServer.effectiveGoal()).toMatchObject({
      targetValue: 60_000,
      syncRevision: 39,
      syncActorId: `database:${localA.name}`,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fait gagner le scenario miroir quand A est la mutation reelle la plus recente', async () => {
    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(new Date('2026-08-20T15:10:00.000Z').getTime());
    await stageGoalUpdate(localB, cloudB, 40_000, '2026-08-20T15:10:00.000Z');

    dateNow.mockReturnValue(new Date('2026-08-20T12:20:00.000Z').getTime());
    await stageGoalUpdate(localA, cloudA, 70_000, '2026-08-20T12:20:00.000Z');

    const [goalsA, goalsB, markersA, markersB] = await Promise.all([
      journal(cloudA),
      journal(cloudB),
      markerJournal(cloudA),
      markerJournal(cloudB),
    ]);
    const operationA = goalsA[0];
    const operationB = goalsB[0];
    if (!operationA || !operationB) {
      throw new Error('Les journaux miroir A et B doivent contenir une operation.');
    }
    expect(operationB.ts).toBeGreaterThan(operationA.ts);

    const server = new DexieOperationTransportHarness({
      goal: cloudGoal(10_000),
    });
    server.applyBatch({
      adjustedOperationOrder: 2,
      goals: goalsA,
      markers: markersA,
    });
    server.applyBatch({
      adjustedOperationOrder: 1,
      goals: goalsB,
      markers: markersB,
    });

    expect(server.effectiveGoal()).toMatchObject({
      targetValue: 70_000,
      updatedAt: '2026-08-20T12:20:00.000Z',
      syncActorId: `database:${localA.name}`,
    });
  });

  it('preserve le cas B online simple 8000 -> 10000', async () => {
    await deauthenticateLocalReplica(cloudB);
    await Promise.all([
      localB.goals.put(goal(8_000, '2026-08-20T13:00:00.000Z')),
      cloudB.realGoals.put(cloudGoal(8_000)),
    ]);
    await clearGoalOperationJournals(cloudB);
    await authenticateLocalReplica(cloudB);

    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(new Date('2026-08-20T13:10:00.000Z').getTime());
    await stageGoalUpdate(localB, cloudB, 10_000, '2026-08-20T13:10:00.000Z');

    const server = new DexieOperationTransportHarness({ goal: cloudGoal(8_000) });
    server.applyBatch({
      adjustedOperationOrder: 1,
      goals: await journal(cloudB),
      markers: await markerJournal(cloudB),
    });
    expect(server.effectiveGoal()).toMatchObject({ targetValue: 10_000 });
  });

  it('stage une mutation purement offline sans cloud.sync ni fetch', async () => {
    const sync = vi.spyOn(cloudA.cloud, 'sync');
    await stageGoalUpdate(
      localA,
      cloudA,
      9_000,
      '2026-08-20T13:10:00.000Z',
    );

    expect(await localA.goals.get(GOAL_ID)).toMatchObject({ targetValue: 9_000 });
    expect(await cloudA.realGoals.get(`#${GOAL_ID}`)).toMatchObject({
      targetValue: 9_000,
      syncRevision: 38,
    });
    expect(await journal(cloudA)).toHaveLength(1);
    expect(await markerJournal(cloudA)).toHaveLength(1);
    expect(sync).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cree un objet complet absent avec un upsert declaratif', async () => {
    await deauthenticateLocalReplica(cloudA);
    await Promise.all([
      localA.goals.delete(GOAL_ID),
      cloudA.realGoals.delete(`#${GOAL_ID}`),
    ]);
    await clearGoalOperationJournals(cloudA);
    await authenticateLocalReplica(cloudA);

    await stageGoalUpdate(
      localA,
      cloudA,
      12_000,
      '2026-08-20T13:10:00.000Z',
    );
    const operations = await journal(cloudA);
    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: 'upsert',
      values: [{
        id: `#${GOAL_ID}`,
        title: 'TEST PROD REEL MGL',
        metric: 'totalSteps',
        targetValue: 12_000,
        status: 'active',
        reachedMilestones: [],
      }],
      changeSpecs: [{
        title: 'TEST PROD REEL MGL',
        metric: 'totalSteps',
        targetValue: 12_000,
        status: 'active',
        reachedMilestones: [],
      }],
    });
  });

  it('fait gagner un delete recent contre un update ancien malgre les horloges inversees', async () => {
    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(new Date('2026-08-20T13:10:00.000Z').getTime());
    await stageGoalUpdate(localA, cloudA, 8_000, '2026-08-20T13:10:00.000Z');
    dateNow.mockReturnValue(new Date('2026-08-20T12:20:00.000Z').getTime());
    await stageGoalDeletion(localB, cloudB, '2026-08-20T12:20:00.000Z');

    const server = new DexieOperationTransportHarness({ goal: cloudGoal(10_000) });
    server.applyBatch({
      adjustedOperationOrder: 2,
      goals: await journal(cloudB),
      markers: await markerJournal(cloudB),
    });
    server.applyBatch({
      adjustedOperationOrder: 1,
      goals: await journal(cloudA),
      markers: await markerJournal(cloudA),
    });
    expect(server.goal()).toBeUndefined();
    expect(server.marker()).toMatchObject({ status: 'deleted' });
    expect(server.effectiveGoal()).toBeUndefined();
  });

  it('fait gagner un update recent contre un delete ancien malgre une livraison tardive', async () => {
    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(new Date('2026-08-20T13:10:00.000Z').getTime());
    await stageGoalDeletion(localA, cloudA, '2026-08-20T13:10:00.000Z');
    dateNow.mockReturnValue(new Date('2026-08-20T12:20:00.000Z').getTime());
    await stageGoalUpdate(localB, cloudB, 55_000, '2026-08-20T12:20:00.000Z');

    const server = new DexieOperationTransportHarness({ goal: cloudGoal(10_000) });
    server.applyBatch({
      adjustedOperationOrder: 2,
      goals: await journal(cloudB),
      markers: await markerJournal(cloudB),
    });
    server.applyBatch({
      adjustedOperationOrder: 1,
      goals: await journal(cloudA),
      markers: await markerJournal(cloudA),
    });
    expect(server.marker()).toMatchObject({ status: 'restored' });
    expect(server.effectiveGoal()).toMatchObject({ targetValue: 55_000 });

    const canonicalGoal = server.goal();
    const canonicalMarker = server.marker();
    if (!canonicalGoal || !canonicalMarker) {
      throw new Error('Le restore recent doit produire un etat cloud complet.');
    }
    await deauthenticateLocalReplica(cloudA);
    await Promise.all([
      cloudA.realGoals.put(canonicalGoal),
      cloudA.realGoalDeletionRecords.put(canonicalMarker),
    ]);
    await clearGoalOperationJournals(cloudA);
    await authenticateLocalReplica(cloudA);
    await synchronizeRealGoalsFromCloud(localA, cloudA, USER_ID);
    expect(await localA.goals.get(GOAL_ID)).toMatchObject({
      targetValue: 55_000,
    });
  });

  it('fait gagner un restore recent contre un delete ancien', async () => {
    const baselineDeletedAt = '2026-08-20T13:00:00.000Z';
    const [serverMarker] = await Promise.all([
      seedDeletedReplica(localA, cloudA, baselineDeletedAt),
      seedDeletedReplica(localB, cloudB, baselineDeletedAt),
    ]);
    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(new Date('2026-08-20T13:10:00.000Z').getTime());
    await stageGoalDeletion(localA, cloudA, '2026-08-20T13:10:00.000Z');
    dateNow.mockReturnValue(new Date('2026-08-20T12:20:00.000Z').getTime());
    await stageGoalRestore(localB, cloudB, 55_000, '2026-08-20T12:20:00.000Z');

    const [goalsA, goalsB, markersA, markersB] = await Promise.all([
      journal(cloudA),
      journal(cloudB),
      markerJournal(cloudA),
      markerJournal(cloudB),
    ]);
    expect(markersA[0]?.changeSpecs?.[0]).toMatchObject({
      status: 'deleted',
      goalMutationState: 1,
    });
    const server = new DexieOperationTransportHarness({ marker: serverMarker });
    server.applyBatch({
      adjustedOperationOrder: 2,
      goals: goalsB,
      markers: markersB,
    });
    server.applyBatch({
      adjustedOperationOrder: 1,
      goals: goalsA,
      markers: markersA,
    });
    expect(server.marker()).toMatchObject({ status: 'restored' });
    expect(server.effectiveGoal()).toMatchObject({ targetValue: 55_000 });
  });

  it('fait gagner un delete recent contre un restore ancien', async () => {
    const baselineDeletedAt = '2026-08-20T13:00:00.000Z';
    const [serverMarker] = await Promise.all([
      seedDeletedReplica(localA, cloudA, baselineDeletedAt),
      seedDeletedReplica(localB, cloudB, baselineDeletedAt),
    ]);
    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(new Date('2026-08-20T13:10:00.000Z').getTime());
    await stageGoalRestore(localA, cloudA, 8_000, '2026-08-20T13:10:00.000Z');
    dateNow.mockReturnValue(new Date('2026-08-20T12:20:00.000Z').getTime());
    await stageGoalDeletion(localB, cloudB, '2026-08-20T12:20:00.000Z');

    const [goalsA, goalsB, markersA, markersB] = await Promise.all([
      journal(cloudA),
      journal(cloudB),
      markerJournal(cloudA),
      markerJournal(cloudB),
    ]);
    expect(markersB[0]?.changeSpecs?.[0]).toMatchObject({
      status: 'deleted',
      goalMutationState: 1,
    });
    const server = new DexieOperationTransportHarness({ marker: serverMarker });
    server.applyBatch({
      adjustedOperationOrder: 2,
      goals: goalsB,
      markers: markersB,
    });
    server.applyBatch({
      adjustedOperationOrder: 1,
      goals: goalsA,
      markers: markersA,
    });
    expect(server.marker()).toMatchObject({ status: 'deleted' });
    expect(server.effectiveGoal()).toBeUndefined();

    const canonicalMarker = server.marker();
    if (!canonicalMarker) {
      throw new Error('Le delete recent doit conserver son marqueur cloud.');
    }
    await deauthenticateLocalReplica(cloudA);
    await Promise.all([
      cloudA.realGoals.delete(`#${GOAL_ID}`),
      cloudA.realGoalDeletionRecords.put(canonicalMarker),
    ]);
    await clearGoalOperationJournals(cloudA);
    await authenticateLocalReplica(cloudA);
    await synchronizeRealGoalsFromCloud(localA, cloudA, USER_ID);
    expect(await localA.goals.get(GOAL_ID)).toBeUndefined();
  });
});
