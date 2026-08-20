import type { Goal } from '@/domain/goals/goalState';
import {
  createDeletedDeletionRecord,
  createRestoredDeletionRecord,
  deletionRecordId,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  SyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  applyInitialRealGoalReconciliation,
  prepareInitialRealGoalReconciliation,
  previewRealGoalSync,
  stageRealGoalsMutationInLocalCloudReplica,
  synchronizeRealGoals,
  synchronizeRealGoalsFromCloud,
  synchronizeRealGoalsToCloud,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import {
  createSyncPrototypeClient,
  type SyncPrototypeClient,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  resolveRealGoalMutationJournal,
  type RealGoalMutationRecord,
} from '@/infrastructure/sync-prototype/realGoalMutationJournal';

const SYNTHETIC_DEMO_USER = 'sportpilot-goals-conflict@demo.local';
const FORBIDDEN_PRODUCTION_HOST = ['zhnyk8met', 'dexie', 'cloud'].join('.');

interface ClientInitialization {
  readonly databaseUrl: string;
  readonly device: 'A' | 'B';
  readonly runId: string;
  readonly demoUser?: string;
}

interface MutationJournalEntry {
  readonly type: string;
  readonly ts: number;
  readonly opNo?: number;
  readonly keys?: readonly string[];
  readonly values?: readonly Record<string, unknown>[];
  readonly changeSpecs?: readonly Record<string, unknown>[];
  readonly txid?: string;
  readonly userId?: string;
}

interface ClockProbe {
  readonly realNow: number;
  readonly rawDateNow: number;
  readonly offsetMs: number;
}

interface TestClockWindow extends Window {
  __SPORTPILOT_REAL_NOW__?: () => number;
  __SPORTPILOT_CLOCK_OFFSET_MS__?: number;
}

function assertSafeTestDatabaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.dexie.cloud')) {
    throw new Error('Le gate integration-cloud exige une URL Dexie Cloud HTTPS.');
  }
  if (url.hostname === FORBIDDEN_PRODUCTION_HOST) {
    throw new Error('GARDE integration-cloud: la base de production est interdite.');
  }
  return url.origin;
}

function safeDatabaseSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
}

function cloudConfig(databaseUrl: string) {
  return {
    enabled: true as const,
    databaseUrl,
    realWeightSyncEnabled: false,
    realActivitySyncEnabled: false,
    realGoalSyncEnabled: true,
    realStrengthSyncEnabled: false,
    realNutritionJournalSyncEnabled: false,
    realNutritionLibrarySyncEnabled: false,
    realNutritionTrackingSyncEnabled: false,
    realDailyCoachingSyncEnabled: false,
    realAccountPreferencesSyncEnabled: false,
    realRewardsRoutinesSyncEnabled: false,
    realSocialCloudEnabled: false,
    diagnosticsEnabled: false,
  };
}

function pickGoalFields(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  return {
    id: value.id,
    owner: value.owner,
    realmId: value.realmId,
    title: value.title,
    metric: value.metric,
    status: value.status,
    targetValue: value.targetValue,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    syncRevision: value.syncRevision,
    syncActorId: value.syncActorId,
    $$ts: value.$$ts,
  };
}

function pickMarkerFields(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  return {
    id: value.id,
    owner: value.owner,
    realmId: value.realmId,
    entityType: value.entityType,
    entityId: value.entityId,
    status: value.status,
    deletedAt: value.deletedAt,
    restoredAt: value.restoredAt,
    updatedAt: value.updatedAt,
    goalMutationState: value.goalMutationState,
    syncRevision: value.syncRevision,
    syncActorId: value.syncActorId,
    $$ts: value.$$ts,
  };
}

function pickChangeSpec(
  value: Record<string, unknown> | undefined,
  kind: 'goal' | 'marker',
) {
  if (!value) return undefined;
  return kind === 'goal' ? pickGoalFields(value) : pickMarkerFields(value);
}

function summarizeJournal(
  entries: readonly MutationJournalEntry[],
  kind: 'goal' | 'marker',
) {
  return entries.map((entry) => ({
    type: entry.type,
    ts: entry.ts,
    opNo: entry.opNo,
    keys: entry.keys,
    txid: entry.txid,
    userId: entry.userId,
    values: entry.values?.map((value) => pickChangeSpec(value, kind)),
    changeSpecs: entry.changeSpecs?.map((value) =>
      pickChangeSpec(value, kind)),
  }));
}

