import { afterEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';

import {
  SYNC_PROTOTYPE_TABLE_NAMES,
  type SyncPrototypeDatabase,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { purgeCurrentAccountCloudData } from '@/infrastructure/sync-prototype/remoteAccountCloudPurgeService';

class TestCloudDatabase extends Dexie {
  readonly syncCloud = vi.fn(async () => undefined);

  constructor() {
    super(`remote-account-purge-${crypto.randomUUID()}`);
    Object.defineProperty(this, 'cloud', {
      configurable: true,
      value: { sync: this.syncCloud },
    });
    this.version(1).stores(Object.fromEntries(
      SYNC_PROTOTYPE_TABLE_NAMES.map((name) => [name, 'id']),
    ));
  }
}

const databases: TestCloudDatabase[] = [];

afterEach(async () => {
  for (const database of databases.splice(0)) {
    await database.delete();
  }
});

describe('remote account cloud purge', () => {
  it('deletes personal rows and social relations involving the account, then verifies sync', async () => {
    const database = new TestCloudDatabase();
    databases.push(database);
    await database.open();

    await database.table('realWeights').put({
      id: '#weight-1',
      date: '2026-07-01',
      weightKg: 70,
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
      owner: 'account-user',
    } as never);
    await database.table('socialFriendships').bulkPut([
      {
        id: 'friendship-current',
        userAId: 'account-user',
        userBId: 'friend-user',
        status: 'active',
        createdAt: '2026-07-01T08:00:00.000Z',
        updatedAt: '2026-07-01T08:00:00.000Z',
      },
      {
        id: 'friendship-other',
        userAId: 'other-a',
        userBId: 'other-b',
        status: 'active',
        createdAt: '2026-07-01T08:00:00.000Z',
        updatedAt: '2026-07-01T08:00:00.000Z',
      },
    ] as never);

    const result = await purgeCurrentAccountCloudData(
      database as unknown as SyncPrototypeDatabase,
      'account-user',
    );

    expect(result.deletedCloudRecords).toBe(2);
    expect(await database.table('realWeights').count()).toBe(0);
    expect(await database.table('socialFriendships').toArray()).toEqual([
      expect.objectContaining({ id: 'friendship-other' }),
    ]);
    expect(database.syncCloud).toHaveBeenCalledOnce();
  });
});
