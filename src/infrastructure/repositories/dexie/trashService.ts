import type { EntityId, LocalDate } from '@/domain/models/common';
import {
  TRASH_RETENTION_DAYS,
  type TrashEntityType,
  type TrashItem,
} from '@/domain/models/trash';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

function createTrashId(
  entityType: TrashEntityType,
  entityId: EntityId,
): string {
  return `${entityType}:${entityId}`;
}

function createPurgeDate(now: Date): string {
  return new Date(
    now.getTime() + TRASH_RETENTION_DAYS * MILLISECONDS_PER_DAY,
  ).toISOString();
}

async function purgeExpiredInsideTransaction(
  database: AppDatabase,
  now: Date,
): Promise<number> {
  return database.trashItems
    .where('purgeAt')
    .belowOrEqual(now.toISOString())
    .delete();
}

export async function moveActivityToTrash(
  database: AppDatabase,
  activityId: EntityId,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  return database.transaction(
    'rw',
    database.activities,
    database.trashItems,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const activity = await database.activities.get(activityId);
      if (!activity) return undefined;

      const trashItem: TrashItem = {
        id: createTrashId('activity', activity.id),
        entityType: 'activity',
        entityId: activity.id,
        label: `Activité ${activity.type} du ${activity.date}`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: activity,
      };

      await database.trashItems.put(trashItem);
      await database.activities.delete(activity.id);

      return trashItem;
    },
  );
}

export async function moveWeightToTrash(
  database: AppDatabase,
  date: LocalDate,
  now: Date = new Date(),
): Promise<TrashItem | undefined> {
  return database.transaction(
    'rw',
    database.weights,
    database.trashItems,
    async () => {
      await purgeExpiredInsideTransaction(database, now);

      const weight = await database.weights
        .where('date')
        .equals(date)
        .first();
      if (!weight) return undefined;

      const trashItem: TrashItem = {
        id: createTrashId('weight', weight.id),
        entityType: 'weight',
        entityId: weight.id,
        label: `Pesée du ${weight.date}`,
        deletedAt: now.toISOString(),
        purgeAt: createPurgeDate(now),
        payload: weight,
      };

      await database.trashItems.put(trashItem);
      await database.weights.delete(weight.id);

      return trashItem;
    },
  );
}

export async function listTrashItems(
  database: AppDatabase,
): Promise<TrashItem[]> {
  return database.trashItems
    .orderBy('deletedAt')
    .reverse()
    .toArray();
}

export async function restoreTrashItem(
  database: AppDatabase,
  trashItemId: string,
): Promise<TrashItem> {
  return database.transaction(
    'rw',
    database.trashItems,
    database.activities,
    database.weights,
    async () => {
      const trashItem = await database.trashItems.get(trashItemId);
      if (!trashItem) {
        throw new Error(
          'Cet élément n’existe plus dans la corbeille.',
        );
      }

      if (trashItem.entityType === 'activity') {
        const existingActivity = await database.activities.get(
          trashItem.entityId,
        );
        if (existingActivity) {
          throw new Error(
            'Une activité avec le même identifiant existe déjà.',
          );
        }

        await database.activities.add(trashItem.payload);
      } else {
        const existingWeight = await database.weights
          .where('date')
          .equals(trashItem.payload.date)
          .first();

        if (existingWeight) {
          throw new Error(
            'Une pesée existe déjà pour cette date. Supprime-la ou modifie-la avant de restaurer celle-ci.',
          );
        }

        await database.weights.add(trashItem.payload);
      }

      await database.trashItems.delete(trashItem.id);
      return trashItem;
    },
  );
}

export async function deleteTrashItemPermanently(
  database: AppDatabase,
  trashItemId: string,
): Promise<void> {
  await database.trashItems.delete(trashItemId);
}

export async function purgeExpiredTrashItems(
  database: AppDatabase,
  now: Date = new Date(),
): Promise<number> {
  return database.transaction(
    'rw',
    database.trashItems,
    () => purgeExpiredInsideTransaction(database, now),
  );
}