function pickImmutableMutation(value: RealGoalMutationRecord) {
  return {
    id: value.id,
    accountUserId: value.accountUserId,
    entityId: value.entityId,
    operation: value.operation,
    orderedAtMs: value.orderedAtMs,
    orderCounter: value.orderCounter,
    actorId: value.actorId,
    actorSequence: value.actorSequence,
    rawOccurredAt: value.rawOccurredAt,
    clockSource: value.clockSource,
    clockUncertaintyMs: value.clockUncertaintyMs,
    goal: pickGoalFields(
      value.goal as unknown as Record<string, unknown> | undefined,
    ),
    marker: pickMarkerFields(
      value.marker as unknown as Record<string, unknown> | undefined,
    ),
  };
}

class GoalsDexieCloudTestClient {
  private appDatabase: AppDatabase | undefined;
  private cloudDatabase: SyncPrototypeDatabase | undefined;
  private client: SyncPrototypeClient | undefined;
  private currentUserId: string | undefined;
  private device: 'A' | 'B' | undefined;

  async initialize(input: ClientInitialization) {
    if (this.cloudDatabase || this.appDatabase) {
      throw new Error('Le client integration-cloud est déjà initialisé.');
    }
    const databaseUrl = assertSafeTestDatabaseUrl(input.databaseUrl);
    const demoUser = input.demoUser ?? SYNTHETIC_DEMO_USER;
    if (!demoUser.endsWith('@demo.local')) {
      throw new Error('Le gate integration-cloud exige un demo user synthétique.');
    }

    this.device = input.device;
    const suffix = safeDatabaseSegment(`${input.runId}-${input.device}`);
    this.appDatabase = new AppDatabase(`sportpilot-goals-cloud-app-${suffix}`);
    this.cloudDatabase = new SyncPrototypeDatabase(
      cloudConfig(databaseUrl),
      `sportpilot-goals-cloud-replica-${suffix}`,
    );
    this.client = createSyncPrototypeClient(this.cloudDatabase, {
      realGoalSyncEnabled: true,
      localDatabase: this.appDatabase,
      initializationTimeoutMs: 30_000,
    });

    await this.appDatabase.open();
    await this.client.initialize();
    if (!this.cloudDatabase.cloud.currentUser.value.isLoggedIn) {
      await this.cloudDatabase.cloud.login({
        grant_type: 'demo',
        email: demoUser,
      });
    }
    const currentUser = this.cloudDatabase.cloud.currentUser.value;
    if (!currentUser.isLoggedIn || !currentUser.userId) {
      throw new Error('Le demo user Dexie Cloud n’est pas authentifié.');
    }
    this.currentUserId = currentUser.userId;
    return {
      device: input.device,
      userId: currentUser.userId,
      isLoggedIn: true,
      clock: this.clock(),
      sessionClock: this.sessionClockProbe(),
    };
  }

  private databases() {
    if (!this.appDatabase || !this.cloudDatabase || !this.client || !this.currentUserId) {
      throw new Error('Le client integration-cloud n’est pas initialisé.');
    }
    return {
      appDatabase: this.appDatabase,
      cloudDatabase: this.cloudDatabase,
      client: this.client,
      currentUserId: this.currentUserId,
    };
  }

  clock(): ClockProbe {
    const testWindow = window as TestClockWindow;
    return {
      realNow: testWindow.__SPORTPILOT_REAL_NOW__?.() ?? Date.now(),
      rawDateNow: Date.now(),
      offsetMs: testWindow.__SPORTPILOT_CLOCK_OFFSET_MS__ ?? 0,
    };
  }

