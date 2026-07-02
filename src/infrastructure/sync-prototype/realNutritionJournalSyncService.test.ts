import Dexie, { type Table } from 'dexie';
import type { DailyJournalStatus, FoodEntry, Meal } from '@/domain/models/food';
import type { DailyTarget } from '@/domain/models/targets';
import {
  createDeletedDeletionRecord,
  type DeletionRecord,
} from '@/domain/models/deletion';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieTargetRepository } from '@/infrastructure/repositories/dexie/DexieTargetRepository';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealNutritionJournalSync,
  synchronizeRealNutritionJournal,
  type NutritionJournalDayAggregate,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';

type CloudMetadata = {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
};
type CloudDay = NutritionJournalDayAggregate & CloudMetadata;
type CloudMarker = DeletionRecord & CloudMetadata;

class TestCloudDatabase extends Dexie {
  declare realNutritionJournalDays: Table<CloudDay, string>;
  declare realNutritionJournalDeletionRecords: Table<CloudMarker, string>;

  constructor() {
    super(`sportpilot-c1-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      realNutritionJournalDays: 'id, date, updatedAt',
      realNutritionJournalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

const createdAt = '2026-07-01T08:00:00.000Z';

function meal(updatedAt = '2026-07-01T09:00:00.000Z'): Meal {
  return {
    id: 'meal:2026-07-01:lunch',
    date: '2026-07-01',
    slot: 'lunch',
    createdAt,
    updatedAt,
  };
}

function entry(updatedAt = '2026-07-01T09:05:00.000Z'): FoodEntry {
  return {
    id: 'entry-1',
    date: '2026-07-01',
    mealId: 'meal:2026-07-01:lunch',
    mealSlot: 'lunch',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: 'product-1',
      inputMode: 'amount',
      inputQuantity: 100,
      normalizedAmount: 100,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: {
        caloriesKcal: 120,
        proteinGrams: 10,
        carbohydratesGrams: 12,
        fatGrams: 3,
      },
    },
    createdAt,
    updatedAt,
  };
}

function target(updatedAt = '2026-07-01T09:10:00.000Z'): DailyTarget {
  return {
    id: 'daily-target:2026-07-01',
    date: '2026-07-01',
    calculationWeightKg: 60,
    energy: {
      bmrKcal: 1500,
      occupationalBaseKcal: 300,
      walkingKcal: 100,
      runningKcal: 0,
      swimmingKcal: 0,
      strengthTrainingKcal: 0,
      otherActivitiesKcal: 0,
      totalEstimatedExpenditureKcal: 1900,
    },
    goalAdjustmentKcal: 0,
    acceptedCalibrationAdjustmentKcal: 0,
    calorieFloorKcal: 1500,
    targetCaloriesKcal: 1900,
    macros: {
      proteinGrams: 120,
      carbohydratesGrams: 220,
      fatGrams: 60,
    },
    calculationVersion: 1,
    createdAt,
    updatedAt,
  };
}

function status(updatedAt = '2026-07-01T09:15:00.000Z'): DailyJournalStatus {
  return {
    id: 'journal-status:2026-07-01',
    date: '2026-07-01',
    isComplete: true,
    completedAt: updatedAt,
    createdAt,
    updatedAt,
  };
}

function day(overrides: Partial<NutritionJournalDayAggregate> = {}): NutritionJournalDayAggregate {
  return {
    id: 'nutrition-journal:2026-07-01',
    date: '2026-07-01',
    meals: [meal()],
    entries: [entry()],
    target: target(),
    status: status(),
    updatedAt: '2026-07-01T09:15:00.000Z',
    ...overrides,
  };
}

describe('synchronisation C1 du journal nutritionnel', () => {
  let local: AppDatabase;
  let cloud: TestCloudDatabase;

  beforeEach(async () => {
    local = new AppDatabase(`sportpilot-c1-local-${crypto.randomUUID()}`);
    cloud = new TestCloudDatabase();
    await local.open();
    await cloud.open();
  });

  afterEach(async () => {
    local.close();
    cloud.close();
    await local.delete();
    await cloud.delete();
  });

  async function seedLocalDay() {
    await local.meals.add(meal());
    await local.foodEntries.add(entry());
    await local.dailyTargets.add(target());
    await local.dailyJournalStatuses.add(status());
  }

  it('envoie une journée complète une seule fois sans doublon', async () => {
    await seedLocalDay();

    const first = await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );
    const second = await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(first.uploadedDays).toBe(1);
    expect(second.uploadedDays).toBe(0);
    expect(second.differingEntityCount).toBe(0);
    expect(await cloud.realNutritionJournalDays.count()).toBe(1);
    expect(await cloud.realNutritionJournalDays.get('#nutrition-journal:2026-07-01')).toMatchObject({
      entries: [expect.objectContaining({ id: 'entry-1' })],
      target: expect.objectContaining({ targetCaloriesKcal: 1900 }),
      status: expect.objectContaining({ isComplete: true }),
    });
  });

  it('ignore les métadonnées techniques Dexie Cloud', async () => {
    await seedLocalDay();
    await cloud.realNutritionJournalDays.add({
      ...day({ id: '#nutrition-journal:2026-07-01' }),
      owner: 'user-1',
      realmId: 'user-1',
      $ts: 1_751_360_400_000,
      _hasBlobRefs: 1,
    });

    const preview = await previewRealNutritionJournalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview.differingEntityCount).toBe(0);
  });

  it('télécharge et applique une journée distante complète', async () => {
    await cloud.realNutritionJournalDays.add({
      ...day({ id: '#nutrition-journal:2026-07-01' }),
      owner: 'user-1',
    });

    const result = await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.downloadedDays).toBe(1);
    expect(await local.meals.get(meal().id)).toBeDefined();
    expect(await local.foodEntries.get(entry().id)).toBeDefined();
    expect(await local.dailyTargets.get(target().id)).toBeDefined();
    expect(await local.dailyJournalStatuses.get(status().id)).toBeDefined();
  });

  it('ignore strictement les journées appartenant à un autre compte', async () => {
    await cloud.realNutritionJournalDays.add({
      ...day({ id: '#nutrition-journal:2026-07-01' }),
      owner: 'user-2',
    });

    await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.meals.count()).toBe(0);
    expect(await local.foodEntries.count()).toBe(0);
    expect(await cloud.realNutritionJournalDays.count()).toBe(1);
  });

  it('propage la suppression d’une entrée sans supprimer son repas', async () => {
    await cloud.realNutritionJournalDays.add({
      ...day({ id: '#nutrition-journal:2026-07-01' }),
      owner: 'user-1',
    });
    await local.meals.add(meal());
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'foodEntry', entityId: entry().id },
        '2026-07-01T10:00:00.000Z',
      ),
    );

    const result = await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(result.removedCloudEntities).toBeGreaterThanOrEqual(1);
    const stored = await cloud.realNutritionJournalDays.get('#nutrition-journal:2026-07-01');
    expect(stored?.meals).toHaveLength(1);
    expect(stored?.entries).toHaveLength(0);
    expect(
      await cloud.realNutritionJournalDeletionRecords.get('#deletion:foodEntry:entry-1'),
    ).toMatchObject({ status: 'deleted' });
  });

  it('fait disparaître les entrées lorsqu’un repas supprimé est plus récent', async () => {
    await cloud.realNutritionJournalDays.add({
      ...day({ id: '#nutrition-journal:2026-07-01' }),
      owner: 'user-1',
    });
    await local.deletionRecords.add(
      createDeletedDeletionRecord(
        { entityType: 'meal', entityId: meal().id },
        '2026-07-01T10:00:00.000Z',
      ),
    );

    await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.meals.get(meal().id)).toBeUndefined();
    expect(await local.foodEntries.get(entry().id)).toBeUndefined();
    expect(await local.deletionRecords.get('deletion:foodEntry:entry-1')).toMatchObject({
      status: 'deleted',
    });
  });

  it('restaure un repas manquant lorsqu’une entrée plus récente existe', async () => {
    const newerEntry = entry('2026-07-01T11:00:00.000Z');
    await local.foodEntries.add(newerEntry);
    await cloud.realNutritionJournalDeletionRecords.add({
      ...createDeletedDeletionRecord(
        { entityType: 'meal', entityId: newerEntry.mealId },
        '2026-07-01T10:00:00.000Z',
      ),
      id: `#deletion:meal:${newerEntry.mealId}`,
      owner: 'user-1',
    });

