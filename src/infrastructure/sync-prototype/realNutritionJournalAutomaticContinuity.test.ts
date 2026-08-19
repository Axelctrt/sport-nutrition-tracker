import Dexie, { type Table } from 'dexie';

import { AutomaticSyncController } from '@/application/sync/automaticSyncController';
import type { DeletionRecord } from '@/domain/models/deletion';
import type { FoodEntry } from '@/domain/models/food';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFoodRepository } from '@/infrastructure/repositories/dexie/DexieFoodRepository';
import { DexieSettingsRepository } from '@/infrastructure/repositories/dexie/DexieSettingsRepository';
import { restoreTrashItemWithSyncNotification } from '@/infrastructure/repositories/dexie/trashRestoreSyncNotification';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  previewRealNutritionJournalSync,
  synchronizeRealNutritionJournal,
  type NutritionJournalDayAggregate,
} from '@/infrastructure/sync-prototype/realNutritionJournalSyncService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const USER_ID = 'nutrition-journal-a-to-b-user';
const FINGERPRINT = createSyncPrototypeAccountFingerprint(USER_ID)!;
const DATE = '2026-08-19';

type CloudDay = NutritionJournalDayAggregate & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
  syncRevision?: number;
  syncActorId?: string;
};

type CloudMarker = DeletionRecord & {
  owner?: string;
  realmId?: string;
  $ts?: number;
  _hasBlobRefs?: 1;
  syncRevision?: number;
  syncActorId?: string;
};

class TestCloudDatabase extends Dexie {
  declare realNutritionJournalDays: Table<CloudDay, string>;
  declare realNutritionJournalDeletionRecords: Table<CloudMarker, string>;

  constructor(label: string) {
    super(`sportpilot-nutrition-journal-a-b-${label}-${crypto.randomUUID()}`);
    this.version(1).stores({
      realNutritionJournalDays: 'id, date, updatedAt',
      realNutritionJournalDeletionRecords:
        'id, entityType, entityId, status, updatedAt',
    });
  }
}

function createDeviceClient(
  local: AppDatabase,
  cloud: TestCloudDatabase,
): SyncPrototypeClient {
  let snapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: USER_ID },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realNutritionJournal: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics(USER_ID),
  } as SyncPrototypeSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const analyzeRealNutritionJournal = vi.fn(async () => {
    const preview = await previewRealNutritionJournalSync(
      local,
      cloud as unknown as SyncPrototypeDatabase,
      USER_ID,
    );
    snapshot = {
      ...snapshot,
      realNutritionJournal: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealNutritionJournal,
    syncRealNutritionJournal: vi.fn(async () =>
      synchronizeRealNutritionJournal(
        local,
        cloud as unknown as SyncPrototypeDatabase,
        USER_ID,
      )),
  } as unknown as SyncPrototypeClient;
}

async function replicateCloud(
  source: TestCloudDatabase,
  target: TestCloudDatabase,
): Promise<void> {
  const [days, markers] = await Promise.all([
    source.realNutritionJournalDays.toArray(),
    source.realNutritionJournalDeletionRecords.toArray(),
  ]);
  await Promise.all([
    target.realNutritionJournalDays.clear(),
    target.realNutritionJournalDeletionRecords.clear(),
  ]);
  if (days.length > 0) await target.realNutritionJournalDays.bulkPut(days);
  if (markers.length > 0) {
    await target.realNutritionJournalDeletionRecords.bulkPut(markers);
  }
}

function entryInput(mealId: string): Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    date: DATE,
    mealId,
    mealSlot: 'lunch',
    sourceType: 'product',
    reference: {
      sourceType: 'product',
      productId: 'journal-product-snapshot',
      inputMode: 'amount',
      inputQuantity: 137,
      normalizedAmount: 137,
      normalizedUnit: 'g',
      nutritionPer100Snapshot: {
        caloriesKcal: 237,
        proteinGrams: 17.3,
        carbohydratesGrams: 21.4,
        fatGrams: 8.6,
      },
    },
  };
}

