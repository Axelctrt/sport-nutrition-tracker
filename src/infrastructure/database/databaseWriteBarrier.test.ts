import type Dexie from 'dexie';

import {
  getPendingDatabaseWriteCount,
  trackDatabaseWrite,
  waitForDatabaseIdle,
  waitForPendingDatabaseWrites,
} from '@/infrastructure/database/databaseWriteBarrier';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((currentResolve) => {
    resolve = currentResolve;
  });

  return { promise, resolve };
}

describe('databaseWriteBarrier', () => {
  it('attend la fin des écritures suivies', async () => {
    const gate = deferred();
    const write = trackDatabaseWrite(async () => {
      await gate.promise;
    });

    await Promise.resolve();
    expect(getPendingDatabaseWriteCount()).toBe(1);

    let idleReached = false;
    const idle = waitForPendingDatabaseWrites().then(() => {
      idleReached = true;
    });

    await Promise.resolve();
    expect(idleReached).toBe(false);

    gate.resolve();
    await write;
    await idle;

    expect(getPendingDatabaseWriteCount()).toBe(0);
    expect(idleReached).toBe(true);
  });

  it('attend aussi la transaction Dexie exclusive de contrôle', async () => {
    const gate = deferred();
    const transaction = vi.fn(async (_mode, _tables, scope: () => Promise<void>) => {
      await gate.promise;
      return scope();
    });
    const database = {
      isOpen: () => true,
      open: vi.fn(async () => undefined),
      tables: [],
      transaction,
    } as unknown as Dexie;

    let idleReached = false;
    const idle = waitForDatabaseIdle(database).then(() => {
      idleReached = true;
    });

    await Promise.resolve();
    expect(idleReached).toBe(false);
    expect(transaction).toHaveBeenCalledTimes(1);

    gate.resolve();
    await idle;

    expect(idleReached).toBe(true);
    expect(transaction).toHaveBeenCalledWith('rw!', [], expect.any(Function));
  });
});
