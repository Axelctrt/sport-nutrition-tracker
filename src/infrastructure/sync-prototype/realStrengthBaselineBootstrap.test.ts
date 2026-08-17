import Dexie, { type Table } from 'dexie';
import {
  AutomaticSyncController,
} from '@/application/sync/automaticSyncController';
import {
  createSyncOrchestrator,
  type SyncOrchestrator,
} from '@/application/sync/syncOrchestrator';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { AppSettings } from '@/domain/models/settings';
import type { ExerciseDefinition } from '@/domain/models/strength';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SettingsRepository } from '@/infrastructure/repositories/contracts/SettingsRepository';
import { DexieWorkoutSessionRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutSessionRepository';
import { DexieWorkoutTemplateRepository } from '@/infrastructure/repositories/dexie/DexieWorkoutTemplateRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import type {
  LogicalSyncBaseline,
  LogicalSyncFields,
} from '@/infrastructure/sync-prototype/logicalSyncState';
import {
  previewRealStrengthSync,
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
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import type { DeletionRecord } from '@/domain/models/deletion';

const ACCOUNT_USER_ID = 'user-strength-bootstrap';
const CREATED_AT = '2026-08-17T08:00:00.000Z';
const CHANGED_AT = '2026-08-17T09:00:00.000Z';

type CloudMetadata = LogicalSyncFields & {
  owner?: string;
  realmId?: string;
};
type CloudExercise = StrengthExerciseAggregate & CloudMetadata;
type CloudTemplate = WorkoutTemplateAggregate & CloudMetadata;
type CloudSession = WorkoutSessionAggregate & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realStrengthExercises: Table<CloudExercise, string>;
  declare realWorkoutTemplates: Table<CloudTemplate, string>;
  declare realWorkoutSessions: Table<CloudSession, string>;
  declare realStrengthDeletionRecords: Table<CloudMarker, string>;
  declare realSyncBaselines: Table<LogicalSyncBaseline, string>;

  constructor(label = 'cloud') {
    super(`sportpilot-strength-bootstrap-${label}-${crypto.randomUUID()}`);
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

function customExercise(id: string, name = 'Exercice local'): ExerciseDefinition {
  return {
    id,
    name,
    primaryMuscleGroup: 'pectorals',
    secondaryMuscleGroups: [],
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

function exerciseAggregate(value: ExerciseDefinition): StrengthExerciseAggregate {
  return { id: value.id, exercise: value, updatedAt: value.updatedAt };
}

function snapshotBusinessState(local: AppDatabase, cloud: TestCloudDatabase) {
  return Promise.all([
    local.exerciseDefinitions.toArray(),
    local.workoutTemplates.toArray(),
    local.workoutTemplateExercises.toArray(),
    local.workoutSessions.toArray(),
    local.workoutSessionExercises.toArray(),
    local.strengthSets.toArray(),
    local.deletionRecords.toArray(),
    cloud.realStrengthExercises.toArray(),
    cloud.realWorkoutTemplates.toArray(),
    cloud.realWorkoutSessions.toArray(),
    cloud.realStrengthDeletionRecords.toArray(),
  ]);
}

async function bootstrap(local: AppDatabase, cloud: TestCloudDatabase, userId = ACCOUNT_USER_ID) {
  const preview = await previewRealStrengthSync(
    local,
    cloud as unknown as SyncPrototypeDatabase,
    userId,
  );
  expect(preview.differingEntityCount).toBe(0);
  return preview;
}

function createSettingsRepository(userId = ACCOUNT_USER_ID): SettingsRepository {
  const settings: AppSettings = {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: true,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticAccountSyncAccountFingerprint:
      createSyncPrototypeAccountFingerprint(userId)!,
  };
  return {
    get: vi.fn(async () => settings),
    update: vi.fn(async (changes) => Object.assign(settings, changes)),
    reset: vi.fn(async () => settings),
  };
}

function createControllerClient(userId = ACCOUNT_USER_ID): SyncPrototypeClient {
  const snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    initialize: async () => undefined,
  } as unknown as SyncPrototypeClient;
}

function createStrengthOrchestrator(
  local: AppDatabase,
  cloud: TestCloudDatabase,
  userId = ACCOUNT_USER_ID,
): SyncOrchestrator {
  let preview: RealStrengthSyncPreview | undefined;
  const analyze = async () => {
    preview = await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      userId,
    );
    return preview;
  };
  return createSyncOrchestrator({
    accountKey: userId,
    isOnline: () => true,
    defaultDebounceMs: 0,
    domains: [{
      id: 'strength',
      analyze,
      synchronize: async (mode) => {
        if (mode === 'local-only') {
          await synchronizeRealStrengthToCloud(
            local,
            cloud as unknown as SyncPrototypeDatabase,
            userId,
          );
        } else if (mode === 'cloud-only') {
          await synchronizeRealStrengthFromCloud(
            local,
            cloud as unknown as SyncPrototypeDatabase,
            userId,
          );
        } else {
          throw new Error('Le gate P0 interdit le fallback bidirectionnel.');
        }
        await analyze();
      },
      readPreview: () => preview,
    }],
  });
}

async function replicateBusinessCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const [exercises, templates, sessions, markers] = await Promise.all([
    source.realStrengthExercises.toArray(),
    source.realWorkoutTemplates.toArray(),
    source.realWorkoutSessions.toArray(),
    source.realStrengthDeletionRecords.toArray(),
  ]);
  await target.transaction(
    'rw',
    [
      target.realStrengthExercises,
      target.realWorkoutTemplates,
      target.realWorkoutSessions,
      target.realStrengthDeletionRecords,
    ],
    async () => {
      await Promise.all([
        target.realStrengthExercises.clear(),
        target.realWorkoutTemplates.clear(),
        target.realWorkoutSessions.clear(),
        target.realStrengthDeletionRecords.clear(),
      ]);
      if (exercises.length) await target.realStrengthExercises.bulkPut(exercises);
      if (templates.length) await target.realWorkoutTemplates.bulkPut(templates);
      if (sessions.length) await target.realWorkoutSessions.bulkPut(sessions);
      if (markers.length) await target.realStrengthDeletionRecords.bulkPut(markers);
    },
  );
}

describe('P0 Strength — bootstrap de baseline par analyse', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-strength-bootstrap-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await Promise.all([local.open(), cloud.open()]);
  });

  afterEach(async () => {
    const names = [local.name, cloud.name];
    local.close();
    cloud.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('1. crée une baseline device-local sur un état exactement égal sans muter les données métier', async () => {
    const before = await snapshotBusinessState(local, cloud);

    await bootstrap(local, cloud);

    expect(await snapshotBusinessState(local, cloud)).toEqual(before);
    expect(await cloud.realSyncBaselines.toArray()).toEqual([
      expect.objectContaining({
        accountUserId: ACCOUNT_USER_ID,
        domainId: 'strength',
        entityId: 'strength',
      }),
    ]);
  });

  it('2. est idempotent quand la même égalité est analysée plusieurs fois', async () => {
    await bootstrap(local, cloud);
    const first = await cloud.realSyncBaselines.toArray();

    await bootstrap(local, cloud);

    expect(await cloud.realSyncBaselines.toArray()).toEqual(first);
  });

  it('3. classe local un premier changement local après bootstrap', async () => {
    await bootstrap(local, cloud);
    await local.exerciseDefinitions.add(customExercise('local-origin'));

    expect(await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'local' });
  });

  it('4. autorise ensuite uniquement l’upload local-only', async () => {
    await bootstrap(local, cloud);
    const exercise = customExercise('local-upload');
    await local.exerciseDefinitions.add(exercise);

    const result = await synchronizeRealStrengthToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result).toMatchObject({ uploadedExercises: 1, downloadedExercises: 0 });
    expect(await cloud.realStrengthExercises.get(`#${exercise.id}`)).toBeDefined();
    expect(await local.exerciseDefinitions.get(exercise.id)).toEqual(exercise);
  });

  it('5. classe cloud un premier changement distant après bootstrap', async () => {
    await bootstrap(local, cloud);
    const exercise = customExercise('cloud-origin');
    await cloud.realStrengthExercises.add({
      ...exerciseAggregate(exercise),
      id: `#${exercise.id}`,
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });

    expect(await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'cloud' });
  });

  it('6. autorise ensuite uniquement le téléchargement cloud-only', async () => {
    await bootstrap(local, cloud);
    const exercise = customExercise('cloud-download');
    await cloud.realStrengthExercises.add({
      ...exerciseAggregate(exercise),
      id: `#${exercise.id}`,
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });

    const result = await synchronizeRealStrengthFromCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    );

    expect(result).toMatchObject({ uploadedExercises: 0, downloadedExercises: 1 });
    expect(await local.exerciseDefinitions.get(exercise.id)).toEqual(exercise);
  });

  it('7. conserve both fail-closed en cas de modifications concurrentes', async () => {
    await bootstrap(local, cloud);
    const localExercise = customExercise('concurrent-local');
    const cloudExercise = customExercise('concurrent-cloud');
    await local.exerciseDefinitions.add(localExercise);
    await cloud.realStrengthExercises.add({
      ...exerciseAggregate(cloudExercise),
      id: `#${cloudExercise.id}`,
      owner: ACCOUNT_USER_ID,
      syncRevision: 2,
      syncActorId: 'device-b',
    });
    expect(await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ changeOrigin: 'both' });
    const before = await snapshotBusinessState(local, cloud);

    const [upload, download] = await Promise.all([
      synchronizeRealStrengthToCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      ),
      synchronizeRealStrengthFromCloud(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      ),
    ]);

    expect(upload.uploadedExercises).toBe(0);
    expect(download.downloadedExercises).toBe(0);
    expect(await snapshotBusinessState(local, cloud)).toEqual(before);
  });

  it('8. garde unknown sans baseline si les états sont déjà divergents et ne crée aucune baseline', async () => {
    await local.exerciseDefinitions.add(customExercise('already-divergent'));

    expect(await previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).toMatchObject({ differingEntityCount: 1, changeOrigin: 'unknown' });
    expect(await cloud.realSyncBaselines.count()).toBe(0);
    expect((await synchronizeRealStrengthToCloud(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).uploadedExercises).toBe(0);
  });

  it('9. isole les baselines par compte', async () => {
    await bootstrap(local, cloud, 'account-a');
    await bootstrap(local, cloud, 'account-b');

    expect((await cloud.realSyncBaselines.toArray())
      .map((baseline) => baseline.accountUserId)
      .sort()).toEqual(['account-a', 'account-b']);
  });

  it('10. n’écrit que la baseline Strength et préserve les autres domaines', async () => {
    const foreign: LogicalSyncBaseline = {
      id: `${ACCOUNT_USER_ID}:goals:goal-1`,
      accountUserId: ACCOUNT_USER_ID,
      domainId: 'goals',
      entityId: 'goal-1',
      localDigest: 'local',
      cloudDigest: 'cloud',
      revision: 1,
      actorId: 'device-x',
      updatedAt: CREATED_AT,
    };
    await cloud.realSyncBaselines.add(foreign);

    await bootstrap(local, cloud);

    const baselines = await cloud.realSyncBaselines.toArray();
    expect(baselines).toContainEqual(foreign);
    expect(baselines.filter((value) => value.domainId === 'strength')).toHaveLength(1);
    expect(baselines).toHaveLength(2);
  });

  it('11. ne bootstrappe rien si l’analyse cloud échoue', async () => {
    vi.spyOn(cloud.realWorkoutSessions, 'toArray')
      .mockRejectedValueOnce(new Error('cloud indisponible'));

    await expect(previewRealStrengthSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      ACCOUNT_USER_ID,
    )).rejects.toThrow('cloud indisponible');
    expect(await cloud.realSyncBaselines.count()).toBe(0);
  });

  it('12. gate applicatif : analyze bootstrap → repositories A → controller local-only → cloud → controller B cloud-only', async () => {
    const localA = new AppDatabase(`sportpilot-strength-gate-a-${crypto.randomUUID()}`);
    const localB = new AppDatabase(`sportpilot-strength-gate-b-${crypto.randomUUID()}`);
    const cloudA = new TestCloudDatabase('a');
    const cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);

    const orchestratorA = createStrengthOrchestrator(localA, cloudA);
    const orchestratorB = createStrengthOrchestrator(localB, cloudB);
    const controllerA = new AutomaticSyncController({
      client: createControllerClient(),
      settingsRepository: createSettingsRepository(),
      eventTarget: window,
      visibilityTarget: document,
      isVisible: () => true,
      isOnline: () => true,
      createOrchestrator: () => orchestratorA,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });
    const controllerB = new AutomaticSyncController({
      client: createControllerClient(),
      settingsRepository: createSettingsRepository(),
      eventTarget: window,
      visibilityTarget: document,
      isVisible: () => true,
      isOnline: () => true,
      createOrchestrator: () => orchestratorB,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
      foregroundMinimumIntervalMs: 0,
    });

    try {
      await controllerA.initialize();
      await controllerB.initialize();
      expect(await cloudA.realSyncBaselines.count()).toBe(1);
      expect(await cloudB.realSyncBaselines.count()).toBe(1);

      const templateRepository = new DexieWorkoutTemplateRepository(localA);
      const sessionRepository = new DexieWorkoutSessionRepository(localA);
      const createdTemplate = await templateRepository.createWithExercises({
        name: 'Push P0 bootstrap',
        isArchived: false,
      }, []);
      const createdSession = await sessionRepository.createWithExercises({
        date: '2026-08-17',
        status: 'completed',
        startedAt: '2026-08-17T17:00:00.000Z',
        completedAt: '2026-08-17T18:00:00.000Z',
        durationMinutes: 60,
      }, []);

      await vi.waitFor(async () => {
        expect(await cloudA.realWorkoutTemplates.count()).toBe(1);
        expect(await cloudA.realWorkoutSessions.count()).toBe(1);
      });
      expect(await previewRealStrengthSync(
        localA,
        cloudA as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      )).toMatchObject({ differingEntityCount: 0 });

      await replicateBusinessCloud(cloudA, cloudB);
      window.dispatchEvent(new Event('focus'));

      await vi.waitFor(async () => {
        expect(await localB.workoutTemplates.get(createdTemplate.template.id))
          .toEqual(createdTemplate.template);
        expect(await localB.workoutSessions.get(createdSession.session.id))
          .toEqual(createdSession.session);
      });
      expect(await previewRealStrengthSync(
        localB,
        cloudB as unknown as SyncPrototypeDatabase,
        ACCOUNT_USER_ID,
      )).toMatchObject({ differingEntityCount: 0 });
    } finally {
      controllerA.dispose();
      controllerB.dispose();
      orchestratorA.dispose();
      orchestratorB.dispose();
      const databases = [localA, localB, cloudA, cloudB];
      const names = databases.map((database) => database.name);
      databases.forEach((database) => database.close());
      await Promise.all(names.map((name) => Dexie.delete(name)));
    }
  });
});
