import type { Activity } from '@/domain/models/activity';
import type { TrashItem } from '@/domain/models/trash';
import type { WeightEntry } from '@/domain/models/weight';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  deleteTrashItemPermanently,
  listTrashItems,
  moveActivityToTrash,
  moveWeightToTrash,
  purgeExpiredTrashItems,
  restoreTrashItem,
} from '@/infrastructure/repositories/dexie/trashService';

describe('trashService', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(
      `sportpilot-trash-test-${crypto.randomUUID()}`,
    );
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('déplace puis restaure une activité sans modifier son contenu', async () => {
    const activity = {
      id: 'activity-1',
      type: 'running',
      date: '2026-06-28',
      time: '08:00',
      durationMinutes: 45,
      distanceKm: 8,
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T08:00:00.000Z',
    } as Activity;

    await database.activities.add(activity);

    const trashed = await moveActivityToTrash(
      database,
      activity.id,
      new Date('2026-06-28T10:00:00.000Z'),
    );

    expect(trashed?.entityType).toBe('activity');
    expect(await database.activities.count()).toBe(0);
    expect(await database.trashItems.count()).toBe(1);

    await restoreTrashItem(database, trashed!.id);

    expect(await database.activities.get(activity.id)).toEqual(activity);
    expect(await database.trashItems.count()).toBe(0);
  });

  it('déplace une pesée et refuse une restauration qui écraserait la même date', async () => {
    const deletedWeight = {
      id: 'weight-1',
      date: '2026-06-28',
      weightKg: 60.2,
      createdAt: '2026-06-28T07:00:00.000Z',
      updatedAt: '2026-06-28T07:00:00.000Z',
    } as WeightEntry;

    await database.weights.add(deletedWeight);
    const trashed = await moveWeightToTrash(
      database,
      deletedWeight.date,
    );

    await database.weights.add({
      ...deletedWeight,
      id: 'weight-replacement',
      weightKg: 60.4,
    });

    await expect(
      restoreTrashItem(database, trashed!.id),
    ).rejects.toThrow('Une pesée existe déjà pour cette date');

    expect(await database.trashItems.count()).toBe(1);
  });

  it('supprime définitivement un élément sans restaurer sa donnée', async () => {
    const activity = {
      id: 'activity-permanent',
      type: 'cycling',
      date: '2026-06-28',
      durationMinutes: 60,
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T08:00:00.000Z',
    } as Activity;

    await database.activities.add(activity);
    const trashed = await moveActivityToTrash(database, activity.id);

    await deleteTrashItemPermanently(database, trashed!.id);

    expect(await database.activities.get(activity.id)).toBeUndefined();
    expect(await database.trashItems.count()).toBe(0);
  });

  it('purge uniquement les éléments arrivés à expiration', async () => {
    const expiredItem = {
      id: 'activity:expired',
      entityType: 'activity',
      entityId: 'expired',
      label: 'Activité expirée',
      deletedAt: '2026-05-01T00:00:00.000Z',
      purgeAt: '2026-05-31T00:00:00.000Z',
      payload: {
        id: 'expired',
        type: 'running',
        date: '2026-05-01',
      },
    } as TrashItem;
    const retainedItem = {
      ...expiredItem,
      id: 'activity:retained',
      entityId: 'retained',
      label: 'Activité conservée',
      purgeAt: '2026-07-31T00:00:00.000Z',
      payload: {
        ...expiredItem.payload,
        id: 'retained',
      },
    } as TrashItem;

    await database.trashItems.bulkAdd([
      expiredItem,
      retainedItem,
    ]);

    await expect(
      purgeExpiredTrashItems(
        database,
        new Date('2026-06-28T00:00:00.000Z'),
      ),
    ).resolves.toBe(1);

    await expect(listTrashItems(database)).resolves.toEqual([
      retainedItem,
    ]);
  });
});
