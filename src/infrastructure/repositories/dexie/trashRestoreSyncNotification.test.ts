import Dexie from 'dexie';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import type { Activity } from '@/domain/models/activity';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { restoreTrashItemWithSyncNotification } from '@/infrastructure/repositories/dexie/trashRestoreSyncNotification';
import { moveActivityToTrash } from '@/infrastructure/repositories/dexie/trashService';

function activity(): Activity {
  return {
    id: 'activity-restore-event',
    type: 'running',
    date: '2026-08-18',
    sessionType: 'easy',
    durationMinutes: 30,
    intensity: 'moderate',
    distanceKm: 5,
    averageCadenceSpm: 165,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 350,
      calculationVersion: 1,
    },
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  };
}

describe('trashRestoreSyncNotification', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(`trash-restore-sync-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it('publie activities uniquement après la restauration durable réussie', async () => {
    await database.activities.put(activity());
    const trashItem = await moveActivityToTrash(
      database,
      'activity-restore-event',
      new Date('2026-08-18T11:00:00.000Z'),
    );
    expect(trashItem).toBeDefined();
    const details: unknown[] = [];
    const listener = (event: Event) => {
      details.push(syncLocalDataChangedDetail(event));
    };
    window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);

    await restoreTrashItemWithSyncNotification(
      database,
      trashItem!.id,
      new Date('2026-08-18T12:00:00.000Z'),
    );

    window.removeEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
    expect(await database.activities.get('activity-restore-event')).toBeDefined();
    expect(details).toEqual([{
      domainIds: ['activities'],
      reason: 'activity-trash-restore',
    }]);
  });

  it('ne publie rien si la restauration échoue', async () => {
    const listener = vi.fn();
    window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);

    await expect(restoreTrashItemWithSyncNotification(
      database,
      'activity:missing',
    )).rejects.toThrow();

    window.removeEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
    expect(listener).not.toHaveBeenCalled();
  });
});
