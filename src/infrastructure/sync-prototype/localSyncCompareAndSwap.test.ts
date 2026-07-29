import Dexie, { type Table } from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  deleteLocalIfUnchanged,
  putLocalIfUnchanged,
} from '@/infrastructure/sync-prototype/localSyncCompareAndSwap';

interface TestRecord {
  readonly id: string;
  readonly value: string;
  readonly updatedAt: string;
}

class CompareAndSwapDatabase extends Dexie {
  declare records: Table<TestRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: 'id, updatedAt' });
  }
}

describe('local sync compare-and-swap', () => {
  let database: CompareAndSwapDatabase;

  beforeEach(async () => {
    database = new CompareAndSwapDatabase(
      `sportpilot-sync-cas-${crypto.randomUUID()}`,
    );
    await database.open();
  });

  afterEach(async () => {
    const name = database.name;
    database.close();
    await Dexie.delete(name);
  });

  it('préserve une modification locale arrivée après la lecture de synchronisation', async () => {
    const initial: TestRecord = {
      id: 'record-1',
      value: 'initial',
      updatedAt: '2026-07-19T10:00:00.000Z',
    };
    await database.records.put(initial);
    const snapshot = await database.records.get(initial.id);
    const userUpdate: TestRecord = {
      ...initial,
      value: 'user-update',
      updatedAt: '2026-07-19T10:01:00.000Z',
    };
    await database.records.put(userUpdate);

    const applied = await putLocalIfUnchanged(
      database,
      database.records,
      initial.id,
      snapshot,
      {
        ...initial,
        value: 'cloud-update',
        updatedAt: '2026-07-19T10:02:00.000Z',
      },
    );

    expect(applied).toBe(false);
    await expect(database.records.get(initial.id)).resolves.toEqual(userUpdate);
  });

  it('refuse aussi une suppression calculée depuis un instantané périmé', async () => {
    const initial: TestRecord = {
      id: 'record-1',
      value: 'initial',
      updatedAt: '2026-07-19T10:00:00.000Z',
    };
    await database.records.put(initial);
    const snapshot = await database.records.get(initial.id);
    const userUpdate = {
      ...initial,
      value: 'keep-me',
      updatedAt: '2026-07-19T10:01:00.000Z',
    };
    await database.records.put(userUpdate);

    const applied = await deleteLocalIfUnchanged(
      database,
      database.records,
      initial.id,
      snapshot,
    );

    expect(applied).toBe(false);
    await expect(database.records.get(initial.id)).resolves.toEqual(userUpdate);
  });

  it('applique la résolution lorsque la valeur locale est restée identique', async () => {
    const initial: TestRecord = {
      id: 'record-1',
      value: 'initial',
      updatedAt: '2026-07-19T10:00:00.000Z',
    };
    const target: TestRecord = {
      ...initial,
      value: 'cloud-update',
      updatedAt: '2026-07-19T10:02:00.000Z',
    };
    await database.records.put(initial);

    const applied = await putLocalIfUnchanged(
      database,
      database.records,
      initial.id,
      initial,
      target,
    );

    expect(applied).toBe(true);
    await expect(database.records.get(initial.id)).resolves.toEqual(target);
  });
});
