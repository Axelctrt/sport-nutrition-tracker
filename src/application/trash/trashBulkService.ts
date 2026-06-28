import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { restoreTrashItem } from '@/infrastructure/repositories/dexie/trashService';

export interface TrashRestoreFailure {
  id: string;
  message: string;
}

export interface TrashBulkRestoreResult {
  restoredIds: string[];
  failures: TrashRestoreFailure[];
}

export type TrashItemRestorer = (
  database: AppDatabase,
  trashItemId: string,
) => Promise<unknown>;

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export async function restoreTrashItems(
  database: AppDatabase,
  ids: readonly string[],
  restore: TrashItemRestorer = restoreTrashItem,
): Promise<TrashBulkRestoreResult> {
  const restoredIds: string[] = [];
  const failures: TrashRestoreFailure[] = [];

  for (const id of uniqueIds(ids)) {
    try {
      await restore(database, id);
      restoredIds.push(id);
    } catch (error) {
      failures.push({
        id,
        message:
          error instanceof Error
            ? error.message
            : 'La restauration a échoué.',
      });
    }
  }

  return {
    restoredIds,
    failures,
  };
}

export async function deleteTrashItemsPermanently(
  database: AppDatabase,
  ids: readonly string[],
): Promise<number> {
  const unique = uniqueIds(ids);

  if (unique.length === 0) return 0;

  await database.transaction(
    'rw',
    database.trashItems,
    async () => {
      await database.trashItems.bulkDelete(unique);
    },
  );

  return unique.length;
}

export async function emptyTrash(
  database: AppDatabase,
): Promise<number> {
  return database.transaction(
    'rw',
    database.trashItems,
    async () => {
      const count = await database.trashItems.count();
      await database.trashItems.clear();
      return count;
    },
  );
}
