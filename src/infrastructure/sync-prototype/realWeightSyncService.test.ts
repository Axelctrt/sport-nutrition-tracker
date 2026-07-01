import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import Dexie, { type Table } from 'dexie';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { WeightEntry } from '@/domain/models/weight';

type CloudWeightEntry = WeightEntry & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};
type CloudDeletionRecord = DeletionRecord & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealWeightSync,
  synchronizeRealWeights,
} from '@/infrastructure/sync-prototype/realWeightSyncService';
import { createDeletedDeletionRecord } from '@/domain/models/deletion';

class TestCloudDatabase extends Dexie {
  declare realWeights: Table<CloudWeightEntry, string>;
  declare realWeightDeletionRecords: Table<CloudDeletionRecord, string>;

  constructor() {
    super(`sportpilot-c4-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realWeights: 'id, date, updatedAt',
      realWeightDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

function createLocalDatabase() {
  return new AppDatabase(`sportpilot-c4-local-${crypto.randomUUID()}`);
}

function createCloudDatabase() {
  return new TestCloudDatabase();
}

describe('synchronisation C4 des vraies pesées', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = createLocalDatabase();
    cloud = createCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  it('importe les pesées locales une seule fois sans doublon', async () => {
    await local.weights.add({
      id: 'weight:2026-06-30',
      date: '2026-06-30',
      weightKg: 70,
      createdAt: '2026-06-30T08:00:00.000Z',
      updatedAt: '2026-06-30T08:00:00.000Z',
    });

    const first = await synchronizeRealWeights(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');
    const second = await synchronizeRealWeights(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(first.uploadedWeights).toBe(1);
    expect(second.uploadedWeights).toBe(0);
    expect(await cloud.realWeights.count()).toBe(1);
    expect(await cloud.realWeights.get('#weight:2026-06-30')).toMatchObject({
      id: '#weight:2026-06-30',
      weightKg: 70,
    });
    expect(await cloud.realWeights.get('weight:2026-06-30')).toBeUndefined();
  });

  it('ignore les métadonnées techniques Dexie Cloud dans la comparaison', async () => {
    const weight: WeightEntry = {
      id: 'weight:cloud-metadata',
      date: '2026-07-01',
      weightKg: 69.8,
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T09:00:00.000Z',
    };
    await local.weights.add(weight);
    await cloud.realWeights.add({
      ...weight,
      id: `#${weight.id}`,
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 1_751_360_400_000,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealWeightSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const result = await synchronizeRealWeights(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
    expect(result.uploadedWeights).toBe(0);
    expect(result.downloadedWeights).toBe(0);
  });

  it('restaure une pesée distante plus récente dans la base réelle', async () => {
    await cloud.realWeights.add({
      id: '#weight:2026-07-01',
      date: '2026-07-01',
      weightKg: 69.5,
      note: 'Téléphone',
      createdAt: '2026-07-01T07:00:00.000Z',
      updatedAt: '2026-07-01T09:00:00.000Z',
    });

    const result = await synchronizeRealWeights(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(result.downloadedWeights).toBe(1);
    expect(await local.weights.get('weight:2026-07-01')).toMatchObject({
      weightKg: 69.5,
      note: 'Téléphone',
    });
  });

  it('fait gagner la version la plus récente et converge au second passage', async () => {
    await local.weights.add({
      id: 'weight:2026-07-02',
      date: '2026-07-02',
      weightKg: 69,
      createdAt: '2026-07-02T07:00:00.000Z',
      updatedAt: '2026-07-02T10:00:00.000Z',
    });
    await cloud.realWeights.add({
      id: '#weight:2026-07-02',
      date: '2026-07-02',
      weightKg: 70,
      createdAt: '2026-07-02T07:00:00.000Z',
      updatedAt: '2026-07-02T09:00:00.000Z',
    });

    await synchronizeRealWeights(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');
    const second = await synchronizeRealWeights(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect((await cloud.realWeights.get('#weight:2026-07-02'))?.weightKg).toBe(69);
    expect(second.differingEntityCount).toBe(0);
  });

  it('propage une suppression plus récente sans résurrection', async () => {
    const weight = {
      id: 'weight:2026-07-03',
      date: '2026-07-03',
      weightKg: 68.8,
      createdAt: '2026-07-03T07:00:00.000Z',
      updatedAt: '2026-07-03T08:00:00.000Z',
    };
    await cloud.realWeights.add({ ...weight, id: `#${weight.id}` });
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'weight', entityId: weight.id },
        '2026-07-03T10:00:00.000Z',
      ),
    );

    const result = await synchronizeRealWeights(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(result.removedCloudWeights).toBe(1);
    expect(await cloud.realWeights.get(`#${weight.id}`)).toBeUndefined();
    expect(
      await cloud.realWeightDeletionRecords.get(
        `#deletion:weight:${weight.id}`,
      ),
    ).toMatchObject({ status: 'deleted' });
  });

  it('analyse sans écrire', async () => {
    await local.weights.add({
      id: 'weight:2026-07-04',
      date: '2026-07-04',
      weightKg: 68.5,
      createdAt: '2026-07-04T07:00:00.000Z',
      updatedAt: '2026-07-04T07:00:00.000Z',
    });

    const preview = await previewRealWeightSync(local, cloud as unknown as SyncPrototypeDatabase, 'user-1');

    expect(preview).toMatchObject({
      localWeightCount: 1,
      cloudWeightCount: 0,
      differingEntityCount: 1,
    });
    expect(await cloud.realWeights.count()).toBe(0);
  });
});