describe('gate A→B Nutrition Journal automatique', () => {
  let localA: AppDatabase;
  let localB: AppDatabase;
  let cloudA: TestCloudDatabase;
  let cloudB: TestCloudDatabase;

  beforeEach(async () => {
    localA = new AppDatabase(`nutrition-journal-a-${crypto.randomUUID()}`);
    localB = new AppDatabase(`nutrition-journal-b-${crypto.randomUUID()}`);
    cloudA = new TestCloudDatabase('a');
    cloudB = new TestCloudDatabase('b');
    await Promise.all([localA.open(), localB.open(), cloudA.open(), cloudB.open()]);
  });

  afterEach(async () => {
    const names = [localA.name, localB.name, cloudA.name, cloudB.name];
    localA.close();
    localB.close();
    cloudA.close();
    cloudB.close();
    await Promise.all(names.map((name) => Dexie.delete(name)));
  });

  it('propage ajout, suppression, restauration puis restaure B frais sans recalculer le snapshot', async () => {
    const settingsA = new DexieSettingsRepository(localA);
    await settingsA.update({
      automaticAccountSyncEnabled: true,
      automaticAccountSyncConnectionMode: 'any-connection',
      automaticAccountSyncAccountFingerprint: FINGERPRINT,
    });

    const foodA = new DexieFoodRepository(localA);
    const meal = await foodA.getOrCreateMeal(DATE, 'lunch', 'Gate Journal');

    const clientA = createDeviceClient(localA, cloudA);
    const controllerA = new AutomaticSyncController({
      client: clientA,
      settingsRepository: settingsA,
      eventTarget: window,
      lifecycleDebounceMs: 0,
      localChangeDebounceMs: 0,
    });
    await controllerA.initialize();

    await vi.waitFor(async () => {
      expect(await cloudA.realNutritionJournalDays.get(`#nutrition-journal:${DATE}`))
        .toMatchObject({ meals: [expect.objectContaining({ id: meal.id })] });
    });

    const created = await foodA.createEntry(entryInput(meal.id));
    const originalSnapshot = structuredClone(created.reference);

    await vi.waitFor(async () => {
      const cloudDay = await cloudA.realNutritionJournalDays.get(
        `#nutrition-journal:${DATE}`,
      );
      expect(cloudDay?.entries).toEqual([
        expect.objectContaining({
          id: created.id,
          reference: originalSnapshot,
        }),
      ]);
    });

    await foodA.deleteEntry(created.id);
    await vi.waitFor(async () => {
      const cloudDay = await cloudA.realNutritionJournalDays.get(
        `#nutrition-journal:${DATE}`,
      );
      expect(cloudDay?.entries).toEqual([]);
      expect(
        (await cloudA.realNutritionJournalDeletionRecords.toArray())
          .some((marker) =>
            marker.entityType === 'foodEntry'
            && marker.entityId === created.id
            && marker.status === 'deleted'),
      ).toBe(true);
    });

    const trashItem = await localA.trashItems
      .where('entityId')
      .equals(created.id)
      .first();
    expect(trashItem).toBeDefined();

    await restoreTrashItemWithSyncNotification(localA, trashItem!.id);
    await vi.waitFor(async () => {
      const cloudDay = await cloudA.realNutritionJournalDays.get(
        `#nutrition-journal:${DATE}`,
      );
      expect(cloudDay?.entries).toEqual([
        expect.objectContaining({
          id: created.id,
          reference: originalSnapshot,
        }),
      ]);
      expect(
        (await cloudA.realNutritionJournalDeletionRecords.toArray())
          .some((marker) =>
            marker.entityType === 'foodEntry'
            && marker.entityId === created.id
            && marker.status === 'restored'),
      ).toBe(true);
    });

    await replicateCloud(cloudA, cloudB);
    const cloudBeforeRestore = {
      days: await cloudB.realNutritionJournalDays.toArray(),
      markers: await cloudB.realNutritionJournalDeletionRecords.toArray(),
    };

    const restored = await synchronizeRealNutritionJournal(
      localB,
      cloudB as unknown as SyncPrototypeDatabase,
      USER_ID,
      { writeCloud: false },
    );

    expect(restored.downloadedDays).toBe(1);
    expect(await localB.meals.get(meal.id)).toMatchObject({ title: 'Gate Journal' });
    expect(await localB.foodEntries.get(created.id)).toMatchObject({
      reference: originalSnapshot,
    });
    expect(await localB.deletionRecords.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'foodEntry',
          entityId: created.id,
          status: 'restored',
        }),
      ]),
    );
    expect(await cloudB.realNutritionJournalDays.toArray())
      .toEqual(cloudBeforeRestore.days);
    expect(await cloudB.realNutritionJournalDeletionRecords.toArray())
      .toEqual(cloudBeforeRestore.markers);

    controllerA.dispose();
  });
});