  sessionClockProbe() {
    const { cloudDatabase } = this.databases();
    const currentUser = cloudDatabase.cloud.currentUser.value;
    const tokenParts = currentUser.accessToken?.split('.') ?? [];
    let tokenTimes: { iat?: number; exp?: number } = {};
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(
          atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')),
        ) as { iat?: number; exp?: number };
        tokenTimes = { iat: payload.iat, exp: payload.exp };
      } catch {
        // The probe deliberately exposes no token material.
      }
    }
    return {
      clock: this.clock(),
      lastLogin: currentUser.lastLogin?.toISOString(),
      accessTokenExpiration: currentUser.accessTokenExpiration?.toISOString(),
      tokenTimes,
    };
  }

  async putLocalGoal(goal: Goal): Promise<void> {
    const { appDatabase } = this.databases();
    await appDatabase.goals.put(structuredClone(goal));
  }

  async deleteLocalGoal(goalId: string, occurredAt: string): Promise<void> {
    const { appDatabase } = this.databases();
    const current = await appDatabase.goals.get(goalId);
    if (!current) throw new Error('Le Goal à supprimer est absent d’AppDB.');
    const markerId = deletionRecordId('goal', goalId);
    const previous = await appDatabase.deletionRecords.get(markerId);
    await appDatabase.transaction(
      'rw',
      [appDatabase.goals, appDatabase.deletionRecords],
      async () => {
        await appDatabase.goals.delete(goalId);
        await appDatabase.deletionRecords.put(createDeletedDeletionRecord(
          { entityType: 'goal', entityId: goalId },
          occurredAt,
          previous,
        ));
      },
    );
  }

  async restoreLocalGoal(goal: Goal, occurredAt: string): Promise<void> {
    const { appDatabase } = this.databases();
    const markerId = deletionRecordId('goal', goal.id);
    const previous = await appDatabase.deletionRecords.get(markerId);
    await appDatabase.transaction(
      'rw',
      [appDatabase.goals, appDatabase.deletionRecords],
      async () => {
        await appDatabase.goals.put(structuredClone(goal));
        await appDatabase.deletionRecords.put(createRestoredDeletionRecord(
          { entityType: 'goal', entityId: goal.id },
          occurredAt,
          previous?.deletedAt ?? goal.createdAt,
          previous,
        ));
      },
    );
  }

  async stage(goalId: string): Promise<void> {
    const { appDatabase, cloudDatabase, currentUserId } = this.databases();
    await stageRealGoalsMutationInLocalCloudReplica(
      appDatabase,
      cloudDatabase,
      currentUserId,
      [goalId],
    );
  }

  async putReplicaGoalDirect(goal: Goal): Promise<void> {
    const { cloudDatabase } = this.databases();
    await cloudDatabase.realGoals.put(structuredClone(goal));
  }

  async putLegacyReplicaGoal(goal: Goal): Promise<void> {
    const { cloudDatabase } = this.databases();
    await cloudDatabase.realGoals.put({
      ...structuredClone(goal),
      id: `#${goal.id}`,
    });
  }

  async updateReplicaGoalDirect(
    goalId: string,
    changes: Partial<Goal>,
  ): Promise<void> {
    const { cloudDatabase } = this.databases();
    const updated = await cloudDatabase.realGoals.update(goalId, changes);
    if (updated !== 1) {
      throw new Error('La ligne de sonde same-row est absente du replica.');
    }
  }

  async replicaSnapshotDirect(goalId: string) {
    const { cloudDatabase } = this.databases();
    const [row, goalJournal] = await Promise.all([
      cloudDatabase.realGoals.get(goalId),
      cloudDatabase.table<MutationJournalEntry, number>(
        '$realGoals_mutations',
      ).toArray(),
    ]);
    const persisted = cloudDatabase.cloud.persistedSyncState.value as
      | Record<string, unknown>
      | undefined;
    return {
      clock: this.clock(),
      row: pickGoalFields(row as unknown as Record<string, unknown> | undefined),
      goalJournal: summarizeJournal(goalJournal, 'goal'),
      syncState: persisted
        ? {
            serverRevision:
              persisted.serverRevision === undefined
                ? undefined
                : String(persisted.serverRevision),
            timestamp:
              persisted.timestamp instanceof Date
                ? persisted.timestamp.toISOString()
                : persisted.timestamp,
          }
        : undefined,
    };
  }

  async syncTransport(purpose: 'default' | 'pull' = 'default'): Promise<void> {
    const { cloudDatabase } = this.databases();
    if (purpose === 'pull') {
      await cloudDatabase.cloud.sync({ purpose: 'pull', wait: true });
    } else {
      await cloudDatabase.cloud.sync({ wait: true });
    }
  }

  async establishEqualBaseline() {
    const { appDatabase, cloudDatabase, currentUserId } = this.databases();
    return previewRealGoalSync(appDatabase, cloudDatabase, currentUserId);
  }

  async reconcileInitialCloudBaseline() {
    const { appDatabase, cloudDatabase, currentUserId } = this.databases();
    const prepared = await prepareInitialRealGoalReconciliation(
      appDatabase,
      cloudDatabase,
      currentUserId,
    );
    return applyInitialRealGoalReconciliation(
      appDatabase,
      cloudDatabase,
      currentUserId,
      prepared,
      'use-cloud',
    );
  }

  async runtimeFirstSync(): Promise<void> {
    const { client } = this.databases();
    await client.syncNow();
  }

  async runtimeAnalyze() {
    const { client } = this.databases();
    return client.analyzeRealGoals!();
  }

  async runtimeSynchronize(origin: 'local' | 'cloud' | 'both' | 'unknown') {
    const { appDatabase, cloudDatabase, client, currentUserId } = this.databases();
    if (origin === 'local') {
      const result = await synchronizeRealGoalsToCloud(
        appDatabase,
        cloudDatabase,
        currentUserId,
      );
      await client.syncNow();
      return result;
    }
    if (origin === 'cloud') {
      return synchronizeRealGoalsFromCloud(
        appDatabase,
        cloudDatabase,
        currentUserId,
      );
    }
    return synchronizeRealGoals(appDatabase, cloudDatabase, currentUserId);
  }

  async snapshot(goalId: string) {
    const { appDatabase, cloudDatabase, currentUserId } = this.databases();
    const markerId = deletionRecordId('goal', goalId);
    const [
      appGoal,
      appMarkers,
      replicaGoal,
      replicaMarker,
      goalJournal,
      markerJournal,
      immutableMutations,
      immutableTransportJournal,
      mutationClocks,
      baselines,
    ] = await Promise.all([
      appDatabase.goals.get(goalId),
      appDatabase.deletionRecords.where('entityType').equals('goal').toArray(),
      cloudDatabase.realGoals.get(`#${goalId}`),
      cloudDatabase.realGoalDeletionRecords.get(`#${markerId}`),
      cloudDatabase.table<MutationJournalEntry, number>(
        '$realGoals_mutations',
      ).toArray(),
      cloudDatabase.table<MutationJournalEntry, number>(
        '$realGoalDeletionRecords_mutations',
      ).toArray(),
      cloudDatabase.realGoalMutations.toArray(),
      cloudDatabase.table<MutationJournalEntry, number>(
        '$realGoalMutations_mutations',
      ).toArray(),
      cloudDatabase.realGoalMutationClocks.toArray(),
      cloudDatabase.realSyncBaselines.toArray(),
    ]);
    const resolvedJournal = resolveRealGoalMutationJournal(
      immutableMutations,
      currentUserId,
    );
    const journalWinner = resolvedJournal.winners.get(goalId);
    const persisted = cloudDatabase.cloud.persistedSyncState.value as
      | Record<string, unknown>
      | undefined;
    return {
      device: this.device,
      currentUserId,
      clock: this.clock(),
      appGoal: pickGoalFields(appGoal as unknown as Record<string, unknown> | undefined),
      appMarkers: appMarkers.map((marker) =>
        pickMarkerFields(marker as unknown as Record<string, unknown>)),
      replicaGoal: pickGoalFields(
        (journalWinner?.goal ?? replicaGoal) as unknown as
          | Record<string, unknown>
          | undefined,
      ),
      replicaProjectionGoal: pickGoalFields(
        replicaGoal as unknown as Record<string, unknown> | undefined,
      ),
      replicaMarker: pickMarkerFields(
        (journalWinner?.marker ?? replicaMarker) as unknown as
          | Record<string, unknown>
          | undefined,
      ),
      replicaProjectionMarker: pickMarkerFields(
        replicaMarker as unknown as Record<string, unknown> | undefined,
      ),
      goalJournal: summarizeJournal(goalJournal, 'goal'),
      markerJournal: summarizeJournal(markerJournal, 'marker'),
      immutableMutations: immutableMutations.map(pickImmutableMutation),
      immutableTransportJournal: immutableTransportJournal.map((entry) => ({
        type: entry.type,
        ts: entry.ts,
        opNo: entry.opNo,
        keys: entry.keys,
        txid: entry.txid,
        userId: entry.userId,
        values: entry.values?.map((value) => ({
          entityId: value.entityId,
          operation: value.operation,
          orderedAtMs: value.orderedAtMs,
          actorId: value.actorId,
          actorSequence: value.actorSequence,
        })),
        changeSpecs: entry.changeSpecs,
      })),
      mutationClocks,
      baselines: baselines.map((baseline) => ({
        id: baseline.id,
        accountUserId: baseline.accountUserId,
        domainId: baseline.domainId,
        entityId: baseline.entityId,
        revision: baseline.revision,
        actorId: baseline.actorId,
        updatedAt: baseline.updatedAt,
      })),
      syncState: persisted
        ? {
            serverRevision:
              persisted.serverRevision === undefined
                ? undefined
                : String(persisted.serverRevision),
            timestamp:
              persisted.timestamp instanceof Date
                ? persisted.timestamp.toISOString()
                : persisted.timestamp,
            clientIdentity: persisted.clientIdentity,
          }
        : undefined,
    };
  }

  async close(): Promise<void> {
    this.appDatabase?.close();
  }
}

declare global {
  interface Window {
    __SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__?: GoalsDexieCloudTestClient;
  }
}

window.__SPORTPILOT_GOALS_DEXIE_CLOUD_TEST__ = new GoalsDexieCloudTestClient();
