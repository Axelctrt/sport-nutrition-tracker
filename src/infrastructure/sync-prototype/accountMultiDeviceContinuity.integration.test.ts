import Dexie, { type Table } from 'dexie';

import {
  createSyncOrchestrator,
  type SyncOrchestrator,
} from '@/application/sync/syncOrchestrator';
import {
  createSyncOrchestratorDomains,
} from '@/application/sync/syncOrchestratorAdapters';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import type {
  ExerciseDefinition,
  StrengthSet,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealStrengthSync,
  synchronizeRealStrength,
  synchronizeRealStrengthFromCloud,
  synchronizeRealStrengthToCloud,
  type RealStrengthSyncPreview,
  type StrengthExerciseAggregate,
  type WorkoutSessionAggregate,
  type WorkoutTemplateAggregate,
} from '@/infrastructure/sync-prototype/realStrengthSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

const ACCOUNT_USER_ID = 'user-p0-s5';
const CREATED_AT = '2026-08-16T08:00:00.000Z';
const CHANGED_AT = '2026-08-16T09:00:00.000Z';
const DELETED_AT = '2026-08-16T10:00:00.000Z';

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};

type CloudExercise = StrengthExerciseAggregate & CloudMetadata;
type CloudTemplate = WorkoutTemplateAggregate & CloudMetadata;
type CloudSession = WorkoutSessionAggregate & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudReplica extends Dexie {
  declare realStrengthExercises: Table<CloudExercise, string>;
  declare realWorkoutTemplates: Table<CloudTemplate, string>;
  declare realWorkoutSessions: Table<CloudSession, string>;
  declare realStrengthDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor(label: string) {
    super(`sportpilot-p0-s5-cloud-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realStrengthExercises: 'id, updatedAt',
      realWorkoutTemplates: 'id, updatedAt',
      realWorkoutSessions: 'id, updatedAt',
      realStrengthDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
      realSyncBaselines: 'id, accountUserId, domainId, entityId',
    });
  }
}

function customExercise(id: string): ExerciseDefinition {
  return {
    id,
    name: 'Développé incliné S5',
    primaryMuscleGroup: 'pectorals',
    secondaryMuscleGroups: ['triceps'],
    equipment: 'dumbbells',
    category: 'strength',
    movementType: 'compound',
    loadUnit: 'kg',
    source: 'user',
    isArchived: false,
    createdAt: CREATED_AT,
    updatedAt: CHANGED_AT,
  };
}

function template(id: string): WorkoutTemplate {
  return {
    id,
    name: 'Push multi-appareils S5',
    isArchived: false,
    createdAt: CREATED_AT,
    updatedAt: CHANGED_AT,
  };
}

function templateExercise(
  id: string,
  templateId: string,
  exerciseDefinitionId: string,
): WorkoutTemplateExercise {
  return {
    id,
    templateId,
    exerciseDefinitionId,
    sortOrder: 0,
    plannedSets: 3,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 30,
    loadIncrementKg: 2,
    restSeconds: 90,
    isActive: true,
    createdAt: CREATED_AT,
    updatedAt: CHANGED_AT,
  };
}

function session(id: string): WorkoutSession {
  return {
    id,
    date: '2026-08-16',
    status: 'completed',
    startedAt: '2026-08-16T17:00:00.000Z',
    completedAt: '2026-08-16T18:00:00.000Z',
    durationMinutes: 60,
    createdAt: CREATED_AT,
    updatedAt: CHANGED_AT,
  };
}

function sessionExercise(
  id: string,
  sessionId: string,
  exerciseDefinitionId: string,
): WorkoutSessionExercise {
  return {
    id,
    sessionId,
    exerciseDefinitionId,
    exerciseNameSnapshot: 'Développé incliné S5',
    sortOrder: 0,
    plannedSets: 3,
    minRepetitions: 8,
    maxRepetitions: 12,
    targetLoadKg: 30,
    loadIncrementKg: 2,
    restSeconds: 90,
    loadUnitSnapshot: 'kg',
    createdAt: CREATED_AT,
    updatedAt: CHANGED_AT,
  };
}

function strengthSet(
  id: string,
  sessionId: string,
  sessionExerciseId: string,
): StrengthSet {
  return {
    id,
    sessionId,
    sessionExerciseId,
    setNumber: 1,
    repetitions: 10,
    weightKg: 30,
    type: 'working',
    isCompleted: true,
    completedAt: CHANGED_AT,
    createdAt: CREATED_AT,
    updatedAt: CHANGED_AT,
  };
}

async function replicateStrengthCloud(
  source: TestCloudReplica,
  target: TestCloudReplica,
): Promise<void> {
  const [exercises, templates, sessions, markers] = await Promise.all([
    source.realStrengthExercises.toArray(),
    source.realWorkoutTemplates.toArray(),
    source.realWorkoutSessions.toArray(),
    source.realStrengthDeletionRecords.toArray(),
  ]);

  await target.transaction(
    'rw',
    target.realStrengthExercises,
    target.realWorkoutTemplates,
    target.realWorkoutSessions,
    target.realStrengthDeletionRecords,
    async () => {
      await target.realStrengthExercises.clear();
      await target.realWorkoutTemplates.clear();
      await target.realWorkoutSessions.clear();
      await target.realStrengthDeletionRecords.clear();
      if (exercises.length > 0) await target.realStrengthExercises.bulkPut(exercises);
      if (templates.length > 0) await target.realWorkoutTemplates.bulkPut(templates);
      if (sessions.length > 0) await target.realWorkoutSessions.bulkPut(sessions);
      if (markers.length > 0) await target.realStrengthDeletionRecords.bulkPut(markers);
    },
  );
}

async function establishEmptyReplicaBaseline(
  local: AppDatabase,
  cloud: TestCloudReplica,
): Promise<void> {
  // Précondition historique uniquement : les deux appareils ont déjà observé
  // le même état vide. Le scénario A→B ci-dessous n'utilise ensuite que les
  // primitives directionnelles S1/S2 réellement routées par l'automatisation.
  await synchronizeRealStrength(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    ACCOUNT_USER_ID,
  );
  expect(await cloud.realSyncBaselines.count()).toBe(1);
}

function createDirectionalHarness(
  local: AppDatabase,
  cloud: TestCloudReplica,
): {
  readonly orchestrator: SyncOrchestrator;
  readonly bidirectionalFallback: ReturnType<typeof vi.fn>;
} {
  let preview: RealStrengthSyncPreview | undefined;
  const refreshPreview = async () => {
    preview = await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );
    return preview;
  };
  const bidirectionalFallback = vi.fn(async () => {
    throw new Error('Le scénario S5 ne doit jamais utiliser le fallback bidirectionnel.');
  });

  const client = {
    getSnapshot: () => ({
      realStrength: {
        enabled: true,
        status: 'ready',
        ...(preview ? { preview } : {}),
      },
    }) as unknown as SyncPrototypeSnapshot,
    analyzeRealStrength: refreshPreview,
    syncRealStrength: bidirectionalFallback,
    syncRealStrengthToCloud: async () => {
      const result = await synchronizeRealStrengthToCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      );
      await refreshPreview();
      return result;
    },
    syncRealStrengthFromCloud: async () => {
      const result = await synchronizeRealStrengthFromCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      );
      await refreshPreview();
      return result;
    },
  } as unknown as SyncPrototypeClient;

  return {
    orchestrator: createSyncOrchestrator({
      accountKey: ACCOUNT_USER_ID,
      domains: createSyncOrchestratorDomains(client),
      isOnline: () => true,
      defaultDebounceMs: 0,
    }),
    bidirectionalFallback,
  };
}

async function expectStrengthAggregateIntegrity(
  database: AppDatabase,
  expected: {
    readonly exercise: ExerciseDefinition;
    readonly template: WorkoutTemplate;
    readonly templateExercise: WorkoutTemplateExercise;
    readonly session: WorkoutSession;
    readonly sessionExercise: WorkoutSessionExercise;
    readonly set: StrengthSet;
  },
): Promise<void> {
  expect(await database.exerciseDefinitions.get(expected.exercise.id)).toEqual(
    expected.exercise,
  );
  expect(await database.workoutTemplates.get(expected.template.id)).toEqual(
    expected.template,
  );
  expect(
    await database.workoutTemplateExercises
      .where('templateId')
      .equals(expected.template.id)
      .toArray(),
  ).toEqual([expected.templateExercise]);
  expect(await database.workoutSessions.get(expected.session.id)).toEqual(
    expected.session,
  );
  expect(
    await database.workoutSessionExercises
      .where('sessionId')
      .equals(expected.session.id)
      .toArray(),
  ).toEqual([expected.sessionExercise]);
  expect(
    await database.strengthSets
      .where('sessionId')
      .equals(expected.session.id)
      .toArray(),
  ).toEqual([expected.set]);

  expect(expected.templateExercise.templateId).toBe(expected.template.id);
  expect(expected.templateExercise.exerciseDefinitionId).toBe(expected.exercise.id);
  expect(expected.sessionExercise.sessionId).toBe(expected.session.id);
  expect(expected.sessionExercise.exerciseDefinitionId).toBe(expected.exercise.id);
  expect(expected.set.sessionId).toBe(expected.session.id);
  expect(expected.set.sessionExerciseId).toBe(expected.sessionExercise.id);
}

describe('P0 S5 — continuité multi-appareils directionnelle', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudReplica;
  let cloudB: TestCloudReplica;

  beforeEach(async () => {
    localA = new AppDatabase(`sportpilot-p0-s5-local-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`sportpilot-p0-s5-local-b-${crypto.randomUUID()}`);
    cloudA = new TestCloudReplica('a');
    cloudB = new TestCloudReplica('b');
    await Promise.all([
      localA.open(),
      localB.open(),
      cloudA.open(),
      cloudB.open(),
    ]);
    await establishEmptyReplicaBaseline(localA, cloudA);
    await establishEmptyReplicaBaseline(localB, cloudB);
  });

  afterEach(async () => {
    const databases = [localA, localB, cloudA, cloudB];
    const names = databases.map((database) => database.name);
    for (const database of databases) database.close();
    for (const name of names) await Dexie.delete(name);
  });

  it('fait converger A vers B via local-only puis cloud-only, avec suppression et idempotence', async () => {
    const exercise = customExercise('exercise-s5');
    const workoutTemplate = template('template-s5');
    const workoutTemplateExercise = templateExercise(
      'template-exercise-s5',
      workoutTemplate.id,
      exercise.id,
    );
    const workoutSession = session('session-s5');
    const workoutSessionExercise = sessionExercise(
      'session-exercise-s5',
      workoutSession.id,
      exercise.id,
    );
    const set = strengthSet(
      'set-s5',
      workoutSession.id,
      workoutSessionExercise.id,
    );
    const aggregate = {
      exercise,
      template: workoutTemplate,
      templateExercise: workoutTemplateExercise,
      session: workoutSession,
      sessionExercise: workoutSessionExercise,
      set,
    };

    await localA.exerciseDefinitions.add(exercise);
    await localA.workoutTemplates.add(workoutTemplate);
    await localA.workoutTemplateExercises.add(workoutTemplateExercise);
    await localA.workoutSessions.add(workoutSession);
    await localA.workoutSessionExercises.add(workoutSessionExercise);
    await localA.strengthSets.add(set);

    const deviceA = createDirectionalHarness(localA, cloudA);
    const analyzeA = await deviceA.orchestrator.run({
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['strength'],
    });
    expect(analyzeA.domainResults).toEqual([
      expect.objectContaining({
        domainId: 'strength',
        status: 'local-changes-pending',
        changeOrigin: 'local',
      }),
    ]);

    await deviceA.orchestrator.run({
      operation: 'sync',
      source: 'local-change',
      domainIds: ['strength'],
      syncMode: 'local-only',
    });
    expect(deviceA.bidirectionalFallback).not.toHaveBeenCalled();

    expect(await cloudA.realStrengthExercises.get(`#${exercise.id}`)).toMatchObject({
      exercise,
    });
    expect(await cloudA.realWorkoutTemplates.get(`#${workoutTemplate.id}`)).toMatchObject({
      template: workoutTemplate,
      exercises: [workoutTemplateExercise],
    });
    expect(await cloudA.realWorkoutSessions.get(`#${workoutSession.id}`)).toMatchObject({
      session: workoutSession,
      exercises: [workoutSessionExercise],
      sets: [set],
    });

    // Le transport cloud réplique les données métier, jamais realSyncBaselines :
    // cette table est locale à chaque appareil dans Dexie Cloud.
    await replicateStrengthCloud(cloudA, cloudB);
    expect(await cloudB.realSyncBaselines.count()).toBe(1);

    const deviceB = createDirectionalHarness(localB, cloudB);
    const analyzeB = await deviceB.orchestrator.run({
      operation: 'analyze',
      source: 'network-restored',
      domainIds: ['strength'],
    });
    expect(analyzeB.domainResults).toEqual([
      expect.objectContaining({
        domainId: 'strength',
        status: 'cloud-changes-available',
        changeOrigin: 'cloud',
      }),
    ]);

    await deviceB.orchestrator.run({
      operation: 'sync',
      source: 'network-restored',
      domainIds: ['strength'],
      syncMode: 'cloud-only',
    });
    expect(deviceB.bidirectionalFallback).not.toHaveBeenCalled();
    await expectStrengthAggregateIntegrity(localB, aggregate);

    expect((await previewRealStrengthSync(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).differingEntityCount).toBe(0);

    const beforeIdempotentDownload = {
      templates: await localB.workoutTemplateExercises.toArray(),
      sessions: await localB.workoutSessionExercises.toArray(),
      sets: await localB.strengthSets.toArray(),
    };
    await deviceB.orchestrator.run({
      operation: 'sync',
      source: 'foreground',
      domainIds: ['strength'],
      syncMode: 'cloud-only',
    });
    expect(await localB.workoutTemplateExercises.toArray()).toEqual(
      beforeIdempotentDownload.templates,
    );
    expect(await localB.workoutSessionExercises.toArray()).toEqual(
      beforeIdempotentDownload.sessions,
    );
    expect(await localB.strengthSets.toArray()).toEqual(
      beforeIdempotentDownload.sets,
    );

    await localA.strengthSets.delete(set.id);
    const deletion = createDeletedDeletionRecord(
      { entityType: 'strengthSet', entityId: set.id },
      DELETED_AT,
    );
    await localA.deletionRecords.put(deletion);

    const analyzeDeletionA = await deviceA.orchestrator.run({
      operation: 'analyze',
      source: 'local-change',
      domainIds: ['strength'],
    });
    expect(analyzeDeletionA.domainResults).toEqual([
      expect.objectContaining({
        status: 'local-changes-pending',
        changeOrigin: 'local',
      }),
    ]);

    await deviceA.orchestrator.run({
      operation: 'sync',
      source: 'local-change',
      domainIds: ['strength'],
      syncMode: 'local-only',
    });
    expect(deviceA.bidirectionalFallback).not.toHaveBeenCalled();
    expect((await cloudA.realWorkoutSessions.get(`#${workoutSession.id}`))?.sets)
      .toEqual([]);
    expect(await cloudA.realStrengthDeletionRecords.get(`#${deletion.id}`))
      .toBeDefined();

    await replicateStrengthCloud(cloudA, cloudB);
    const analyzeDeletionB = await deviceB.orchestrator.run({
      operation: 'analyze',
      source: 'network-restored',
      domainIds: ['strength'],
    });
    expect(analyzeDeletionB.domainResults).toEqual([
      expect.objectContaining({
        status: 'cloud-changes-available',
        changeOrigin: 'cloud',
      }),
    ]);

    await deviceB.orchestrator.run({
      operation: 'sync',
      source: 'network-restored',
      domainIds: ['strength'],
      syncMode: 'cloud-only',
    });
    expect(deviceB.bidirectionalFallback).not.toHaveBeenCalled();
    expect(await localB.strengthSets.get(set.id)).toBeUndefined();
    expect(await localB.deletionRecords.get(deletion.id)).toMatchObject({
      entityType: 'strengthSet',
      entityId: set.id,
      status: 'deleted',
    });
    expect(
      (await localB.deletionRecords.toArray()).filter(
        (record) =>
          record.entityType === 'strengthSet' && record.entityId === set.id,
      ),
    ).toHaveLength(1);

    const cloudAfterDeletion = {
      sessions: await cloudA.realWorkoutSessions.toArray(),
      markers: await cloudA.realStrengthDeletionRecords.toArray(),
    };
    await deviceA.orchestrator.run({
      operation: 'sync',
      source: 'foreground',
      domainIds: ['strength'],
      syncMode: 'local-only',
    });
    await deviceB.orchestrator.run({
      operation: 'sync',
      source: 'foreground',
      domainIds: ['strength'],
      syncMode: 'cloud-only',
    });

    expect(await cloudA.realWorkoutSessions.toArray()).toEqual(
      cloudAfterDeletion.sessions,
    );
    expect(await cloudA.realStrengthDeletionRecords.toArray()).toEqual(
      cloudAfterDeletion.markers,
    );
    expect((await cloudA.realWorkoutSessions.get(`#${workoutSession.id}`))?.sets)
      .toEqual([]);
    expect(await localB.strengthSets.get(set.id)).toBeUndefined();
    expect((await previewRealStrengthSync(
      localA,
      cloudA as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).differingEntityCount).toBe(0);
    expect((await previewRealStrengthSync(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).differingEntityCount).toBe(0);

    deviceA.orchestrator.dispose();
    deviceB.orchestrator.dispose();
  });
});
