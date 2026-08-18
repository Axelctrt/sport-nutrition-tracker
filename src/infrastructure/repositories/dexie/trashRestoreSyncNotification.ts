import { notifySyncLocalDataChanged } from '@/application/sync/syncLocalChangeEvents';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  restoreTrashItem,
} from '@/infrastructure/repositories/dexie/trashService';

export async function restoreTrashItemWithSyncNotification(
  database: AppDatabase,
  trashItemId: string,
  now: Date = new Date(),
): Promise<Awaited<ReturnType<typeof restoreTrashItem>>> {
  const restored = await restoreTrashItem(database, trashItemId, now);
  if (restored.entityType === 'activity') {
    notifySyncLocalDataChanged(['activities'], 'activity-trash-restore');
  }
  return restored;
}