    await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.meals.get(newerEntry.mealId)).toMatchObject({
      date: newerEntry.date,
      slot: newerEntry.mealSlot,
    });
    expect(await local.deletionRecords.get(`deletion:meal:${newerEntry.mealId}`)).toMatchObject({
      status: 'restored',
    });
  });

  it('refuse une journée distante contenant une entrée orpheline', async () => {
    await cloud.realNutritionJournalDays.add({
      ...day({
        id: '#nutrition-journal:2026-07-01',
        meals: [],
      }),
      owner: 'user-1',
    });

    await expect(
      synchronizeRealNutritionJournal(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        'user-1',
      ),
    ).rejects.toThrow('repas parent cohérent');
    expect(await local.foodEntries.count()).toBe(0);
  });

  it('fusionne les identifiants historiques par date avant toute écriture Dexie', async () => {
    await local.dailyTargets.add({
      ...target('2026-07-01T09:10:00.000Z'),
      id: 'legacy-target-2026-07-01',
    });
    await local.dailyJournalStatuses.add({
      ...status('2026-07-01T09:15:00.000Z'),
      id: 'daily-journal-status:2026-07-01',
    });
    await cloud.realNutritionJournalDays.add({
      ...day({
        id: '#nutrition-journal:2026-07-01',
        target: {
          ...target('2026-07-01T10:10:00.000Z'),
          targetCaloriesKcal: 2050,
        },
        status: {
          ...status('2026-07-01T10:15:00.000Z'),
          id: 'journal-status:2026-07-01',
        },
        updatedAt: '2026-07-01T10:15:00.000Z',
      }),
      owner: 'user-1',
    });

    await synchronizeRealNutritionJournal(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(await local.dailyTargets.toArray()).toEqual([
      expect.objectContaining({
        id: 'daily-target:2026-07-01',
        date: '2026-07-01',
        targetCaloriesKcal: 2050,
      }),
    ]);
    expect(await local.dailyJournalStatuses.toArray()).toEqual([
      expect.objectContaining({
        id: 'journal-status:2026-07-01',
        date: '2026-07-01',
      }),
    ]);
    expect(
      (await cloud.realNutritionJournalDays.get('#nutrition-journal:2026-07-01'))?.target,
    ).toMatchObject({ id: 'daily-target:2026-07-01' });
  });

  it('reste convergé après un recalcul identique du tableau de bord', async () => {
    const currentTarget = target();
    const currentStatus = status();
    await local.dailyTargets.add(currentTarget);
    await local.dailyJournalStatuses.add(currentStatus);
    await cloud.realNutritionJournalDays.add({
      ...day({
        id: '#nutrition-journal:2026-07-01',
        meals: [],
        entries: [],
        target: currentTarget,
        status: currentStatus,
        updatedAt: currentStatus.updatedAt,
      }),
      owner: 'user-1',
    });

    const repository = new DexieTargetRepository(local);
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...sameCalculation
    } = currentTarget;
    const persisted = await repository.upsertTarget(sameCalculation);

    expect(persisted.updatedAt).toBe(currentTarget.updatedAt);
    await expect(
      previewRealNutritionJournalSync(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        'user-1',
      ),
    ).resolves.toMatchObject({ differingEntityCount: 0 });
  });

  it('analyse les écarts sans écrire dans le cloud', async () => {
    await seedLocalDay();

    const preview = await previewRealNutritionJournalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      'user-1',
    );

    expect(preview).toMatchObject({
      localDayCount: 1,
      cloudDayCount: 0,
      localEntryCount: 1,
      differingEntityCount: 1,
    });
    expect(await cloud.realNutritionJournalDays.count()).toBe(0);
  });
});
