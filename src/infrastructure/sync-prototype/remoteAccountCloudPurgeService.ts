import type { Table } from 'dexie';

import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { belongsToCurrentUser } from '@/infrastructure/sync-prototype/cloudSyncValue';

type CloudRecord = Record<string, unknown> & {
  readonly id: string;
  readonly owner?: string;
};

export interface RemoteAccountCloudPurgeResult {
  readonly deletedCloudRecords: number;
  readonly deletedByTable: Readonly<Record<string, number>>;
}

const CLOUD_TABLE_NAMES = [
  'weights',
  'deletionRecords',
  'realWeights',
  'realWeightDeletionRecords',
  'realActivities',
  'realActivityDeletionRecords',
  'realGoals',
  'realGoalDeletionRecords',
  'realStrengthExercises',
  'realWorkoutTemplates',
  'realWorkoutSessions',
  'realStrengthDeletionRecords',
  'realNutritionJournalDays',
  'realNutritionJournalDeletionRecords',
  'realNutritionProducts',
  'realNutritionRecipes',
  'realFavoriteMeals',
  'realNutritionLibraryDeletionRecords',
  'realNutritionTracking',
  'realAccountPreferences',
  'realRewardsRoutines',
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
] as const;

function isAccountRecord(
  tableName: (typeof CLOUD_TABLE_NAMES)[number],
  row: CloudRecord,
  userId: string,
): boolean {
  if (row.owner === userId) return true;
  switch (tableName) {
    case 'socialIdentities':
      return row.userId === userId;
    case 'socialHandleReservations':
      return row.ownerUserId === userId;
    case 'socialFriendRequests':
      return row.requesterUserId === userId || row.recipientUserId === userId;
    case 'socialFriendships':
      return row.userAId === userId || row.userBId === userId;
    case 'socialFriendPermissions':
      return row.ownerUserId === userId || row.friendUserId === userId;
    case 'socialActivitySnapshots':
      return row.ownerUserId === userId || row.publishedForUserId === userId;
    default:
      return belongsToCurrentUser(row, userId);
  }
}

function accountRows(
  tableName: (typeof CLOUD_TABLE_NAMES)[number],
  rows: readonly CloudRecord[],
  userId: string,
): CloudRecord[] {
  return rows.filter((row) => isAccountRecord(tableName, row, userId));
}

export async function purgeCurrentAccountCloudData(
  database: SyncPrototypeDatabase,
  userId: string,
): Promise<RemoteAccountCloudPurgeResult> {
  const tables = CLOUD_TABLE_NAMES.map((name) =>
    database.table<CloudRecord, string>(name));
  const baselineTable = database.table('realSyncBaselines');
  const deletedByTable: Record<string, number> = {};

  await database.transaction('rw', [...tables, baselineTable], async () => {
    for (const [index, tableName] of CLOUD_TABLE_NAMES.entries()) {
      const table = tables[index] as Table<CloudRecord, string>;
      const rows = accountRows(tableName, await table.toArray(), userId);
      if (rows.length > 0) {
        await table.bulkDelete(rows.map((row) => row.id));
      }
      deletedByTable[tableName] = rows.length;
    }
    await baselineTable.clear();
  });

  await database.cloud.sync();

  for (const [index, tableName] of CLOUD_TABLE_NAMES.entries()) {
    const table = tables[index] as Table<CloudRecord, string>;
    if (accountRows(tableName, await table.toArray(), userId).length > 0) {
      throw new Error(
        `La suppression cloud n’a pas été confirmée pour la table ${tableName}.`,
      );
    }
  }

  return {
    deletedCloudRecords: Object.values(deletedByTable)
      .reduce((total, count) => total + count, 0),
    deletedByTable,
  };
}
